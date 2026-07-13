import { Resend } from 'resend';
import OpenAI from 'openai';

function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key.replace(/[^\x20-\x7E]/g, "").trim();
}

export const RESEND_KEY = sanitizeApiKey(process.env.RESEND_API_KEY) || "re_beBVqBhS_HLLainSpMJFe6q8exx37YTsm";
export const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

let aiClient: OpenAI | null = null;

export function getAI(): OpenAI {
  if (!aiClient) {
    const rawApiKey = process.env.OPENAI_API_KEY;
    const apiKey = sanitizeApiKey(rawApiKey);
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined. Please set it in Vercel > Settings > Environment Variables.");
    }
    aiClient = new OpenAI({ apiKey });
  }
  return aiClient;
}

// Helper function to retry OpenAI requests on 429/503 and fall back to alternative models
export async function generateContentWithRetry(
  ai: OpenAI,
  params: {
    model: string;
    contents: any; // expects an array of {role, content} messages
    config?: any;
  },
  retries = 3,
  delayMs = 1500
): Promise<any> {
  let attempt = 0;
  let currentModel = params.model;
  const fallbackModels = ['gpt-4o-mini', 'gpt-4o'];

  while (true) {
    try {
      console.log(`Sending request to model: ${currentModel}`);
      return await ai.chat.completions.create({
        model: currentModel,
        messages: params.contents,
        ...(params.config || {}),
      });
    } catch (error: any) {
      attempt++;
      const status = error?.status || error?.code;
      const errorMessage = (error?.message || error?.toString() || "").toLowerCase();
      const isRetryable =
        status === 503 || status === 429 ||
        errorMessage.includes("503") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("temporary");

      console.warn(`OpenAI error on model ${currentModel} (attempt ${attempt}/${retries + 1}):`, error);

      if (isRetryable && attempt <= retries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        console.warn(`Model ${currentModel} busy. Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (fallbackModels.length > 0) {
        const nextModel = fallbackModels.shift();
        if (nextModel && nextModel !== currentModel) {
          console.warn(`Attempting fallback to model: ${nextModel}`);
          currentModel = nextModel;
          attempt = 0;
          continue;
        }
      }

      throw error;
    }
  }
}
