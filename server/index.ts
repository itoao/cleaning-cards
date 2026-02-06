import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import sharp from 'sharp';

type ParsedJson<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

const app = new Hono();
app.use('*', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'] }));

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

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


const callOpenRouter = async (input: { base64Image: string; locale?: string }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const payload = {
    model,
    messages: buildMessages(input),
    temperature: 0.2,
    max_tokens: 1200,
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERRER ?? 'http://localhost',
      'X-Title': process.env.OPENROUTER_TITLE ?? 'cleaning-cards',
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

const callOpenRouterWithRetry = async (
  input: { base64Image: string; locale?: string },
  maxRetries = 2
) => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await callOpenRouter(input);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const backoffMs = 800 * Math.pow(2, attempt);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError;
};

const callOpenRouterFixJson = async (rawText: string, locale?: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
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
      'HTTP-Referer': process.env.OPENROUTER_REFERRER ?? 'http://localhost',
      'X-Title': process.env.OPENROUTER_TITLE ?? 'cleaning-cards',
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


app.post('/api/analysis/room-photo', async (c) => {
  const contentType = c.req.header('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'content-type must be multipart/form-data' }, 415);
  }

  const body = await c.req.parseBody();
  const image = body.image;
  const locale = typeof body.locale === 'string' ? body.locale : undefined;

  if (!image || typeof image === 'string') {
    return c.json({ error: 'image file is required' }, 400);
  }

  const file = image as File;
  const arrayBuffer = await file.arrayBuffer();
  let imageBuffer = Buffer.from(arrayBuffer);
  const fileType = file.type || '';
  const fileName = file.name?.toLowerCase() || '';
  const isHeic = fileType.includes('heic') || fileType.includes('heif') || fileName.endsWith('.heic') || fileName.endsWith('.heif');

  if (isHeic) {
    try {
      imageBuffer = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
    } catch (error) {
      try {
        const { default: heicConvert } = await import('heic-convert');
        const converted = await heicConvert({
          buffer: imageBuffer,
          format: 'JPEG',
          quality: 0.85,
        });
        imageBuffer = Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
      } catch (convertError) {
        return c.json({ error: 'heic_convert_failed' }, 415);
      }
    }
  }

  const base64Image = imageBuffer.toString('base64');

  const raw = await callOpenRouterWithRetry({ base64Image, locale });
  let parsed = parseJsonWithRecovery<CoachingResponse>(raw);

  if (!parsed.ok) {
    const fixed = await callOpenRouterFixJson(raw, locale);
    parsed = parseJsonWithRecovery<CoachingResponse>(fixed);
  }

  if (!parsed.ok) {
    return c.json({ error: 'invalid_json_from_model', raw }, 502);
  }

  let normalized = {
    cards: (parsed.value.cards ?? []).map((card) => ({
      instruction: card.instruction,
    })),
  };

  return c.json(normalized);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });

console.log(`Hono server running on http://localhost:${port}`);
