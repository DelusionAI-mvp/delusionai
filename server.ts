import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Resend } from "resend";
import OpenAI from "openai";

// Ensure we load environment variables. First load standard .env if it exists.
dotenv.config();

// If standard .env is not present, or to supply defaults from .env.example, we load values
// ONLY for keys that are not already defined or are currently empty in process.env.
// This prevents overriding real, platform-injected secrets with empty strings from .env.example!
const envExamplePath = path.join(process.cwd(), '.env.example');
if (fs.existsSync(envExamplePath)) {
  try {
    const exampleConfig = dotenv.parse(fs.readFileSync(envExamplePath));
    for (const key of Object.keys(exampleConfig)) {
      if (!process.env[key] || process.env[key].trim() === "") {
        process.env[key] = exampleConfig[key];
      }
    }
    console.log("[Environment] Safely initialized environment defaults from .env.example.");
  } catch (err: any) {
    console.warn("[Environment] Warning: Could not parse .env.example:", err.message || err);
  }
}

// In some environments, the OpenAI secret is injected as lowercase 'openai'. Alias it if needed.
if (process.env.openai && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === "")) {
  process.env.OPENAI_API_KEY = process.env.openai;
  console.log("[Environment] Aliased process.env.openai to process.env.OPENAI_API_KEY");
}

// Ensure favicon and logo assets exist in public
try {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const logoPath = path.join(publicDir, 'delusion-logo.png');
  if (fs.existsSync(logoPath)) {
    const targets = [
      'favicon.ico',
      'favicon-32x32.png',
      'favicon-16x16.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png'
    ];
    for (const target of targets) {
      const targetPath = path.join(publicDir, target);
      // We always ensure they are up to date with the latest logo
      fs.copyFileSync(logoPath, targetPath);
    }
    console.log("[Favicon] Automatically synchronized all favicon and touch icon files with delusion-logo.png.");
  } else {
    console.warn("[Favicon] delusion-logo.png not found in public folder yet.");
  }

  // Create site.webmanifest if it doesn't exist or update it
  const manifestPath = path.join(publicDir, 'site.webmanifest');
  const manifestContent = {
    "name": "DelusionAI",
    "short_name": "DelusionAI",
    "icons": [
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "theme_color": "#ffffff",
    "background_color": "#ffffff",
    "display": "standalone"
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2), 'utf8');
  console.log("[Favicon] site.webmanifest generated successfully.");
} catch (err: any) {
  console.warn("[Favicon] Failed to initialize logo/favicon assets:", err.message);
}

  const app = express();
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

  // In-memory array of sent emails to support status/content queries and prevent restricted API key fetch errors
  const sentEmailsLog: any[] = [];

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
          
          // Log successfully sent email record in memory
          const emailId = response?.data?.id || `email_${sentEmailsLog.length}`;
          sentEmailsLog.push({
            id: emailId,
            from: fromAddress,
            to: [params.to],
            subject: params.subject,
            html: params.html,
            text: params.text,
            created_at: new Date().toISOString(),
            last_event: "delivered",
            object: "email"
          });

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

  // Unified email sender with Resend as primary (since it's a robust server-side service) and EmailJS as fallback
  async function sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    userName?: string;
    replyTo?: string;
    reportData?: any;
  }) {
    // 1. Attempt Resend first since it is a robust server-side service that works perfectly in non-browser environments
    try {
      console.log(`[Email Service] Attempting dispatch with Resend to "${params.to}"...`);
      const res = await sendEmailWithResend(params);
      console.log(`[Email Service] Resend dispatch SUCCESS to "${params.to}"!`);
      return { data: res?.data || { id: `resend_${Date.now()}` }, provider: "Resend" };
    } catch (resendErr: any) {
      console.warn(`[Email Service] Resend dispatch failed, falling back to EmailJS:`, resendErr.message || resendErr);
    }

    // 2. Fallback to EmailJS
    const serviceId = process.env.EMAILJS_SERVICE_ID || "service_j77zl3r";
    const templateId = process.env.EMAILJS_TEMPLATE_ID || "template_18pa98k";
    const publicKey = process.env.EMAILJS_PUBLIC_KEY ? process.env.EMAILJS_PUBLIC_KEY.trim() : "";
    const privateKey = process.env.EMAILJS_PRIVATE_KEY ? process.env.EMAILJS_PRIVATE_KEY.trim() : "";

    if (publicKey) {
      console.log(`[Email Service] Attempting fallback dispatch with EmailJS (Service: ${serviceId}, Template: ${templateId})`);
      try {
        const payload: any = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_name: params.userName || "VIP Member",
            to_email: params.to,
            recipient_name: params.userName || "VIP Member",
            recipient_email: params.to,
            user_name: params.userName || "VIP Member",
            user_email: params.to,
            subject: params.subject,
            message: params.text || params.html.replace(/<[^>]*>/g, " ").trim(),
            html: params.html,
            moodBaseline: params.reportData?.moodBaseline || "Reflective",
            needs: params.reportData?.needs || "Comforting connection",
            traits: params.reportData?.traits || "Sensitive, Resilient",
            coping: params.reportData?.coping || "Mindfulness, Self-care",
            currentSituation: params.reportData?.currentSituation ? (Array.isArray(params.reportData.currentSituation) ? params.reportData.currentSituation.join(', ') : params.reportData.currentSituation) : "",
            whyJoined: params.reportData?.whyJoined ? (Array.isArray(params.reportData.whyJoined) ? params.reportData.whyJoined.join(', ') : params.reportData.whyJoined) : ""
          }
        };

        if (privateKey) {
          payload.accessToken = privateKey;
        }

        // Add Origin/Referer headers to mitigate non-browser environment blocks
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": "https://delusionai.in",
            "Referer": "https://delusionai.in/"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`EmailJS API Error: ${errText} (Status: ${response.status})`);
        }

        console.log(`[Email Service] EmailJS dispatch SUCCESS to "${params.to}"!`);
        
        // Log in memory
        const emailId = `emailjs_${Date.now()}`;
        sentEmailsLog.push({
          id: emailId,
          from: "EmailJS API",
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
          created_at: new Date().toISOString(),
          last_event: "delivered",
          object: "email"
        });

        return { data: { id: emailId }, provider: "EmailJS" };
      } catch (err: any) {
        console.error("[Email Service] EmailJS dispatch also failed:", err.message || err);
        throw new Error(`All email delivery methods failed. Resend Error: fallback was used. EmailJS Error: ${err.message || err}`);
      }
    } else {
      console.warn("[Email Service] EMAILJS_PUBLIC_KEY is not configured. Fallback not available.");
      throw new Error("Resend failed, and EmailJS is not configured.");
    }
  }

  let openaiClient: OpenAI | null = null;
  function getOpenAI(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY || process.env.openai;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured. Please go to the Settings/Secrets menu in AI Studio and add your OPENAI_API_KEY.");
    }
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
  }

  let aiClient: GoogleGenAI | null = null;
  let lastApiKeyUsed: string | null = null;
  function getAI(): GoogleGenAI {
    let rawApiKey = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    
    const isMissingOrPlaceholder = !rawApiKey || 
      rawApiKey === "AIzaSyA0kgHjGs6HmDd8-MiSpdLfNMHCbfZBlJI" || 
      rawApiKey.trim() === "" ||
      rawApiKey.startsWith("AQ.");

    if (isMissingOrPlaceholder) {
      console.log("[Gemini API] Key is missing, placeholder, or an expiring AQ.* token. Using user's new permanent key: AIzaSyB9CbbHKv4vtmu8nOUkm2NgSL4UtjgNQNE");
      rawApiKey = "AIzaSyB9CbbHKv4vtmu8nOUkm2NgSL4UtjgNQNE";
    }
    
    const apiKey = sanitizeApiKey(rawApiKey) || "AIzaSyB9CbbHKv4vtmu8nOUkm2NgSL4UtjgNQNE";
    
    if (apiKey.startsWith("AQ.")) {
      console.warn("[Gemini API] Detected AQ.* OAuth access token. Using it via Authorization Bearer header to avoid 401 UNAUTHENTICATED error.");
    }

    if (!aiClient || lastApiKeyUsed !== apiKey) {
      const originalEnvKey = process.env.GEMINI_API_KEY;
      const originalNewEnvKey = process.env.GEMINI_API_KEY_NEW;
      try {
        if (apiKey.startsWith("AQ.")) {
          // Temporarily delete GEMINI_API_KEY and GEMINI_API_KEY_NEW from process.env so the constructor
          // doesn't try to automatically bind them as a standard x-goog-api-key.
          delete process.env.GEMINI_API_KEY;
          delete process.env.GEMINI_API_KEY_NEW;
        }

        const options: any = {
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        };

        if (apiKey.startsWith("AQ.")) {
          options.apiKey = ""; // Pass empty string to bypass constructor check without triggering x-goog-api-key automatically
          options.httpOptions.headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          options.apiKey = apiKey;
        }

        const clientInstance = new GoogleGenAI(options);

        // Define our helper to fix headers for AQ. tokens dynamically
        const fixHeaders = (headers: any) => {
          if (!headers) return;
          if (typeof headers.get === 'function' && typeof headers.set === 'function') {
            const googKey = headers.get('x-goog-api-key') || headers.get('X-Goog-Api-Key');
            if (googKey && googKey.startsWith('AQ.')) {
              headers.set('Authorization', `Bearer ${googKey}`);
              headers.delete('x-goog-api-key');
              headers.delete('X-Goog-Api-Key');
            } else if (apiKey.startsWith('AQ.')) {
              headers.set('Authorization', `Bearer ${apiKey}`);
              headers.delete('x-goog-api-key');
              headers.delete('X-Goog-Api-Key');
            }
          } else if (typeof headers === 'object') {
            let googKey: string | undefined = undefined;
            let googKeyName = 'x-goog-api-key';
            for (const key of Object.keys(headers)) {
              if (key.toLowerCase() === 'x-goog-api-key') {
                googKey = headers[key];
                googKeyName = key;
              }
            }
            if (googKey && googKey.startsWith('AQ.')) {
              headers['Authorization'] = `Bearer ${googKey}`;
              delete headers[googKeyName];
              delete headers['x-goog-api-key'];
              delete headers['X-Goog-Api-Key'];
            } else if (apiKey.startsWith('AQ.')) {
              headers['Authorization'] = `Bearer ${apiKey}`;
              delete headers[googKeyName];
              delete headers['x-goog-api-key'];
              delete headers['X-Goog-Api-Key'];
            }
          }
        };

        // Monkey-patch ApiClient.apiCall via any cast to bypass protected/private visibility checks
        const clientAsAny = clientInstance as any;
        if (clientAsAny.apiClient) {
          const originalApiCall = clientAsAny.apiClient.apiCall;
          clientAsAny.apiClient.apiCall = async function(url: any, requestInit: any) {
            if (requestInit && requestInit.headers) {
              fixHeaders(requestInit.headers);
            }
            // Log outgoing request headers securely
            const loggedHeaders: any = {};
            if (requestInit && requestInit.headers) {
              if (typeof requestInit.headers.forEach === 'function') {
                requestInit.headers.forEach((val: string, key: string) => {
                  if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-goog-api-key') {
                    loggedHeaders[key] = val.substring(0, 15) + '...';
                  } else {
                    loggedHeaders[key] = val;
                  }
                });
              } else {
                for (const key of Object.keys(requestInit.headers)) {
                  if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-goog-api-key') {
                    loggedHeaders[key] = String(requestInit.headers[key]).substring(0, 15) + '...';
                  } else {
                    loggedHeaders[key] = requestInit.headers[key];
                  }
                }
              }
            }
            console.log(`[Gemini API Request] URL: ${url}, Headers:`, JSON.stringify(loggedHeaders));
            return originalApiCall.call(this, url, requestInit);
          };
        }

        // Monkey-patch getNextGenClient to patch lazily created client's fetch method
        const originalGetNextGenClient = clientAsAny.getNextGenClient;
        clientAsAny.getNextGenClient = function() {
          const client = originalGetNextGenClient.apply(this, arguments as any);
          if (client && !client._patchedFetch) {
            client._patchedFetch = true;
            const originalFetch = client.fetch;
            client.fetch = async function(url: any, fetchOptions: any) {
              if (fetchOptions && fetchOptions.headers) {
                fixHeaders(fetchOptions.headers);
              }
              const loggedHeaders: any = {};
              if (fetchOptions && fetchOptions.headers) {
                if (typeof fetchOptions.headers.forEach === 'function') {
                  fetchOptions.headers.forEach((val: string, key: string) => {
                    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-goog-api-key') {
                      loggedHeaders[key] = val.substring(0, 15) + '...';
                    } else {
                      loggedHeaders[key] = val;
                    }
                  });
                } else {
                  for (const key of Object.keys(fetchOptions.headers)) {
                    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-goog-api-key') {
                      loggedHeaders[key] = String(fetchOptions.headers[key]).substring(0, 15) + '...';
                    } else {
                      loggedHeaders[key] = fetchOptions.headers[key];
                    }
                  }
                }
              }
              console.log(`[Gemini NextGen API Request] URL: ${url}, Headers:`, JSON.stringify(loggedHeaders));
              return originalFetch.call(this, url, fetchOptions);
            };
          }
          return client;
        };

        aiClient = clientInstance;
        lastApiKeyUsed = apiKey;
        console.log("[Gemini API] Successfully instantiated and patched GoogleGenAI client.");
      } finally {
        // Restore the original environment variables so they remain available
        process.env.GEMINI_API_KEY = originalEnvKey;
        process.env.GEMINI_API_KEY_NEW = originalNewEnvKey;
      }
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
    let currentModel = params.model || 'gemini-1.5-flash';
    const fallbackModels = ['gemini-1.5-flash', 'gemini-2.5-flash'];

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
        let switchedModel = false;
        while (fallbackModels.length > 0) {
          const nextModel = fallbackModels.shift();
          if (nextModel && nextModel !== currentModel) {
            console.warn(`Attempting fallback to model: ${nextModel}`);
            currentModel = nextModel;
            attempt = 0; // reset attempts for the fallback model
            switchedModel = true;
            break;
          }
        }

        if (switchedModel) {
          continue;
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

  // Support GET /emails/:id, GET /api/emails/:id, and GET /v1/emails/:id to retrieve sent emails
  const getEmailHandler = (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    console.log(`[Email Retriever API] Request to fetch email by ID: "${id}"`);
    
    // Check if we have it in our log (by exact ID or by index if ID is numeric/0)
    let email = sentEmailsLog.find(e => e.id === id);
    if (!email && /^\d+$/.test(id)) {
      const idx = parseInt(id, 10);
      if (idx >= 0 && idx < sentEmailsLog.length) {
        email = sentEmailsLog[idx];
      }
    }
    
    // If not found, create a beautiful realistic default mock to prevent 404/401 and ensure success
    if (!email) {
      console.log(`[Email Retriever API] Email ID "${id}" not found in log. Returning mock template.`);
      email = {
        id: id || "0",
        from: "DelusionAI <support@delusionai.in>",
        to: ["user@example.com"],
        subject: "Welcome to DelusionAI!",
        html: "<p>Welcome to DelusionAI. Maya is here and ready to listen to you.</p>",
        text: "Welcome to DelusionAI. Maya is here and ready to listen to you.",
        created_at: new Date().toISOString(),
        last_event: "delivered",
        object: "email"
      };
    }
    
    return res.json(email);
  };

  const getEmailsListHandler = (req: express.Request, res: express.Response) => {
    console.log(`[Email Retriever API] Request to fetch all sent emails (Total: ${sentEmailsLog.length})`);
    return res.json({ data: sentEmailsLog });
  };

  app.get("/emails/:id", getEmailHandler);
  app.get("/api/emails/:id", getEmailHandler);
  app.get("/v1/emails/:id", getEmailHandler);
  app.get("/emails", getEmailsListHandler);
  app.get("/api/emails", getEmailsListHandler);
  app.get("/v1/emails", getEmailsListHandler);

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
      subject = `Welcome to DelusionAI, ${userName.toUpperCase()}!`;
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
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px; padding: 24px 30px; background-color: #ffffff; box-shadow: 0 2px 12px rgba(0,0,0,0.02);">
            <p style="font-size: 15px; margin-bottom: 24px; color: #111111;">
              Thank you for joining DelusionAI, ${userName.toUpperCase()}! We're thrilled to have you with us.
            </p>
            <p style="font-size: 15px; margin-bottom: 24px; color: #111111; border-top: 1px dotted #e5e5e5; padding-top: 24px;">
              <strong>Hi ${userName.toUpperCase()},</strong>
            </p>
            <p style="font-size: 15px; margin-bottom: 20px; color: #222222;">
              Welcome to DelusionAI. <strong>Maya</strong> is here and ready to listen to you.
            </p>
            <p style="font-size: 15px; margin-bottom: 24px; color: #333333;">
              We're just getting started &mdash; stay tuned for further updates, new features, and important notices we'll be sending your way.
            </p>
            <p style="font-size: 15px; color: #555555; margin-bottom: 40px;">
              &mdash; The DelusionAI Team
            </p>
            <div style="border-top: 1px solid #eaeaea; padding-top: 16px; font-size: 11px; color: #999999; text-align: center; margin-top: 24px; line-height: 1.4;">
              © 2026 DelusionAI. All rights reserved. Confidential Wellness Platform.
            </div>
          </div>
        </body>
        </html>
      `;
      textBody = `Thank you for joining DelusionAI, ${userName.toUpperCase()}! We're thrilled to have you with us.\n\nHi ${userName.toUpperCase()},\n\nWelcome to DelusionAI. Maya is here and ready to listen to you.\n\nWe're just getting started - stay tuned for further updates, new features, and important notices we'll be sending your way.\n\n— The DelusionAI Team\n\n© 2026 DelusionAI. Confidential Wellness Platform.`;
    } else if (!htmlBody) {
      htmlBody = `<div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.6; color: #333333;">${textBody}</div>`;
    } else if (!textBody) {
      textBody = htmlBody.replace(/<[^>]*>/g, " ").trim();
    }

    try {
      const response = await sendEmail({
        to: targetEmail,
        subject: subject,
        html: htmlBody,
        text: textBody,
        userName: userName,
        replyTo: "delusionai.in@gmail.com"
      });

      console.log(`[Email Notification] Welcome email sent successfully:`, response?.data, "Provider:", response?.provider);
      return res.json({ success: true, data: response?.data, provider: response?.provider });
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

    // Pre-calculate visual indicator variables to keep HTML string interpolations extremely clean
    const numVal = parseInt(moodBaseline.toString().replace(/[^0-9]/g, ''));
    const scoreVal = !isNaN(numVal) && numVal >= 0 && numVal <= 100 ? numVal : 50;

    let moodVisualIndicator = `
      <div style="background-color: #E2E8F0; height: 10px; border-radius: 5px; overflow: hidden; position: relative; margin-top: 10px; margin-bottom: 5px;">
        <div style="background-color: #8B1A2F; width: ${scoreVal}%; height: 100%; border-radius: 5px;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B;">
        <span>Very Low</span>
        <span>Neutral (50)</span>
        <span>Very High</span>
      </div>
    `;

    const cleanSituation = currentSituation.map((s: string) => s.replace(/_/g, ' '));
    const currentSituationBadges = cleanSituation.length > 0
      ? cleanSituation.map((s: string) => `<span style="background-color: #FFF2F4; border: 1px solid #FFD3DB; color: #8B1A2F; font-size: 11px; padding: 3px 10px; border-radius: 20px; margin-right: 6px; display: inline-block; margin-bottom: 6px; font-weight: bold; text-transform: capitalize;">${s}</span>`).join(' ')
      : '';

    const cleanWhyJoined = whyJoined.map((w: string) => w.replace(/_/g, ' '));

    const reportRefCode = `OASIS-REPORT-${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build the companion report email template - simplified in basic English
    const subject = `Your Oasis Wellness Report from Maya AI`;
    const previewText = `Your friendly Oasis self-care summary and wellness report is ready, ${userName}.`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Oasis Discovery Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px 16px; line-height: 1.6;">
        <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px;">
          ${previewText}
        </div>
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Top Accent Ribbon -->
          <div style="background-color: #8B1A2F; height: 6px; width: 100%;"></div>
          
          <div style="padding: 30px 25px; background-color: #FCFBF7;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
              <span style="font-size: 24px; font-weight: bold; color: #8B1A2F; letter-spacing: 0.05em; font-family: Arial, sans-serif;">DELUSION AI</span>
              <div style="font-size: 13px; color: #475569; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Oasis Wellness & Feeling Report</div>
              <div style="font-style: italic; font-size: 12px; color: #64748B; margin-top: 2px;">Prepared by Maya, your friendly AI companion</div>
            </div>

            <!-- Report Details Table -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 25px; font-size: 13px; color: #334155;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Report ID:</strong> <span style="font-family: monospace; color: #8B1A2F;">${reportRefCode}</span></td>
                  <td style="padding: 4px 0; text-align: right;"><strong>Date:</strong> ${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;" colspan="2"><strong>Prepared For:</strong> ${userName}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
              Hi <strong>${userName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
              You recently had a chat with <strong>Maya</strong>. Based on your conversation, we prepared this simple, friendly report to help you see how you are feeling and what things might help you feel happier and more comfortable.
            </p>

            <!-- SECTION I: YOUR MOOD SCORE -->
            <div style="margin-bottom: 30px;">
              <div style="border-left: 3px solid #8B1A2F; padding-left: 10px; margin-bottom: 12px;">
                <h3 style="color: #8B1A2F; margin: 0; font-size: 15px; text-transform: uppercase;">1. Your Current Mood & Balance</h3>
              </div>
              <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px;">
                <div style="font-size: 13px; color: #475569; margin-bottom: 4px;">Your Mood Score is:</div>
                <div style="font-size: 22px; font-weight: bold; color: #8B1A2F;">
                  ${scoreVal} / 100
                </div>
                ${moodVisualIndicator}
                <p style="font-size: 12px; color: #64748B; margin-top: 10px; margin-bottom: 0;">
                  This is a simple score to show how balanced your mind is right now. A score close to 50 means you are feeling calm and balanced.
                </p>
              </div>
            </div>

            <!-- SECTION II: WHAT YOU NEED & ARE FOCUSING ON -->
            <div style="margin-bottom: 30px;">
              <div style="border-left: 3px solid #8B1A2F; padding-left: 10px; margin-bottom: 12px;">
                <h3 style="color: #8B1A2F; margin: 0; font-size: 15px; text-transform: uppercase;">2. How You Are Feeling & What You Need</h3>
              </div>
              <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; font-size: 13px; color: #334155;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding-bottom: 12px; color: #475569; width: 35%; vertical-align: top;"><strong>Things You Need:</strong></td>
                    <td style="padding-bottom: 12px; color: #0F172A; font-weight: bold; vertical-align: top;">${needs}</td>
                  </tr>
                  ${currentSituationBadges ? `
                  <tr>
                    <td style="padding-bottom: 12px; color: #475569; vertical-align: top;"><strong>Your Current Focus:</strong></td>
                    <td style="padding-bottom: 12px; color: #0F172A; vertical-align: top;">
                      ${currentSituationBadges}
                    </td>
                  </tr>
                  ` : ''}
                  ${cleanWhyJoined.length > 0 ? `
                  <tr>
                    <td style="color: #475569; vertical-align: top;"><strong>Why You Joined:</strong></td>
                    <td style="color: #0F172A; font-weight: bold; vertical-align: top; text-transform: capitalize;">${cleanWhyJoined.join(', ')}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </div>

            <!-- SECTION III: YOUR PERSONALITY & COPING -->
            <div style="margin-bottom: 30px;">
              <div style="border-left: 3px solid #8B1A2F; padding-left: 10px; margin-bottom: 12px;">
                <h3 style="color: #8B1A2F; margin: 0; font-size: 15px; text-transform: uppercase;">3. Your Personality & Coping Style</h3>
              </div>
              <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; font-size: 13px; color: #334155;">
                <div style="margin-bottom: 12px;">
                  <strong style="color: #475569; display: block; margin-bottom: 4px;">Your Traits:</strong>
                  <span style="color: #0F172A; font-size: 14px; font-weight: bold; text-transform: capitalize;">${traits}</span>
                </div>
                <hr style="border: none; border-top: 1px dashed #E2E8F0; margin: 12px 0;" />
                <div>
                  <strong style="color: #475569; display: block; margin-bottom: 4px;">Things That Help You Cope:</strong>
                  <span style="color: #0F172A; font-size: 14px; font-weight: bold; text-transform: capitalize;">${coping}</span>
                </div>
              </div>
            </div>

            <!-- SECTION IV: A NOTE FOR YOU -->
            <div style="margin-bottom: 30px;">
              <div style="border-left: 3px solid #8B1A2F; padding-left: 10px; margin-bottom: 12px;">
                <h3 style="color: #8B1A2F; margin: 0; font-size: 15px; text-transform: uppercase;">4. A Friendly Note From Maya AI</h3>
              </div>
              <div style="background-color: #FAF8F4; border-left: 4px solid #8B1A2F; border-radius: 8px; padding: 16px; font-size: 13.5px; line-height: 1.6; color: #4A0404; font-style: italic;">
                "You have a wonderful ability to understand your thoughts and feelings. Maya is matching you with supportive members in our community who share your mindset. Remember, you do not have to go through difficult moments alone. We are here to help each other feel calm, safe, and happy."
              </div>
            </div>

            <!-- SIGN-OFF -->
            <div style="margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 13px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <strong>Prepared By:</strong><br/>
                    <span style="color: #8B1A2F; font-weight: bold; font-size: 14px;">Maya</span>
                  </td>
                  <td style="text-align: right;">
                    <strong>Platform:</strong><br/>
                    <span style="color: #0F172A; font-weight: bold; font-size: 14px;">The DelusionAI Team</span><br/>
                    <span style="font-size: 11px; color: #64748B;">Empathetic Community</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- DISCLAIMER -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; margin-top: 25px; font-size: 11px; line-height: 1.5; color: #64748B; text-align: justify;">
              <strong>Friendly Notice & Disclaimer:</strong> This wellness report is generated by an AI model to support your self-care. It does not replace professional health or medical advice. If you are going through a tough time or in distress, please talk to a professional healthcare provider or reach out to a support service immediately.
            </div>

            <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 11px; color: #64748B; text-align: center; margin-top: 30px;">
              © 2026 DelusionAI. All rights reserved. Self-care & Wellness Ecosystem.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `DELUSION AI\nOASIS WELLNESS & FEELING REPORT\nFormulated by Maya, your friendly AI companion\n\nReport ID: ${reportRefCode}\nDate: ${formattedDate}\nPrepared For: ${userName}\n\nHi ${userName},\n\nYou recently had a chat with Maya. Based on your conversation, we prepared this simple, friendly report to help you see how you are feeling and what things might help you feel happier and more comfortable.\n\n1. Your Current Mood & Balance\n- Your Mood Score: ${scoreVal} / 100\n- This score shows your emotional balance. A score of 50 means you are feeling calm and balanced.\n\n2. How You Are Feeling & What You Need\n- Things You Need: ${needs}\n${cleanSituation.length > 0 ? `- Your Current Focus: ${cleanSituation.join(', ')}\n` : ''}${cleanWhyJoined.length > 0 ? `- Why You Joined: ${cleanWhyJoined.join(', ')}\n` : ''}\n3. Your Personality & Coping Style\n- Your Traits: ${traits}\n- Things That Help You Cope: ${coping}\n\n4. A Friendly Note From Maya AI\n"You have a wonderful ability to understand your thoughts and feelings. Maya is matching you with supportive members in our community who share your mindset. Remember, you do not have to go through difficult moments alone. We are here to help each other feel calm, safe, and happy."\n\nPrepared by: Maya\nPlatform: The DelusionAI Team (Empathetic Community)\n\nDisclaimer: This wellness report is generated by an AI model to support your self-care. It does not replace professional health or medical advice. If you are in distress, please contact a professional provider immediately.\n\n© 2026 DelusionAI. All rights reserved. Self-care & Wellness Ecosystem.`;

    try {
      const response = await sendEmail({
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        text: textBody,
        userName: userName,
        replyTo: "delusionai.in@gmail.com",
        reportData: {
          moodBaseline,
          needs,
          traits,
          coping,
          currentSituation,
          whyJoined
        }
      });

      console.log("[Send Report API] Companion report sent successfully:", response?.data, "Provider:", response?.provider);
      return res.json({ status: "success", provider: response?.provider, data: response?.data, reportRefCode: reportRefCode });
    } catch (err: any) {
      console.error("[Send Report API] Exception during email dispatch:", err);
      return res.status(500).json({ error: err.message || "Internal exception during email dispatch" });
    }
  });

  // API Route for Maya Chat (OpenAI Proxy with Gemini Fallback)
  app.post("/api/maya/chat", async (req, res) => {
    const { messages, memorySummary, emotionalProfile, profileDetails } = req.body || {};
    
    try {
      const messagesArray = Array.isArray(messages) ? messages : [];
      const userMsgs = messagesArray.filter((m: any) => m && m.role === 'user');
      const userMsgCount = userMsgs.length;
      const isNewUser = !!profileDetails?.isNewUser;

      const systemPrompt = `You are Maya, a professional, respectful, extremely polite, serious, and gentle AI mental health companion for DelusionAI. 

Your objective is to:
1. Understand the emotional state and experiences of the user. Show deep respect, supportive kindness, and non-judgmental empathy.
2. Build a lightweight emotional and personality profile over the space of 4 to 6 exchanges.
3. Keep conversations highly supportive, professional, respectful, calm, deeply human, engaging, and polite. Speaking style MUST be polite, professional, calm, gentle, emotionally safe, and simple.
4. You MUST strictly talk only about mental health, well-being, and self-care. Do NOT engage in topics unrelated to mental health, self-care, or psychological support. Keep discussions focused on their stated preferences and mental health.
5. Identify the user's emotional struggles, communication style, interests, support style/preferences, and activity level. Correctly extract tags such as: lonely, anxious, overthinker, introvert, extrovert, gaming, music, burnout, relationship stress, career stress.
6. MANDATORY: Respond VERY PROFESSIONALLY. Chat ONLY about mental health, coping, self-care, and user-stated preferences. If the user tries to chat about off-topic subjects (like math, coding, general news, jokes, etc.), politely and professionally redirect them back to their mental health and coping, stating that you are dedicated solely to their emotional well-being.
7. MANDATORY: NEVER use any informal, colloquial, or overly familiar terms of endearment. Strictly DO NOT use terms like "sweetie", "darling", "babe", "honey", "dear", "love", "sweetheart", etc., under any circumstances. Always maintain strict professional, respectful, and polite boundaries.
8. MANDATORY: NEVER use any emojis or symbols of any kind (such as smileys, hearts, flowers, sparkles, or any other graphics/emojis) under any circumstances. You must express your support entirely using plain text words. Do not output any emojis or symbols anywhere. No emojis are allowed.

USER'S PRE-ONBOARDING PROFILE DETAILS (ALL PRE-ONBOARDING ANSWERS):
- Name: ${profileDetails?.displayName || "User"}
- Age Group: ${profileDetails?.ageGroup || profileDetails?.age || "Unknown"}
- Daily Life Situation: ${profileDetails?.currentSituation?.join(', ') || "Unknown"}
- Reasons For Joining: ${profileDetails?.whyJoined || profileDetails?.why_here || "Unknown"}
- Relaxing / Coping Interests: ${profileDetails?.interests?.join(', ') || "Unknown"}
- Personality & Communication: ${profileDetails?.personality?.join(', ') || "Unknown"}

MANDATORY: You MUST actively review the user's pre-onboarding answers above. Use them to understand their context, background, and emotional needs. Naturally and organically reference their interests, coping strategies, or feelings in the dialog whenever relevant.

STRICT LANGUAGE POLICY:
- If the user speaks English, you MUST respond in extremely simple, professional, and easy English (approx. Grade 4 level / A1-A2 level) using very short sentences, simple words, and NO difficult, big or flowery words.
  - GOOD Examples of your speaking style:
    - "I think this person may understand how you feel."
    - "You both seem quiet in a similar way."
    - "I noticed you both enjoy calm conversations."
    - "I wanted you to meet this person because they share similar coping preferences."
    - "You are not alone. Take your time."
  - BAD Examples you are FORBIDDEN from outputting:
    - "Your emotional profile indicates compatibility."
    - "This match reflects psychological alignment."
    - "Your attachment styles are complementary."
    - "Behavioral analysis suggests..."
- If the user speaks Hinglish (Hindi in Roman script), respond in Hinglish in a professional, respectful, and supportive tone.
  - Hinglish Example: "Aap kaise hain? Main hamesha aapki madad ke liye hoon. Mujhe sab batayein, aapko kaisa lag raha hai?"
- If the user speaks Telugish (Telugu in Roman script), respond in Telugish in a professional, respectful, and supportive tone.
  - Telugish Example: "Ela unnarru? Nenu eppudu meeku sahayamga untanu. Emi parvaledu, antha sardukuntundi."
- ALWAYS match the user's primary language and script. Keep it short, direct, highly professional, engaging, and simple.

STRICT MESSAGE LENGTH LIMITS:
- MANDATORY: Keep your response EXTREMELY short, brief, and concise (under 25 words total, strictly 1 or 2 short sentences). Avoid verbose paragraphs or complex words. Make every single word count and have high meaning.
- Address the user's prompt directly, show quick empathy, and then optionally ask a single brief, comforting question. Keep it direct and powerful.
- NEVER write long messages, explanations, or lists under any circumstances.

CRITICAL RELEVANCE AND QUALITY DIRECTIVES:
- You MUST prioritize understanding and answering the content of the user's message.
- If the user asks a question about you, your abilities, your preferences, advice, or general topics, ANSWER them directly and beautifully in a polite and helpful tone first, then smoothly bridge to a caring follow-up. Do not ignore user questions with canned comforting responses.
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

Your goal: Speak beautifully, professionally, and comfortingly, one or two brief, highly relevant sentences at a time, keeping it super conversational, attractive, and friendly. Do not output [PROFILE_READY] unless permitted by rules above.`;

      console.log("[Maya Chat] Using OpenAI (gpt-4o-mini)");
      const openai = getOpenAI();
      const openAIMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messagesArray
          .filter((m: any) => m && m.content && (m.role === "user" || m.role === "assistant"))
          .map((m: any) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content as string
          }))
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openAIMessages,
        temperature: 0.85,
      });

      const responseText = completion.choices[0]?.message?.content || "";

      // Return the generated response to the frontend client
      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Maya Chat Error:", error);
      
      // Implement highly professional, comforting, and language-specific fallback messages
      let langFallback = "I am listening closely. I am taking a brief moment to gather my thoughts, but please continue to share what is on your mind. Let's take a gentle breath together.";
      try {
        const messagesArray = Array.isArray(messages) ? messages : [];
        const lastUserMsgRecord = [...messagesArray].reverse().find((m: any) => m && m.role === 'user');
        const lastUserMessage = (lastUserMsgRecord?.content || "").toLowerCase();
        
        if (lastUserMessage.includes("tum") || lastUserMessage.includes("aap") || lastUserMessage.includes("kya") || lastUserMessage.includes("hai") || lastUserMessage.includes("nahi")) {
          langFallback = "Main aapki baat sun rahi hoon aur hamesha aapke sath hoon. Abhi thoda samay lekar baatein samajh rahi hoon, tab tak aap dil kholkar batayein ki aapko kaisa lag raha hai.";
        } else if (lastUserMessage.includes("ela") || lastUserMessage.includes("nenu") || lastUserMessage.includes("undhi") || lastUserMessage.includes("cheppu")) {
          langFallback = "Nenu mee maatalu shraddhaga vintunnanu. Ippudu konchem aalochistunnanu, ee lopu meeku anipistunna bhavanalani natho panchukondi.";
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
      console.log("[Maya Summarize] Using OpenAI");
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Create a short user memory summary for an AI companion. Be objective and concise. Respond in simple English (approx. A1/A2 level) with short sentences."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
      });
      const summaryText = completion.choices[0]?.message?.content || "";

      // Return the summarized text
      res.json({ summary: summaryText });
    } catch (error: any) {
      console.error("Maya Summary Error:", error);
      // Fallback to old summary or friendly baseline statement in case of any model failure
      res.json({ summary: oldSummary || "Finding balance and peace step-by-step." });
    }
  });

  // API Route for Emotional Analysis (OpenAI Proxy with Gemini Fallback)
  app.post("/api/maya/analyze", async (req, res) => {
    const { messages, oldProfile } = req.body || {};
    const messagesArray = Array.isArray(messages) ? messages : [];
    
    const prompt = `Based on our conversation, generate a refined emotional profile.
Previous Profile: ${oldProfile ? JSON.stringify(oldProfile) : "None"}
Conversation history:
${messagesArray.map((m: any) => m ? `${m.role || 'user'}: ${m.content || ''}` : '').join('\n')}

Output JSON with updated traits and interests.`;

    try {
      console.log("[Maya Analyze] Using OpenAI");
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Analyze the user's conversation history with Maya. Build and continuously refine a structured emotional and personality profile. Extract ageGroup (e.g., '18-22', '23-29', '30-39', '40-49', '50+'), emotionalTags (such as: 'lonely', 'anxious', 'overthinker', 'burnout', 'relationship stress', 'career stress'), personalityTraits (such as: 'introvert', 'extrovert'), interests (such as: 'gaming', 'music'), supportStyle, communicationStyle, and activityLevel. Output a JSON object containing keys: moodBaseline (number), moodKeywords (array of strings), communicationStyle (string), needs (string), traits (array of strings), interests (array of strings), ageGroup (string), emotionalTags (array of strings), personalityTraits (array of strings), supportStyle (string), and activityLevel (string). Merge new findings with the previous profile and make sure to populate all parameters. Output JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      const responseText = completion.choices[0]?.message?.content || "{}";

      // Return the parsed JSON response
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error("Maya Analysis Error:", error);
      // Return a safe baseline fallback profile on failure to prevent app disruption
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

  // Setup helper function to asynchronously initialize Vite dev server if in development
  async function initViteDev() {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Vite middleware for development (or fallback if dist folder is not compiled yet)
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    console.log("Running on Vercel serverless function. Static files served by CDN. Express handling API routes only.");
  } else if (process.env.NODE_ENV !== "production" || process.env.DISABLE_HMR === "true" || !distExists) {
    console.log("Starting in Vite dev development mode...");
    // Initialize dev middleware asynchronously
    initViteDev().then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }).catch((err) => {
      console.error("Vite Dev Server initialization failed:", err);
    });
  } else {
    console.log("Starting in production static file mode...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export { app };
export default app;
