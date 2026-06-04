import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAI, generateContentWithRetry } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, oldSummary } = req.body || {};
  const messagesArray = Array.isArray(messages) ? messages : [];
  
  const prompt = `Generate a very short, concise summary of this user's state.
Old Summary: ${oldSummary || "None"}
Recent Messages:
${messagesArray.map((m: any) => m ? `${m.role || 'user'}: ${m.content || ''}` : '').join('\n')}

Format: One or two sentences max. Focus on:
- Main struggles (e.g., loneliness, career stress)
- Personality (e.g., overthinker, calm)
- Interests mentioned.`;

  try {
    const ai = getAI();
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: "Create a short user memory summary for an AI companion. Be objective and concise. Respond in simple English (approx. A1/A2 level) with short sentences.",
        temperature: 0.5,
      }
    });

    return res.json({ summary: response.text || "" });
  } catch (error: any) {
    console.error("Maya Summary Error:", error);
    return res.json({ summary: oldSummary || "Finding balance and peace step-by-step." });
  }
}
