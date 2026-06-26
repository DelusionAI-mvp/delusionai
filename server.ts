import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Resend } from "resend";

// Ensure we load environment variables. If .env does not exist, fall back to .env.example
dotenv.config();
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
  console.log("[Environment] Standard .env not found. Loaded variables from .env.example successfully.");
}

const app = express();

async function startServer() {
  const PORT = 3000;

  // Copy logo to public directory if it exists, so we can use it in transactional emails
  try {
    const srcPath = path.join(process.cwd(), 'src', 'assets', 'images', 'delusion-logo.png');
    const publicDir = path.join(process.cwd(), 'public');
    const destPath = path.join(publicDir, 'delusion-logo.png');
    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log("Successfully copied delusion-logo.png to public folder for transactional emails.");
    }
  } catch (err) {
    console.error("Warning: Failed to copy delusion-logo.png to public:", err);
  }
  
  function sanitizeApiKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    return key.replace(/[^\x20-\x7E]/g, "").trim();
  }

  // Initialize Dual Resend Clients for maximum reliability (Primary and Fallback)
  const primaryApiKey = sanitizeApiKey(process.env.RESEND_API_KEY);
  const fallbackApiKey = "re_beBVqBhS_HLLainSpMJFe6q8exx37YTsm";

  const primaryResend = primaryApiKey ? new Resend(primaryApiKey) : null;
  const fallbackResend = new Resend(fallbackApiKey);

  console.log("[Resend Service] Init: Primary Key Exists:", !!primaryApiKey, "Fallback Key Exists: true");

  // Core email dispatcher trying multiple client + sender combinations for zero failures
  async function sendEmailWithResend(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }) {
    const clients = [];
    if (primaryResend && primaryApiKey !== fallbackApiKey) {
      clients.push({ client: primaryResend, label: "Primary API Key" });
    }
    clients.push({ client: fallbackResend, label: "Fallback API Key (Hardcoded)" });

    const fromAddresses = [
      "DelusionAI <support@delusionai.in>",
      "support@delusionai.in <support@delusionai.in>",
      "DelusionAI <onboarding@resend.dev>"
    ];

    let lastError: any = null;

    for (const { client, label } of clients) {
      for (const fromAddress of fromAddresses) {
        try {
          console.log(`[Resend Engine] Attempting send using ${label} from "${fromAddress}" to "${params.to}"`);
          const response = await client.emails.send({
            from: fromAddress,
            to: params.to,
            subject: params.subject,
            html: params.html,
            text: params.text,
            replyTo: params.replyTo || "delusionai.in@gmail.com"
          });

          if (response && response.error) {
            console.warn(`[Resend Engine] ${label} with from "${fromAddress}" returned error:`, response.error);
            lastError = response.error;
            continue; // try next combination
          }

          console.log(`[Resend Engine] SUCCESS with ${label} using from "${fromAddress}"! Message ID:`, response?.data?.id);
          return response;
        } catch (err: any) {
          console.warn(`[Resend Engine] ${label} with from "${fromAddress}" threw exception:`, err);
          lastError = err;
          // continue to next combination
        }
      }
    }

    throw lastError || new Error("All Resend delivery attempts failed.");
  }

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

  // A robust body parsing middleware that handles both traditional Node and serverless (Vercel) pre-parsed bodies
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      // Body is already pre-parsed by the serverless hosting environment (Vercel)
      return next();
    }
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
        return next();
      } catch (e) {
        // Fallback to express.json if parsing fails
      }
    }
    express.json()(req, res, next);
  });

  // API Health Check Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route for Email Notifications
  app.post("/api/notify", async (req, res) => {
    const { 
      type, 
      recipientEmail, 
      recipientName,
      subject: customSubject,
      html: customHtml,
      text: customText,
      to
    } = req.body || {};
    
    console.log(`[Email Notification API] Received request for type: "${type}", recipient: "${recipientEmail || to}"`);

    const targetEmail = recipientEmail || to;
    if (!targetEmail) {
      return res.status(400).json({ error: "recipientEmail is required" });
    }

    const userName = recipientName || "VIP Member";

    // Fallbacks to guarantee subject, html, and text are NEVER blank strings to Resend API
    let subject = (customSubject || "").toString().trim();
    if (!subject) {
      subject = `Welcome to DelusionAI, ${userName.toUpperCase()}! 🌿`;
    }

    let htmlBody = (customHtml || "").toString().trim();
    let textBody = (customText || "").toString().trim();

    // If both html and text are empty, construct our beautiful welcome email template
    if (!htmlBody && !textBody) {
      const previewText = `Thank you for joining DelusionAI, ${userName.toUpperCase()}! We're thrilled to have you with us.`;
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to DelusionAI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #333333; margin: 0; padding: 24px 16px; line-height: 1.6;">
          <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px;">
            ${previewText}
          </div>
          <div style="max-width: 600px; margin: 0 auto;">
            <p style="font-size: 15px; margin-bottom: 24px; color: #111111;">
              Thank you for joining DelusionAI, ${userName.toUpperCase()}! We're thrilled to have you with us.
            </p>
            <p style="font-size: 15px; margin-bottom: 24px; color: #111111; border-top: 1px dotted #e5e5e5; padding-top: 24px;">
              <strong>Hi ${userName.toUpperCase()},</strong>
            </p>
            <p style="font-size: 15px; margin-bottom: 20px; color: #222222;">
              Welcome to DelusionAI. <strong style="background-color: #fef08a; padding: 0 2px;">Maya</strong> is here and ready to listen to you.
            </p>
            <p style="font-size: 15px; margin-bottom: 24px; color: #333333;">
              We're just getting started &mdash; stay tuned for further updates, new features, and important notices we'll be sending your way.
            </p>
            <p style="font-size: 15px; color: #555555; margin-bottom: 40px;">
              &mdash; The DelusionAI Team
            </p>
            <div style="border-top: 1px solid #eaeaea; padding-top: 16px; font-size: 11px; color: #999999; background-color: #f9f9f9; text-align: center; border-radius: 4px; padding: 12px; font-weight: 500;">
              Email sent via Resend
            </div>
          </div>
        </body>
        </html>
      `;
      textBody = `Thank you for joining DelusionAI, ${userName.toUpperCase()}! We're thrilled to have you with us.\n\nHi ${userName.toUpperCase()},\n\nWelcome to DelusionAI. Maya is here and ready to listen to you.\n\nWe're just getting started - stay tuned for further updates, new features, and important notices we'll be sending your way.\n\n— The DelusionAI Team\n\nEmail sent via Resend`;
    } else if (!htmlBody) {
      htmlBody = `<div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.6; color: #333333;">${textBody}</div>`;
    } else if (!textBody) {
      textBody = htmlBody.replace(/<[^>]*>/g, " ").trim();
    }

    try {
      const response = await sendEmailWithResend({
        to: targetEmail,
        subject: subject,
        html: htmlBody,
        text: textBody,
        replyTo: "delusionai.in@gmail.com"
      });

      console.log("[Email Notification] Welcome email sent successfully:", response?.data);
      return res.json({ success: true, data: response?.data });
    } catch (err: any) {
      console.error("[Email Notification] Exception during email dispatch:", err);
      return res.status(500).json({ error: err.message || "Internal exception during email dispatch" });
    }
  });

  // API Route for sending companion report
  app.post("/api/email/send-report", async (req, res) => {
    const { recipientEmail, recipientName, preferences, messages, emotionalProfile } = req.body || {};
    console.log(`[Send Report API] Received report request for recipient: "${recipientEmail}"`);

    if (!recipientEmail) {
      return res.status(400).json({ error: "recipientEmail is required" });
    }

    const userName = recipientName || "Companion";
    const currentSituation = preferences?.currentSituation || [];
    const whyJoined = preferences?.whyJoined || [];
    const interests = preferences?.interests || [];

    const moodBaseline = emotionalProfile?.moodBaseline || "Reflective";
    const needs = emotionalProfile?.needs || "Comforting connection";
    const traits = Array.isArray(emotionalProfile?.traits) ? emotionalProfile?.traits.join(', ') : (emotionalProfile?.traits || 'Sensitive, Resilient');
    const coping = Array.isArray(emotionalProfile?.interests) ? emotionalProfile?.interests.join(', ') : (emotionalProfile?.interests || 'Mindfulness, Self-care');

    // Build the companion report email template
    const subject = `Your Oasis Discovery Report from Maya AI 🌿`;
    const previewText = `Your customized Oasis Discovery Report and emotional alignment analysis is ready, ${userName}.`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Oasis Discovery Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #333333; margin: 0; padding: 24px 16px; line-height: 1.6;">
        <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px;">
          ${previewText}
        </div>
        <div style="max-width: 600px; margin: 0 auto; border: 2px solid #8B1A2F; border-radius: 20px; padding: 30px; background-color: #FFFBF0;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
            <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Oasis Discovery Report</p>
          </div>
          <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
          <p>Dear ${userName},</p>
          <p>Your interactive conversation session with <strong>Maya AI</strong> has been summarized. Based on your shared thoughts, Maya has prepared your customized <strong>Oasis Discovery Report</strong>:</p>
          
          <div style="background-color: #ffffff; border: 1px solid rgba(139,26,47,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #8B1A2F; margin-top: 0;">Emotional Alignment Profile</h3>
            <p><strong>Baseline Mood Alignment:</strong> ${moodBaseline}</p>
            <p><strong>Primary Needs:</strong> ${needs}</p>
            <p><strong>Personality & Traits:</strong> ${traits}</p>
            <p><strong>Interests & Coping:</strong> ${coping}</p>
            ${currentSituation.length > 0 ? `<p><strong>Current Situation Focus:</strong> ${currentSituation.join(', ')}</p>` : ''}
            ${whyJoined.length > 0 ? `<p><strong>Core Motivations:</strong> ${whyJoined.join(', ')}</p>` : ''}
          </div>

          <p style="font-style: italic; color: #625052;">"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."</p>

          <p>Warmest regards,</p>
          <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          
          <div style="border-top: 1px solid #eaeaea; padding-top: 16px; font-size: 11px; color: #999999; background-color: #f9f9f9; text-align: center; border-radius: 4px; padding: 12px; font-weight: 500; margin-top: 30px;">
            Email sent via Resend
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `Dear ${userName},\n\nYour interactive conversation session with Maya AI has been summarized. Based on your shared thoughts, Maya has prepared your customized Oasis Discovery Report:\n\nEmotional Alignment Profile:\n- Baseline Mood Alignment: ${moodBaseline}\n- Primary Needs: ${needs}\n- Personality & Traits: ${traits}\n- Interests & Coping: ${coping}\n\n"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."\n\nWarmest regards,\nThe DelusionAI Team\n\nEmail sent via Resend`;

    try {
      const response = await sendEmailWithResend({
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        text: textBody,
        replyTo: "delusionai.in@gmail.com"
      });

      console.log("[Send Report API] Companion report sent successfully:", response?.data);
      return res.json({ status: "success", provider: "Resend", data: response?.data });
    } catch (err: any) {
      console.error("[Send Report API] Exception during email dispatch:", err);
      return res.status(500).json({ error: err.message || "Internal exception during email dispatch" });
    }
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

      const responseText = response.text || "";

      // Email reports logic removed (Resend service has been removed)
      res.json({ text: responseText });
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

  const isVercel = !!process.env.VERCEL;
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export { app };
export default app;
