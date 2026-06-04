import { MayaMessage, EmotionalProfile } from '../types';

export async function chatWithMaya(messages: MayaMessage[], memorySummary?: string, emotionalProfile?: EmotionalProfile, profileDetails?: any) {
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/maya/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, memorySummary, emotionalProfile, profileDetails })
      });

      if (!response.ok) {
        let errorText = "";
        try {
          const rawText = await response.text();
          if (rawText && (rawText.includes("Please wait while your application starts...") || rawText.includes("Starting Server..."))) {
            attempt++;
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
          }
          try {
            const errorData = JSON.parse(rawText);
            errorText = errorData.error || errorData.message || `HTTP status ${response.status}`;
          } catch {
            errorText = rawText || `HTTP status: ${response.status}`;
          }
        } catch {
          errorText = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorText);
      }

      let data;
      let rawText = "";
      try {
        rawText = await response.text();
        const trimmedText = rawText.trim();
        if (trimmedText.startsWith("<!doctype") || trimmedText.startsWith("<html") || trimmedText.startsWith("<!DOCTYPE") || trimmedText.includes("Please wait while your application starts...") || trimmedText.includes("Starting Server...")) {
          attempt++;
          await new Promise(r => setTimeout(r, 1500 * attempt));
          continue;
        }
        data = JSON.parse(rawText);
      } catch (jsonErr: any) {
        console.error("Failed to parse Maya chat response as JSON. Raw body:", rawText, jsonErr);
        if (rawText && (rawText.includes("<!doctype") || rawText.includes("<html") || rawText.includes("DOCTYPE") || rawText.includes("html") || rawText.includes("Starting Server") || rawText.includes("Please wait"))) {
          attempt++;
          await new Promise(r => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw new Error("Received invalid content structure from server. Please try sending your message again.");
      }
      return data.text || "I'm sensing a slight interference in our connection. Could you say that again?";
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("I am finding it custom to focus right now. Let us try sending your message once more.");
}

export async function summarizeMemory(messages: MayaMessage[], oldSummary?: string) {
  try {
    const response = await fetch('/api/maya/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, oldSummary })
    });

    if (!response.ok) return oldSummary || "";
    
    let data;
    try {
      data = await response.json();
    } catch {
      return oldSummary || "";
    }
    return data.summary || oldSummary || "";
  } catch (error) {
    console.error('Error summarizing memory:', error);
    return oldSummary || "";
  }
}

export async function analyzeProfile(messages: MayaMessage[], oldProfile?: EmotionalProfile) {
  try {
    const response = await fetch('/api/maya/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, oldProfile })
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorData.message || `HTTP status ${response.status}`;
      } catch {
        errorText = `HTTP error! status: ${response.status}`;
      }
      throw new Error(errorText);
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error analyzing profile:', error);
    return null;
  }
}
