/**
 * Cloudflare Workers用 Hono サーバー
 * クライアントからJPEG画像を受け取り、OpenRouter APIで分析
 * フォローアップモードで片付け前後の比較が可能
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_REFERRER?: string;
  OPENROUTER_TITLE?: string;
};

type ParsedJson<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', logger());
app.use('*', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'] }));

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseJsonSafe = <T,>(text: string): ParsedJson<T> => {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch (error) {
    return { ok: false, error };
  }
};

const extractJsonObject = (text: string) => {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
};

const parseJsonWithRecovery = <T,>(text: string): ParsedJson<T> => {
  const direct = parseJsonSafe<T>(text);
  if (direct.ok) return direct;
  const extracted = extractJsonObject(text);
  if (!extracted) return direct;
  return parseJsonSafe<T>(extracted);
};

// === 型定義 ===

interface CoachingResult {
  instruction: string;
}

interface InitialResponse {
  cards: CoachingResult[];
}

interface FollowupResponse {
  completed: CoachingResult[];
  remaining: CoachingResult[];
  newTasks: CoachingResult[];
  feedback: string;
}

// === プロンプト ===

const INITIAL_SYSTEM_PROMPT = [
  'あなたは「片付けを考えさせないAIコーチ」です。',
  '',
  'これからユーザーの部屋の写真が1枚渡されます。',
  '',
  'あなたの役割は、写真を見て',
  '「今すぐ実行できる、短いアクション」を複数決め、',
  'それぞれの対象が一番分かりやすい場所を写真から切り出して示すことです。',
  '',
  'やることは2つだけです。',
  '1. 写真の中から、今すぐ手を付けるべき具体的な場所を複数選ぶ',
  '2. それぞれの場所に対する、1〜2分で終わる行動を1文で指示する',
  '',
  '制約条件（重要）：',
  '- 指示は1カードにつき必ず1つだけ',
  '- 行動は具体的（場所・物が分かる）',
  '- 命令口調にしない',
  '- 理由や説明は書かない',
  '- 箇条書きは禁止',
  '- 句点（。）は使わない',
  '- 丁寧すぎない、生活者向けの自然な日本語',
  '',
  '出力形式（JSONのみ）：',
  '{',
  '  "cards": [',
  '    { "instruction": "" }',
  '  ]',
  '}',
  'カードは可能な限り多く返すが、同じ対象の重複は避ける',
].join('\n');

const FOLLOWUP_SYSTEM_PROMPT = [
  'あなたは「片付けを考えさせないAIコーチ」です。',
  '',
  'ユーザーが片付けを行いました。',
  '「片付け前」と「片付け後」の2枚の写真と、最初に出した指示リストが渡されます。',
  '',
  'あなたの役割：',
  '1. 完了したタスクを特定して褒める',
  '2. まだ残っているタスクを指摘',
  '3. 新たに気づいたタスクがあれば追加',
  '4. 励ましのフィードバックを一言',
  '',
  '制約条件（重要）：',
  '- 指示は1カードにつき必ず1つだけ',
  '- 行動は具体的（場所・物が分かる）',
  '- 命令口調にしない',
  '- 理由や説明は書かない',
  '- 句点（。）は使わない',
  '- 丁寧すぎない、生活者向けの自然な日本語',
  '- feedbackは短く（20文字以内）、ポジティブに',
  '',
  '出力形式（JSONのみ）：',
  '{',
  '  "completed": [{ "instruction": "完了したタスク" }],',
  '  "remaining": [{ "instruction": "まだ残っているタスク" }],',
  '  "newTasks": [{ "instruction": "新たに見つかったタスク" }],',
  '  "feedback": "励ましの一言"',
  '}',
].join('\n');

// === メッセージビルダー ===

const buildInitialMessages = (input: { base64Image: string; locale?: string }) => {
  const localeHint = input.locale ? `Locale: ${input.locale}` : 'Locale: unspecified';
  return [
    {
      role: 'system',
      content: INITIAL_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this room photo and output the JSON schema only. ${localeHint}.`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${input.base64Image}`,
          },
        },
      ],
    },
  ];
};

const buildFollowupMessages = (input: {
  previousImage: string;
  currentImage: string;
  previousCards: CoachingResult[];
  locale?: string;
}) => {
  const localeHint = input.locale ? `Locale: ${input.locale}` : 'Locale: unspecified';
  const previousTasksList = input.previousCards
    .map((c, i) => `${i + 1}. ${c.instruction}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: FOLLOWUP_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Compare these two photos and evaluate the cleaning progress. ${localeHint}

Previous tasks given:
${previousTasksList}

First image: BEFORE cleaning
Second image: AFTER cleaning

Output JSON only.`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${input.previousImage}`,
          },
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${input.currentImage}`,
          },
        },
      ],
    },
  ];
};

// === OpenRouter API呼び出し ===

const callOpenRouter = async (
  env: Bindings,
  messages: Array<{ role: string; content: unknown }>,
  requestId: string
) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error(`[${requestId}] API key not set`);
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  console.log(`[${requestId}] Using model: ${model}`);

  const payload = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 1500,
  };

  console.log(`[${requestId}] Sending request to OpenRouter...`);
  const startTime = Date.now();

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_REFERRER ?? 'https://cleaning-cards.workers.dev',
      'X-Title': env.OPENROUTER_TITLE ?? 'cleaning-cards',
    },
    body: JSON.stringify(payload),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[${requestId}] Response status: ${response.status} (${elapsed}ms)`);

  if (!response.ok) {
    const text = await response.text();
    console.error(`[${requestId}] Error response: ${text}`);
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    console.error(`[${requestId}] Response missing content:`, JSON.stringify(data));
    throw new Error('OpenRouter response missing content');
  }

  console.log(`[${requestId}] Response length: ${content.length}`);
  console.log(`[${requestId}] Response: ${content.substring(0, 300)}...`);

  return content;
};

const callOpenRouterWithRetry = async (
  env: Bindings,
  messages: Array<{ role: string; content: unknown }>,
  requestId: string,
  maxRetries = 2
) => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      console.log(`[${requestId}] Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await callOpenRouter(env, messages, requestId);
    } catch (error) {
      lastError = error;
      console.error(`[${requestId}] Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) break;
      const backoffMs = 800 * Math.pow(2, attempt);
      console.log(`[${requestId}] Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError;
};

// === ユーティリティ ===

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// === APIエンドポイント ===

app.post('/api/analysis/room-photo', async (c) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] === New request ===`);

  const contentType = c.req.header('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    console.error(`[${requestId}] Invalid content-type: ${contentType}`);
    return c.json({ error: 'content-type must be multipart/form-data' }, 415);
  }

  const body = await c.req.parseBody();
  const image = body.image;
  const locale = typeof body.locale === 'string' ? body.locale : undefined;
  const mode = typeof body.mode === 'string' ? body.mode : 'initial';
  const previousImageBase64 = typeof body.previousImage === 'string' ? body.previousImage : undefined;
  const previousCardsJson = typeof body.previousCards === 'string' ? body.previousCards : undefined;

  console.log(`[${requestId}] Mode: ${mode}`);
  console.log(`[${requestId}] Locale: ${locale ?? 'not specified'}`);
  console.log(`[${requestId}] Has previousImage: ${!!previousImageBase64}`);
  console.log(`[${requestId}] Has previousCards: ${!!previousCardsJson}`);

  if (!image || typeof image === 'string') {
    console.error(`[${requestId}] No image file in request`);
    return c.json({ error: 'image file is required' }, 400);
  }

  const file = image as File;
  console.log(`[${requestId}] File: ${file.name}, ${file.type}, ${file.size} bytes`);

  const arrayBuffer = await file.arrayBuffer();
  const base64Image = arrayBufferToBase64(arrayBuffer);
  console.log(`[${requestId}] Current image base64 length: ${base64Image.length}`);

  try {
    // === 初回モード ===
    if (mode === 'initial') {
      console.log(`[${requestId}] Processing initial analysis...`);
      const messages = buildInitialMessages({ base64Image, locale });
      const raw = await callOpenRouterWithRetry(c.env, messages, requestId);
      console.log(`[${requestId}] Raw response: ${raw}`);

      const parsed = parseJsonWithRecovery<InitialResponse>(raw);
      if (!parsed.ok) {
        console.error(`[${requestId}] Failed to parse JSON`);
        return c.json({ error: 'invalid_json_from_model', raw }, 502);
      }

      const result = {
        mode: 'initial',
        cards: (parsed.value.cards ?? []).map((card) => ({
          instruction: card.instruction,
        })),
      };

      console.log(`[${requestId}] Success! Cards: ${result.cards.length}`);
      return c.json(result);
    }

    // === フォローアップモード ===
    if (mode === 'followup') {
      if (!previousImageBase64 || !previousCardsJson) {
        console.error(`[${requestId}] Followup requires previousImage and previousCards`);
        return c.json({ error: 'followup mode requires previousImage and previousCards' }, 400);
      }

      let previousCards: CoachingResult[];
      try {
        previousCards = JSON.parse(previousCardsJson);
      } catch {
        console.error(`[${requestId}] Failed to parse previousCards`);
        return c.json({ error: 'invalid previousCards JSON' }, 400);
      }

      console.log(`[${requestId}] Processing followup analysis...`);
      console.log(`[${requestId}] Previous cards count: ${previousCards.length}`);
      console.log(`[${requestId}] Previous image base64 length: ${previousImageBase64.length}`);

      const messages = buildFollowupMessages({
        previousImage: previousImageBase64,
        currentImage: base64Image,
        previousCards,
        locale,
      });

      const raw = await callOpenRouterWithRetry(c.env, messages, requestId);
      console.log(`[${requestId}] Raw response: ${raw}`);

      const parsed = parseJsonWithRecovery<FollowupResponse>(raw);
      if (!parsed.ok) {
        console.error(`[${requestId}] Failed to parse JSON`);
        return c.json({ error: 'invalid_json_from_model', raw }, 502);
      }

      const result = {
        mode: 'followup',
        completed: parsed.value.completed ?? [],
        remaining: parsed.value.remaining ?? [],
        newTasks: parsed.value.newTasks ?? [],
        feedback: parsed.value.feedback ?? '',
      };

      console.log(`[${requestId}] Success!`);
      console.log(`[${requestId}] Completed: ${result.completed.length}`);
      console.log(`[${requestId}] Remaining: ${result.remaining.length}`);
      console.log(`[${requestId}] New tasks: ${result.newTasks.length}`);
      console.log(`[${requestId}] Feedback: ${result.feedback}`);

      return c.json(result);
    }

    return c.json({ error: 'invalid mode' }, 400);
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ヘルスチェック
app.get('/', (c) => c.json({ status: 'ok', service: 'cleaning-cards' }));

export default app;
