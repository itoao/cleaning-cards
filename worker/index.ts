/**
 * Cloudflare Workers用 Hono サーバー
 * クライアントからJPEG画像を受け取り、OpenRouter APIで分析
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

interface CoachingResult {
  instruction: string;
}

interface CoachingResponse {
  cards: CoachingResult[];
}

const SYSTEM_PROMPT = [
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

const buildMessages = (input: { base64Image: string; locale?: string }) => {
  const localeHint = input.locale ? `Locale: ${input.locale}` : 'Locale: unspecified';
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
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

const callOpenRouter = async (
  env: Bindings,
  input: { base64Image: string; locale?: string }
) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[OpenRouter] API key not set');
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  console.log(`[OpenRouter] Using model: ${model}`);
  console.log(`[OpenRouter] Image size: ${input.base64Image.length} chars`);
  console.log(`[OpenRouter] Locale: ${input.locale ?? 'unspecified'}`);

  const payload = {
    model,
    messages: buildMessages(input),
    temperature: 0.2,
    max_tokens: 1200,
  };

  console.log('[OpenRouter] Sending request...');
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
  console.log(`[OpenRouter] Response status: ${response.status} (${elapsed}ms)`);

  if (!response.ok) {
    const text = await response.text();
    console.error(`[OpenRouter] Error response: ${text}`);
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    console.error('[OpenRouter] Response missing content:', JSON.stringify(data));
    throw new Error('OpenRouter response missing content');
  }

  console.log(`[OpenRouter] Response content length: ${content.length}`);
  console.log(`[OpenRouter] Response preview: ${content.substring(0, 200)}...`);

  return content;
};

const callOpenRouterWithRetry = async (
  env: Bindings,
  input: { base64Image: string; locale?: string },
  maxRetries = 2
) => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      console.log(`[OpenRouter] Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await callOpenRouter(env, input);
    } catch (error) {
      lastError = error;
      console.error(`[OpenRouter] Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) break;
      const backoffMs = 800 * Math.pow(2, attempt);
      console.log(`[OpenRouter] Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError;
};

const callOpenRouterFixJson = async (env: Bindings, rawText: string, locale?: string) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const localeHint = locale ? `Locale: ${locale}` : 'Locale: unspecified';
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\nReturn ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Fix the following text into the JSON schema only. ${localeHint}\n\n${rawText}`,
      },
    ],
    temperature: 0,
    max_tokens: 1200,
  };

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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenRouter response missing content');
  }

  return content;
};

// ArrayBufferをBase64に変換（Cloudflare Workers対応）
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

app.post('/api/analysis/room-photo', async (c) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] === New request ===`);

  const contentType = c.req.header('content-type') ?? '';
  console.log(`[${requestId}] Content-Type: ${contentType}`);

  if (!contentType.includes('multipart/form-data')) {
    console.error(`[${requestId}] Invalid content-type`);
    return c.json({ error: 'content-type must be multipart/form-data' }, 415);
  }

  const body = await c.req.parseBody();
  const image = body.image;
  const locale = typeof body.locale === 'string' ? body.locale : undefined;
  console.log(`[${requestId}] Locale: ${locale ?? 'not specified'}`);

  if (!image || typeof image === 'string') {
    console.error(`[${requestId}] No image file in request`);
    return c.json({ error: 'image file is required' }, 400);
  }

  const file = image as File;
  console.log(`[${requestId}] File name: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

  const arrayBuffer = await file.arrayBuffer();
  console.log(`[${requestId}] ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

  // クライアント側でJPEGに変換済みなので、そのままBase64エンコード
  const base64Image = arrayBufferToBase64(arrayBuffer);
  console.log(`[${requestId}] Base64 length: ${base64Image.length} chars`);

  try {
    console.log(`[${requestId}] Calling OpenRouter...`);
    const raw = await callOpenRouterWithRetry(c.env, { base64Image, locale });
    console.log(`[${requestId}] Raw response: ${raw}`);

    let parsed = parseJsonWithRecovery<CoachingResponse>(raw);
    console.log(`[${requestId}] Parse result: ${parsed.ok ? 'success' : 'failed'}`);

    if (!parsed.ok) {
      console.log(`[${requestId}] Attempting JSON fix...`);
      const fixed = await callOpenRouterFixJson(c.env, raw, locale);
      console.log(`[${requestId}] Fixed response: ${fixed}`);
      parsed = parseJsonWithRecovery<CoachingResponse>(fixed);
      console.log(`[${requestId}] Fixed parse result: ${parsed.ok ? 'success' : 'failed'}`);
    }

    if (!parsed.ok) {
      console.error(`[${requestId}] Failed to parse JSON`);
      return c.json({ error: 'invalid_json_from_model', raw }, 502);
    }

    const normalized = {
      cards: (parsed.value.cards ?? []).map((card) => ({
        instruction: card.instruction,
      })),
    };

    console.log(`[${requestId}] Success! Cards: ${normalized.cards.length}`);
    console.log(`[${requestId}] Cards: ${JSON.stringify(normalized.cards)}`);

    return c.json(normalized);
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ヘルスチェック
app.get('/', (c) => c.json({ status: 'ok', service: 'cleaning-cards' }));

export default app;
