import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import { GoogleGenAI, Type } from "@google/genai";

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

  function getFromEmail(): string {
    // The user's verified domain is delusionai.in, and the desired sender is support@delusionai.in.
    // Setting this explicitly eliminates any potential subdomain or fallback misconfigurations.
    return "support@delusionai.in";
  }

  const RESEND_KEY = sanitizeApiKey(process.env.RESEND_API_KEY) || "re_beBVqBhS_HLLainSpMJFe6q8exx37YTsm";
  const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

  // Prepares the target recipient and potentially modifies body if in Resend Sandbox Mode
  function adjustSandboxRecipient(
    recipient: string,
    html: string,
    text: string,
    subject: string,
    overrideFrom?: string
  ): { target: string; html: string; text: string; subject: string; isRedirected: boolean } {
    const rawFrom = overrideFrom || getFromEmail();
    const isSandboxFrom = rawFrom.includes("resend.dev");
    
    // In sandbox/testing mode, only the verified administrator account address 'delusionai.in@gmail.com' is allowed.
    // Any other addresses (like charanram32975@gmail.com or other non-verified members) are safely redirected to delusionai.in@gmail.com.
    const allowedRecipients = ["delusionai.in@gmail.com"];
    const isAllowed = allowedRecipients.some(email => recipient.toLowerCase().trim() === email.toLowerCase().trim());
    
    if (isSandboxFrom && !isAllowed) {
      // Primary verified sandbox owner email is delusionai.in@gmail.com
      const adminEmail = "delusionai.in@gmail.com";
      
      const sandboxBannerHtml = `
        <div style="background-color: #FFF2E6; border: 2px solid #FF8000; padding: 15px; border-radius: 10px; margin-bottom: 20px; color: #663300; font-family: sans-serif; font-size: 13px;">
          <strong>⚠️ Resend Sandbox Mode Active</strong><br/>
          This email was originally addressed to <strong>${recipient}</strong>. Since you are in Resend Sandbox/Testing mode (using <code>${rawFrom}</code>), Resend only permits sending to your verified account email (<code>${adminEmail}</code>). We have redirected this email here so you can preview it.
        </div>
      `;
      const sandboxBannerText = `[Resend Sandbox - Originally for: ${recipient}]\nThis email was redirected to you because your Resend domain is in Sandbox mode.\n\n`;
      
      return {
        target: adminEmail,
        html: sandboxBannerHtml + html,
        text: sandboxBannerText + text,
        subject: `[Sandbox preview for ${recipient}] ${subject}`,
        isRedirected: true
      };
    }
    
    return {
      target: recipient,
      html,
      text,
      subject,
      isRedirected: false
    };
  }

  // Robust helper to send email via Resend with auto-fallback to onboarding@resend.dev on domain/sandbox errors
  async function sendEmailWithFallback(
    to: string,
    subject: string,
    html: string,
    text: string,
    customFrom?: string
  ) {
    if (!resend) {
      console.warn("[Email Notification] Skipped: RESEND_API_KEY not configured.");
      return { error: { message: "Email service not configured" } };
    }

    // Double layer safeguard: Ensure subject, html, and text are NEVER blank strings
    let finalSubject = (subject || "").toString().trim();
    let finalHtml = (html || "").toString().trim();
    let finalText = (text || "").toString().trim();

    const logoUrl = "https://delusionai.in/delusion-logo.png";
    const dashboardUrl = "https://delusionai.in/dashboard";

    if (!finalSubject) {
      finalSubject = "Notification from DelusionAI";
    }
    if (!finalHtml) {
      console.warn("[Email Notification] Warning: sendEmailWithFallback received an empty HTML body. Overriding with fallback.");
      finalHtml = `
        <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
          <div style="text-align: center; margin-bottom: 25px;">
            <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
            <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
          </div>
          <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
          <p>Hello,</p>
          <p>We are writing to welcome you and keep you updated on your <strong>DelusionAI</strong> secure account activities.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Access Your Dashboard</a>
          </div>
          <p>Warmest regards,</p>
          <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
        </div>
      `;
    }
    if (!finalText) {
      console.warn("[Email Notification] Warning: sendEmailWithFallback received an empty Text body. Overriding with fallback.");
      finalText = `Hello,\n\nWe are writing to welcome you and keep you updated on your DelusionAI secure account activities.\n\nAccess your dashboard here:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
    }

    const rawFrom = customFrom || getFromEmail();
    
    // Format display name as "support@delusionai.in" and email as "support@delusionai.in"
    const fromEmail = "support@delusionai.in <support@delusionai.in>";
    
    const emailSettings = adjustSandboxRecipient(to, finalHtml, finalText, finalSubject, rawFrom);

    console.log(`[Email Notification] Attempting dispatch. From: "${fromEmail}" | To: "${emailSettings.target}" (originally: "${to}") | Subject: "${emailSettings.subject}" | HTML size: ${emailSettings.html.length} | Text size: ${emailSettings.text.length}`);

    try {
      let response = await resend.emails.send({
        from: fromEmail,
        to: emailSettings.target,
        subject: emailSettings.subject,
        html: emailSettings.html,
        text: emailSettings.text,
        replyTo: "delusionai.in@gmail.com",
      });

      if (response && response.error) {
        const errMsg = response.error.message || "";
        console.warn("[Email Notification] Preferred sender failed:", fromEmail, "Error:", errMsg);

        // Check if sandbox restriction or domain verification error occurs
        const isDomainRestriction = 
          errMsg.toLowerCase().includes("onboarding@resend.dev") || 
          errMsg.toLowerCase().includes("sandbox") || 
          errMsg.toLowerCase().includes("verify") ||
          errMsg.toLowerCase().includes("domain") ||
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("from");

        if (isDomainRestriction && !rawFrom.includes("onboarding@resend.dev")) {
          console.log("[Email Notification] Automatic fallback triggered. Retrying with onboarding@resend.dev...");
          const fallbackFromRaw = "onboarding@resend.dev";
          const fallbackFromEmail = `DelusionAI <${fallbackFromRaw}>`;
          const fallbackSettings = adjustSandboxRecipient(to, finalHtml, finalText, finalSubject, fallbackFromRaw);

          response = await resend.emails.send({
            from: fallbackFromEmail,
            to: fallbackSettings.target,
            subject: fallbackSettings.subject,
            html: fallbackSettings.html,
            text: fallbackSettings.text,
            replyTo: "delusionai.in@gmail.com",
          });
        }
      }

      return response;
    } catch (err: any) {
      console.error("[Email Notification] Exception in resend.emails.send:", err);
      return { error: err };
    }
  }

  console.log("[Resend Service] Init: From Sender address is configured as:", getFromEmail());
  console.log("[Resend Service] Init: API Key exists:", !!process.env.RESEND_API_KEY, "Key starts with:", RESEND_KEY ? RESEND_KEY.substring(0, 5) + "..." : "none");

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

      // Trigger Oasis Discovery Report if chat concluded and user has email
      if (responseText.includes("[PROFILE_READY]") && profileDetails?.email) {
        console.log("[Maya Chat] Session concluded. Automatically dispatching Oasis Discovery Report email via Resend.");
        try {
          const rawFrom = getFromEmail();
          const fromEmail = rawFrom.includes('<') ? rawFrom : `DelusionAI <${rawFrom}>`;
          const fromDomain = rawFrom.includes('@') ? rawFrom.split('@')[1].trim().replace('>', '').toLowerCase() : 'delusionai.in';
          const sendingDomain = fromDomain === 'resend.dev' ? 'delusionai.in' : fromDomain;
          const logoUrl = `https://${sendingDomain}/delusion-logo.png`;
          const dashboardUrl = `https://${sendingDomain}/dashboard`;

          const reportProfile = emotionalProfile || {
            moodBaseline: "Reflective",
            needs: "Comforting conversation",
            traits: ["sensitive", "resilient"],
            interests: ["mindfulness", "self-care"]
          };
          
          if (resend) {
            const htmlBody = `
              <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
                  <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
                  <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Oasis Discovery Report</p>
                </div>
                <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
                <p>Dear ${profileDetails.displayName || 'Member'},</p>
                <p>Your interactive conversation session with <strong>Maya AI</strong> has been summarized. Based on your shared thoughts, Maya has prepared your customized <strong>Oasis Discovery Report</strong>:</p>
                
                <div style="background-color: #FFFBF0; border: 1px solid rgba(139,26,47,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h3 style="color: #8B1A2F; margin-top: 0;">Emotional Alignment Profile</h3>
                  <p><strong>Baseline Mood Alignment:</strong> ${reportProfile?.moodBaseline || 'Reflective'}</p>
                  <p><strong>Primary Needs:</strong> ${reportProfile?.needs || 'Comforting conversation'}</p>
                  <p><strong>Personality & Traits:</strong> ${Array.isArray(reportProfile?.traits) ? reportProfile?.traits.join(', ') : (reportProfile?.traits || 'Sensitive, Resilient')}</p>
                  <p><strong>Interests & Coping:</strong> ${Array.isArray(reportProfile?.interests) ? reportProfile?.interests.join(', ') : (reportProfile?.interests || 'Mindfulness, Self-care')}</p>
                  ${memorySummary ? `<p><strong>Maya's Insight Narrative:</strong> ${memorySummary}</p>` : ''}
                </div>

                <p style="font-style: italic; color: #625052;">"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Access Your Companion Dashboard</a>
                </div>

                <p>Warmest regards,</p>
                <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
              </div>
            `;

            const textBody = `Dear ${profileDetails.displayName || 'Member'},\n\nYour interactive conversation session with Maya AI has been summarized. Based on your shared thoughts, Maya has prepared your customized Oasis Discovery Report:\n\nEmotional Alignment Profile\n---------------------------\nBaseline Mood Alignment: ${reportProfile?.moodBaseline || 'Reflective'}\nPrimary Needs: ${reportProfile?.needs || 'Comforting conversation'}\nPersonality & Traits: ${Array.isArray(reportProfile?.traits) ? reportProfile?.traits.join(', ') : (reportProfile?.traits || 'Sensitive, Resilient')}\nInterests & Coping: ${Array.isArray(reportProfile?.interests) ? reportProfile?.interests.join(', ') : (reportProfile?.interests || 'Mindfulness, Self-care')}\n\n${memorySummary ? `Maya's Insight Narrative:\n${memorySummary}\n` : ''}\n"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."\n\nAccess your dashboard here: ${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;

            const reportResponse = await sendEmailWithFallback(
              profileDetails.email,
              "Your Oasis Discovery Report from Maya AI",
              htmlBody,
              textBody,
              rawFrom
            );

            if (reportResponse && reportResponse.error) {
              console.error("[Maya Chat] Resend API Error on discovery report:", reportResponse.error);
            } else {
              console.log("[Maya Chat] Empathy discovery mail has been successfully sent.");
            }
          } else {
            console.warn("[Maya Chat] Failed to send automated report: Resend client is not configured.");
          }
        } catch (mailErr) {
          console.error("[Maya Chat] Error during automated response mail dispatch:", mailErr);
        }
      }

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
  // API Route for Email Notifications
  app.post("/api/notify", async (req, res) => {
    console.log("[Email Notification API] Received payload:", JSON.stringify(req.body));
    const { 
      type: rawType, 
      recipientEmail, 
      senderName, 
      recipientName, 
      emotionalProfile, 
      summary,
      to,
      from,
      html: customHtml,
      text: customText,
      subject: customSubject
    } = req.body || {};
    
    const type = (rawType || "").toString().trim().toLowerCase();
    
    if (!resend) {
      console.warn("[Email Notification] Skipped: RESEND_API_KEY not configured.");
      return res.status(503).json({ error: "Email service not configured" });
    }

    try {
      let subject = (customSubject || "").toString().trim();
      let html = (customHtml || "").toString().trim();
      let text = (customText || "").toString().trim();

      const rawFrom = from || getFromEmail();
      const fromEmail = rawFrom.includes('<') ? rawFrom : `DelusionAI <${rawFrom}>`;
      const fromDomain = rawFrom.includes('@') ? rawFrom.split('@')[1].trim().replace('>', '').toLowerCase() : 'delusionai.in';
      const sendingDomain = fromDomain === 'resend.dev' ? 'delusionai.in' : fromDomain;
      const logoUrl = `https://${sendingDomain}/delusion-logo.png`;
      const dashboardUrl = `https://${sendingDomain}/dashboard`;
      const chatUrl = `https://${sendingDomain}/chat`;

      if (type === 'request') {
        subject = subject || `New Connection Request on DelusionAI from ${senderName}`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">New Connection Request</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Hello ${recipientName || 'there'},</p>
            <p><strong>${senderName}</strong> wants to connect with you on DelusionAI for mutual empathy and emotional support.</p>
            <p>Please log in to your dashboard to accept or decline this connection request.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">View Request in Dashboard</a>
            </div>

            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Hello ${recipientName || 'there'},\n\n${senderName} wants to connect with you on DelusionAI for mutual empathy and emotional support.\n\nPlease visit your dashboard to accept or decline this connection request:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'accept') {
        subject = subject || `${senderName} accepted your connection request!`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Connection Accepted</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Hello ${recipientName || 'there'},</p>
            <p>Great news! <strong>${senderName}</strong> has accepted your connection request.</p>
            <p>You can now start sharing and sending messages directly with them in your companion dashboard.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${chatUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Start Conversation</a>
            </div>

            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Hello ${recipientName || 'there'},\n\nGreat news! ${senderName} has accepted your connection request.\n\nYou can now start sharing and sending messages directly with them in your companion dashboard:\n${chatUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'waitlist_joined') {
        subject = subject || `Thank you for joining the DelusionAI Waitlist!`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Exclusive Early Access Waitlist</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${recipientName || 'Member'},</p>
            <p>Thank you for joining the exclusive <strong>DelusionAI Early Access Waitlist</strong>! We are absolutely thrilled to welcome you to our curated mental health and emotional support community.</p>
            <p>Our team is currently refining <strong>Maya AI</strong> and our deep <strong>Similar Mindsets Peer Matching</strong> systems to ensure a premium, secure, and deeply comforting experience. Since your account and waitlist file have been registered successfully, you are now fully enrolled in our VIP early access list!</p>
            <p>We will contact you at <strong>${recipientEmail || to || 'your email'}</strong> with an official invitation the moment we begin onboarding members for live interactive experiences. In the meantime, you are welcome to log in to your dashboard to view your queue and synced preference profiles.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Access Your Dashboard</a>
            </div>

            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Dear ${recipientName || 'Member'},\n\nThank you for joining the exclusive DelusionAI Early Access Waitlist! We are absolutely thrilled to welcome you to our curated mental health and emotional support community.\n\nOur team is currently refining Maya AI and our deep Similar Mindsets Peer Matching systems to ensure a premium, secure, and deeply comforting experience.\n\nWe will contact you at ${recipientEmail || to || 'your email'} with an official invitation the moment we begin onboarding members for live interactive experiences. In the meantime, you are welcome to log in to your dashboard to view your queue and synced preference profiles:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'welcome') {
        subject = subject || `Welcome to DelusionAI - Your Premium Safe Space`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Welcome to Your Safe Space</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${recipientName || 'Member'},</p>
            <p>Thank you for being a part of <strong>DelusionAI</strong>. We are here to provide a safe space and connect you with peers who understand your journey.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Get Started Now</a>
            </div>

            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Dear ${recipientName || 'Member'},\n\nThank you for being a part of DelusionAI. We are here to provide a safe space and connect you with peers who understand your journey.\n\nAccess your dashboard here:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'login') {
        subject = subject || `Welcome Back to DelusionAI - Secure Login Notification`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Secure Login Notification</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${recipientName || 'Member'},</p>
            <p>We are writing to let you know that you have successfully logged in to your <strong>DelusionAI</strong> account.</p>
            <p>We take the security of your private thoughts, conversation logs, and emotional profile very seriously. If this login was authorized by you, there is no action needed on your part. Enjoy your session and conversations with Maya AI.</p>
            <p>If you did not authorize this login, please change your credentials immediately or contact support.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
            </div>

            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Dear ${recipientName || 'Member'},\n\nWe are writing to let you know that you have successfully logged in to your DelusionAI account.\n\nWe take the security of your private thoughts, conversation logs, and emotional profile very seriously. If this login was authorized by you, there is no action needed. Enjoy your session and conversations with Maya AI.\n\nGo to your dashboard:\n${dashboardUrl}\n\nIf you did not authorize this login, please change your credentials immediately or contact support.\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'chat_report') {
        subject = subject || `Your Oasis Discovery Report from Maya AI`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Oasis Discovery Report</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${recipientName || 'Member'},</p>
            <p>Your interactive conversation session with <strong>Maya AI</strong> has been summarized. Based on your shared thoughts, Maya has prepared your customized <strong>Oasis Discovery Report</strong>:</p>
            
            <div style="background-color: #FFFBF0; border: 1px solid rgba(139,26,47,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="color: #8B1A2F; margin-top: 0;">Emotional Alignment Profile</h3>
              <p><strong>Baseline Mood Alignment:</strong> ${emotionalProfile?.moodBaseline || 'Reflective'}</p>
              <p><strong>Primary Needs:</strong> ${emotionalProfile?.needs || 'Comforting conversation'}</p>
              <p><strong>Personality & Traits:</strong> ${Array.isArray(emotionalProfile?.traits) ? emotionalProfile?.traits.join(', ') : (emotionalProfile?.traits || 'Sensitive, Resilient')}</p>
              <p><strong>Interests & Coping:</strong> ${Array.isArray(emotionalProfile?.interests) ? emotionalProfile?.interests.join(', ') : (emotionalProfile?.interests || 'Mindfulness, Self-care')}</p>
              ${summary ? `<p><strong>Maya's Insight Narrative:</strong> ${summary}</p>` : ''}
            </div>

            <p style="font-style: italic; color: #625052;">"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
            </div>
            
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
        text = text || `Dear ${recipientName || 'Member'},\n\nYour interactive conversation session with Maya AI has been summarized. Based on your shared thoughts, Maya has prepared your customized Oasis Discovery Report:\n\nEmotional Alignment Profile\n---------------------------\nBaseline Mood Alignment: ${emotionalProfile?.moodBaseline || 'Reflective'}\nPrimary Needs: ${emotionalProfile?.needs || 'Comforting conversation'}\nPersonality & Traits: ${Array.isArray(emotionalProfile?.traits) ? emotionalProfile?.traits.join(', ') : (emotionalProfile?.traits || 'Sensitive, Resilient')}\nInterests & Coping: ${Array.isArray(emotionalProfile?.interests) ? emotionalProfile?.interests.join(', ') : (emotionalProfile?.interests || 'Mindfulness, Self-care')}\n\n${summary ? `Maya's Insight Narrative:\n${summary}\n` : ''}\n"Maya is almost ready to introduce you to your customized peer matches. Let's step forward together."\n\nAccess your dashboard here:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      } else if (type === 'auth_error_alert') {
        subject = subject || `⚠️ DelusionAI Auth Error Alert - System Logs`;
        html = html || `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #8B1A2F; font-weight: bold; margin-top: 5px;">Auth Error Security Alert</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear Administrator,</p>
            <p>An authentication error occurred on <strong>DelusionAI</strong>. To protect user privacy, the technical error has been hidden from the public interface and is forwarded here:</p>
            
            <div style="background-color: #FFFBF0; border: 1px solid rgba(139,26,47,0.1); padding: 20px; border-radius: 12px; margin: 20px 0; font-family: monospace; font-size: 13px;">
              <p><strong>Attempted User Email:</strong> ${recipientEmail || 'Unknown/Google Sign-In'}</p>
              <p><strong>Error Message:</strong> ${summary || 'No detailed message'}</p>
              <p><strong>Error Code:</strong> ${senderName || 'N/A'}</p>
              <p><strong>User Agent:</strong> ${recipientName || 'N/A'}</p>
              <p><strong>Domain:</strong> ${emotionalProfile?.domain || 'N/A'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>

            <p>Please review your Firebase Console settings if this is an Authorized Domain or third-party cookie issue.</p>
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Security Engine</p>
          </div>
        `;
        text = text || `DelusionAI Auth Error Alert\n\nAttempted Email: ${recipientEmail}\nError Message: ${summary}\nError Code: ${senderName}\nUser Agent: ${recipientName}\nDomain: ${emotionalProfile?.domain}`;
      }

      // Parse emails / recipients list
      let recipients: string[] = [];
      const rawTo = to || recipientEmail;
      
      if (Array.isArray(rawTo)) {
        recipients = rawTo.map(e => (e || "").toString().trim()).filter(Boolean);
      } else if (rawTo) {
        recipients = rawTo.toString().split(",").map((e: string) => e.trim()).filter(Boolean);
      }

      // If auth error, send to the administrator email
      if (type === 'auth_error_alert') {
        recipients = ['delusionai.in@gmail.com'];
      }

      // ABSOLUTE PROTECTION: Ensure subject, html, and text are NEVER blank strings
      if (!subject) {
        subject = `Message from DelusionAI`;
      }
      if (!html) {
        html = `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${logoUrl}" alt="DelusionAI Logo" style="width: 130px; height: 130px; border-radius: 50%; border: 2px solid #8B1A2F; margin: 0 auto 15px auto; display: block; object-fit: cover;" referrerPolicy="no-referrer" />
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Hello,</p>
            <p>Thank you for being part of the <strong>DelusionAI</strong> community. We are here to support your mental health and provide a premium, safe space for your emotional well-being.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Access Your Dashboard</a>
            </div>
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
          </div>
        `;
      }
      if (!text) {
        text = `Hello,\n\nThank you for being part of the DelusionAI community. Access your dashboard here:\n${dashboardUrl}\n\nWarmest regards,\nThe DelusionAI Team`;
      }

      if (recipients.length === 0) {
        console.warn("[Email Notification] Skipped: No valid recipients found.");
        return res.status(400).json({ error: "No valid recipient email provided" });
      }

      console.log(`[Email Notification] Starting dispatch of ${recipients.length} email(s) via Resend. From: "${fromEmail}"`);
      
      const results = [];
      for (const email of recipients) {
        try {
          const response: any = await sendEmailWithFallback(
            email,
            subject,
            html,
            text,
            rawFrom
          );
          
          if (response && response.error) {
            results.push({ email, status: "failed", error: response.error.message || response.error });
          } else {
            results.push({ email, status: "success", id: response?.data?.id || "sent" });
          }
        } catch (err: any) {
          console.error(`[Email Notification] Exception sending email to ${email}:`, err);
          results.push({ email, status: "failed", error: err.message || err });
        }
      }

      const successCount = results.filter(r => r.status === "success").length;
      const failedCount = results.length - successCount;

      console.log(`[Email Notification] Bulk send complete. Success: ${successCount}, Failed: ${failedCount}`);

      if (failedCount === results.length) {
        return res.status(500).json({ 
          error: "All email dispatches failed", 
          details: results 
        });
      }

      res.json({ 
        status: "ok", 
        processed: results.length,
        successCount,
        failedCount,
        details: results 
      });
    } catch (error: any) {
      console.error("[Email Notification] General Error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
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
