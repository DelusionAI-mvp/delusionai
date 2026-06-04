import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from "@google/genai";
import { getAI, generateContentWithRetry } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, oldProfile } = req.body || {};
  const messagesArray = Array.isArray(messages) ? messages : [];
  
  const prompt = `Based on our conversation, generate a refined emotional profile.
Previous Profile: ${oldProfile ? JSON.stringify(oldProfile) : "None"}
Conversation history:
${messagesArray.map((m: any) => m ? `${m.role || 'user'}: ${m.content || ''}` : '').join('\n')}

Output JSON with updated traits and interests.`;

  try {
    const ai = getAI();
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: "Analyze the user's conversation history with Maya. Build and continuously refine a structured emotional and personality profile. Extract ageGroup (e.g., '18-22', '23-29', '30-39', '40-49', '50+'), emotionalTags (such as: 'lonely', 'anxious', 'overthinker', 'burnout', 'relationship stress', 'career stress'), personalityTraits (such as: 'introvert', 'extrovert'), interests (such as: 'gaming', 'music'), supportStyle, communicationStyle, and activityLevel. Output JSON only. Merge new findings with the previous profile and make sure to populate all parameters.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moodBaseline: { type: Type.NUMBER },
            moodKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            communicationStyle: { type: Type.STRING },
            needs: { type: Type.STRING },
            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            ageGroup: { type: Type.STRING },
            emotionalTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
            supportStyle: { type: Type.STRING },
            activityLevel: { type: Type.STRING }
          }
        }
      }
    });

    return res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Maya Analysis Error:", error);
    return res.json(oldProfile || {
      moodBaseline: 5,
      moodKeywords: ["reflective"],
      communicationStyle: "thoughtful",
      needs: "comforting connection",
      traits: ["sensitive", "resilient"],
      interests: ["self-care"]
    });
  }
}
