/**
 * FILE 1: app/api/send-welcome-email/route.ts
 * 
 * DESCRIPTION:
 * Next.js App Router POST API Route for sending welcome emails.
 * Uses an in-memory Set (sentEmails) to guarantee absolute idempotency
 * and prevent duplicate dispatches caused by React 18 Strict Mode double-invocations.
 */

import { Resend } from "resend";

// Initialize Resend with the private environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory Set to track already-processed user IDs
const sentEmails = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, userId } = body || {};

    // Validate request payload
    if (!email || !userId) {
      console.error("[Send Welcome Email API] Error: Missing email or userId in request payload.");
      return Response.json(
        { error: "Missing required fields: email and userId are required." },
        { status: 400 }
      );
    }

    const trimmedUserId = userId.toString().trim();
    const trimmedEmail = email.toString().trim();
    const cleanName = (name || "there").toString().trim();

    // Deduplication check: If userId already in Set, skip and return 200
    if (sentEmails.has(trimmedUserId)) {
      console.log(`[Send Welcome Email API] Skipped: User ID ${trimmedUserId} already processed or dispatching.`);
      return Response.json({ skipped: true }, { status: 200 });
    }

    // Add userId to Set IMMEDIATELY before starting async work (prevent concurrent race conditions)
    sentEmails.add(trimmedUserId);
    console.log(`[Send Welcome Email API] Locked User ID: ${trimmedUserId}. Proceeding to dispatch.`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com";
    const appName = "DelusionAI"; 
    const fromSender = "DelusionAI <hello@delusionai.in>"; 

    try {
      const { data, error } = await resend.emails.send({
        from: fromSender,
        to: [trimmedEmail],
        subject: `Welcome to ${appName}!`,
        html: `
          <div style="font-family: sans-serif; padding: 30px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">${appName}</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Welcome to Your Safe Space</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${cleanName},</p>
            <p>Thank you for being a part of <strong>${appName}</strong>. We are here to provide a secure, comfortable, and deeply supportive space for your emotional well-being.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #8B1A2F; color: #FFFBF0; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px;">Access Your Dashboard</a>
            </div>
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The ${appName} Team</p>
          </div>
        `,
      });

      if (error) {
        console.error(`[Send Welcome Email API] Resend API dispatch error for ${trimmedUserId}:`, error);
        // Error fallback: Remove userId from the memory Set to allow a retry on the next attempt
        sentEmails.delete(trimmedUserId);
        return Response.json(
          { error: error.message || "Failed to dispatch email via Resend" },
          { status: 500 }
        );
      }

      console.log(`[Send Welcome Email API] Success: Welcome email sent successfully to ${trimmedEmail} (ID: ${data?.id})`);
      return Response.json({ success: true, id: data?.id }, { status: 200 });

    } catch (sendErr: any) {
      console.error(`[Send Welcome Email API] Resend calling exception for ${trimmedUserId}:`, sendErr);
      // Remove from Set to allow retry
      sentEmails.delete(trimmedUserId);
      throw sendErr;
    }

  } catch (err: any) {
    console.error("[Send Welcome Email API] Exception caught in top-level handler:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
