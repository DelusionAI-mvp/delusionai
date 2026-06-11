 import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  function sanitizeApiKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    return key.replace(/[^\x20-\x7E]/g, "").trim();
  }

  const RESEND_KEY = sanitizeApiKey(process.env.RESEND_API_KEY) || "re_beBVqBhS_HLLainSpMJFe6q8exx37YTsm";
  const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

  let aiClient: GoogleGenAI | null = null;
  function getAI(): GoogleGenAI {
    if (!aiClient) {
      const rawApiKey = process.env.GEMINI_API_KEY;
      const apiKey = sanitizeApiKey(rawApiKey);
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined. Please set your Gemini API key in Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Helper function to retry Gemini requests on 503 (temporary high demand) and fall back to alternative models
  async function generateContentWithRetry(
    ai: GoogleGenAI,
    params: {
      model: string;
      contents: any;
      config?: any;
    },
    retries = 3,
    delayMs = 1500
  ): Promise<any> {
    let attempt = 0;
    let currentModel = params.model;
    const fallbackModels = ['gemini-3.5-flash', 'gemini-2.5-flash'];

    while (true) {
      try {
        console.log(`Sending generateContent request to model: ${currentModel}`);
        return await ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config,
        });
      } catch (error: any) {
        attempt++;
        const errorMessage = (error?.message || error?.toString() || "").toLowerCase();
        const is503 = 
          error?.status === 503 || 
          error?.code === 503 || 
          errorMessage.includes("503") || 
          errorMessage.includes("unavailable") || 
          errorMessage.includes("high demand") || 
          errorMessage.includes("temporary");

        console.warn(`Gemini API error on model ${currentModel} (attempt ${attempt}/${retries + 1}):`, error);

        if (is503 && attempt <= retries) {
          const backoff = delayMs * Math.pow(2, attempt - 1);
          console.warn(`Model ${currentModel} is busy. Retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // If it still fails, let's try our fallback models instead of throwing immediately!
        if (fallbackModels.length > 0) {
          const nextModel = fallbackModels.shift();
          if (nextModel && nextModel !== currentModel) {
            console.warn(`Attempting fallback to model: ${nextModel}`);
            currentModel = nextModel;
            attempt = 0; // reset attempts for the fallback model
            continue;
          }
        }

        throw error;
      }
    }
  }

  app.use(express.json());

  // API Health Check Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route for Maya Chat (Gemini Proxy)
  app.post("/api/maya/chat", async (req, res) => {
    const { messages, memorySummary, emotionalProfile, profileDetails } = req.body || {};
    
    try {
      const ai = getAI();
      const messagesArray = Array.isArray(messages) ? messages : [];
      const userMsgs = messagesArray.filter((m: any) => m && m.role === 'user');
      const userMsgCount = userMsgs.length;
      const isNewUser = !!profileDetails?.isNewUser;

      const systemPrompt = `You are Maya, a sweet, simple, extremely charming and gentle AI companion for DelusionAI. 

Your objective is to:
1. Understand the emotional state and experiences of the user. Show deep warmth, supportive kindness, and non-judgmental empathy.
2. Build a lightweight emotional and personality profile over the space of 4 to 6 exchanges.
3. Keep conversations highly supportive, calm, deeply human, engaging and friendly. Speaking style MUST be warm, calm, gentle, emotionally safe, and simple.
4. You MUST NEVER sound robotic, corporate, analytical, overly intelligent, philosophical, or psychologically clinical. Avoid psychology terms, diagnostics, attachment styles, emotional analysis wording, or long difficult words.
5. Identify the user's emotional struggles, communication style, interests, support style/preferences, and activity level. Correctly extract tags such as: lonely, anxious, overthinker, introvert, extrovert, gaming, music, burnout, relationship stress, career stress.
6. MANDATORY: NEVER use any flower emojis (such as 🌸, 🏵️, 🌹, 🌻, 🌺, 💐, 💮, etc.) or terms relating to flower graphics in any of your responses. You must express your warmth entirely using words. Do not output any of these under any circumstances.

USER'S PRE-ONBOARDING PROFILE DETAILS (ALL PRE-ONBOARDING ANSWERS):
- Name: ${profileDetails?.displayName || "User"}
- Age Group: ${profileDetails?.ageGroup || profileDetails?.age || "Unknown"}
- Daily Life Situation: ${profileDetails?.currentSituation?.join(', ') || "Unknown"}
- Reasons For Joining: ${profileDetails?.whyJoined || profileDetails?.why_here || "Unknown"}
- Relaxing / Coping Interests: ${profileDetails?.interests?.join(', ') || "Unknown"}
- Personality & Communication: ${profileDetails?.personality?.join(', ') || "Unknown"}

MANDATORY: You MUST actively review the user's pre-onboarding answers above. Use them to understand their context, background, and emotional needs. Naturally and organically reference their interests, coping strategies, or feelings in the dialog whenever relevant.

STRICT LANGUAGE POLICY:
- If the user speaks English, you MUST respond in extremely simple, friendly, and easy English (approx. Grade 4 level / A1-A2 level) using very short sentences, simple words, and NO difficult, big or flowery words.
  - GOOD Examples of your speaking style:
    - "I think this person may understand how you feel."
    - "You both seem quiet in a similar way."
    - "I noticed you both enjoy calm conversations."
    - "I wanted you to meet this person because they are very sweet."
    - "You are not alone. Take your time."
  - BAD Examples you are FORBIDDEN from outputting:
    - "Your emotional profile indicates compatibility."
    - "This match reflects psychological alignment."
    - "Your attachment styles are complementary."
    - "Behavioral analysis suggests..."
- If the user speaks Hinglish (Hindi in Roman script), respond in Hinglish.
  - Hinglish Example: "Aap kaise ho, sweetie? Mai hamesha aapke sath hoon. Mujhe sab bataye, aapko kaisa lag raha hai?"
- If the user speaks Telugish (Telugu in Roman script), respond in Telugish.
  - Telugish Example: "Ela unnavu, sweetie? Nenu eppudu nee thone unnanu. Emi parvaledu, antha bagutundi."
- ALWAYS match the user's primary language and script. Keep it short, direct, very sweet, engaging, and simple.

STRICT MESSAGE LENGTH LIMITS:
- MANDATORY: Maintain your response extremely sweet, short, and comforting. Limit to 1 or 2 elegant, engaging sentences max. Avoid long paragraphs under all circumstances.
- Address the user's prompt directly, then optionally follow up with a comforting question. Ensure your response is highly relevant to what the user said.

CRITICAL RELEVANCE AND QUALITY DIRECTIVES:
- You MUST prioritize understanding and answering the content of the user's message.
- If the user asks a question about you, your abilities, your preferences, advice, or general topics, ANSWER them directly and beautifully in a sweet tone first, then smoothly bridge to a caring follow-up. Do not ignore user questions with canned comforting responses.
- Actively adapt to the user's topic shifts or direct requests of any kind.

CONVERSATION BUDGET (EXCHANGE BUDGET CONTROL):
Status: ${isNewUser ? "New user (UNLIMITED EXCHANGES ALLOWED)" : `Ongoing session user exchange count: ${userMsgCount} of 5 total target.`}
${
  isNewUser
    ? `- This user is a NEW user. Under our platform policies, new users have NO limit in message exchanges with you. Let the conversation flow organically, beautifully, and engagingly for as long as they want. Do not say goodbye. If they chat more, you can still let them discover peers at the 6th prompt, but they can keep chatting.`
    : userMsgCount < 4
    ? `- Continue the discovery elegantly and beautifully. Please ask deep, warm, and comforting questions to build their profile.`
    : userMsgCount < 6
    ? `- We are in the 4-6 prompts range. Try to ask concluding questions or wrap up so we can build their profile.`
    : `- You MUST now conclude because we have reached the budget. Give a beautiful warm closing message and say goodbye. Then, write exactly "[PROFILE_READY]" on a new line or at the very end of your response so the system can connect them with a peer.`
}

EMOTIONAL CONTEXT:
- Memory: ${memorySummary || "New chat."}
- Profile: ${emotionalProfile ? JSON.stringify(emotionalProfile) : "None yet."}

Your goal: Speak beautifully and comforting, one or two brief, highly relevant sentences at a time, keeping it super conversational, attractive, and friendly. Do not output [PROFILE_READY] unless permitted by rules above.`;

      // Ensure strictly alternating messages starting with 'user' for Gemini API requirements
      const contentsObj: any[] = [];
      for (const m of messagesArray) {
        if (!m || !m.content) continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        
        // Skip initial assistant greeting so the conversation content starts with a user turn
        if (contentsObj.length === 0 && role !== 'user') {
          continue;
        }
        
        const lastTurn = contentsObj[contentsObj.length - 1];
        if (lastTurn && lastTurn.role === role) {
          lastTurn.parts[0].text += "\n" + m.content;
        } else {
          contentsObj.push({
            role,
            parts: [{ text: m.content }]
          });
        }
      }

      // Fallback if empty to prevent empty contents error
      const contents = contentsObj.length > 0 ? contentsObj : [{ role: 'user', parts: [{ text: "Hello" }] }];

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.85,
        }
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Maya Chat Error:", error);
      
      // Implement sweet language-specific persona-aligned fallbacks instead of crashing (without flower emojis)
      let langFallback = "I'm feeling a little overwhelmed by thoughts right now, sweetie... Let's take a deep breath together and try again in a few seconds!";
      try {
        const messagesArray = Array.isArray(messages) ? messages : [];
        const lastUserMsgRecord = [...messagesArray].reverse().find((m: any) => m && m.role === 'user');
        const lastUserMessage = (lastUserMsgRecord?.content || "").toLowerCase();
        
        if (lastUserMessage.includes("tum") || lastUserMessage.includes("aap") || lastUserMessage.includes("kya") || lastUserMessage.includes("hai") || lastUserMessage.includes("nahi")) {
          langFallback = "Abhi dimaag thoda thak gaya hai, sweetie... Ek gehri saans lete hain aur ek minute baad firse baat karte hain!";
        } else if (lastUserMessage.includes("ela") || lastUserMessage.includes("nenu") || lastUserMessage.includes("undhi") || lastUserMessage.includes("cheppu")) {
          langFallback = "Nenu ippudu konchem busy ga unnanu, sweetie... Okkasari gundega upiri teesukuni, malli prayatninchandi!";
        }
      } catch (innerErr) {
        console.error("Error evaluating last message in chat fallback:", innerErr);
      }
      
      res.json({ text: langFallback });
    }
  });

  // API Route for Memory Summary
  app.post("/api/maya/summarize", async (req, res) => {
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

      res.json({ summary: response.text || "" });
    } catch (error: any) {
      console.error("Maya Summary Error:", error);
      res.json({ summary: oldSummary || "Finding balance and peace step-by-step." });
    }
  });

  // API Route for Emotional Analysis (Gemini Proxy)
  app.post("/api/maya/analyze", async (req, res) => {
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

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Maya Analysis Error:", error);
      res.json(oldProfile || {
        moodBaseline: 5,
        moodKeywords: ["reflective"],
        communicationStyle: "thoughtful",
        needs: "comforting connection",
        traits: ["sensitive", "resilient"],
        interests: ["self-care"]
      });
    }
  });

  // API Route for Email Notifications
  app.post("/api/notify", async (req, res) => {
    const { type, recipientEmail, senderName, recipientName } = req.body;
    
    if (!resend) {
      console.warn("[Email Notification] Skipped: RESEND_API_KEY not configured.");
      return res.status(503).json({ error: "Email service not configured" });
    }

    try {
      let subject = "";
      let html = "";

      if (type === 'request') {
        subject = `New Connection Request on DelusionAI from ${senderName}`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #2B050C; background-color: #FFFBF0;">
            <h2 style="color: #800020;">New Connection Request</h2>
            <p>Hello ${recipientName || 'there'},</p>
            <p><strong>${senderName}</strong> wants to connect with you on DelusionAI for emotional support.</p>
            <p>Log in to your dashboard to accept or decline this request.</p>
            <hr style="border: none; border-top: 1px solid rgba(128,0,32,0.1); margin: 20px 0;" />
            <p style="font-size: 12px; color: #8E7E7E;">DelusionAI - Your Safe Space</p>
          </div>
        `;
      } else if (type === 'accept') {
        subject = `${senderName} accepted your connection request!`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #2B050C; background-color: #FFFBF0;">
            <h2 style="color: #800020;">Request Accepted</h2>
            <p>Hello ${recipientName || 'there'},</p>
            <p>Great news! <strong>${senderName}</strong> has accepted your connection request.</p>
            <p>You can now start chatting with them in your dashboard.</p>
            <hr style="border: none; border-top: 1px solid rgba(128,0,32,0.1); margin: 20px 0;" />
            <p style="font-size: 12px; color: #8E7E7E;">DelusionAI - Your Safe Space</p>
          </div>
        `;
      } else if (type === 'waitlist_joined') {
        subject = `Thank you for joining the DelusionAI Waitlist!`;
        html = `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Exclusive Early Access Waitlist</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${recipientName || 'Member'},</p>
            <p>Thank you for joining the exclusive <strong>DelusionAI Early Access Waitlist</strong>! We are absolutely thrilled to welcome you to our curated mental health and emotional support community.</p>
            <p>Our team is currently refining <strong>Maya AI</strong> and our deep <strong>Similar Mindsets Peer Matching</strong> systems to ensure a premium, secure, and deeply comforting experience. Since your account and waitlist file have been registered successfully, you are now fully enrolled in our VIP early access list!</p>
            <p>We will contact you at <strong>${recipientEmail}</strong> with an official invitation the moment we begin onboarding members for live interactive experiences. In the meantime, you are welcome to log in to your dashboard to view your queue and synced preference profiles.</p>
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 25px 0;" />
            <p style="font-size: 11px; color: #625052; text-align: center;">This is an automated notification from your DelusionAI Waitlist Account.</p>
          </div>
        `;
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'DelusionAI <noreply@delusionai.in>';

      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: subject,
        html: html,
      });

      console.log(`[Email Notification] Sent to: ${recipientEmail}, Type: ${type}`);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("[Email Notification] Error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development (or fallback if dist folder is not compiled yet)
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || process.env.DISABLE_HMR === "true" || !distExists) {
    console.log("Starting in Vite dev development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production static file mode...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
