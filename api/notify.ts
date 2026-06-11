 import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resend } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, recipientEmail, senderName, recipientName } = req.body || {};
  
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
    return res.json({ status: "ok" });
  } catch (error) {
    console.error("[Email Notification] Error:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
