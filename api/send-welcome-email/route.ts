import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sentEmails = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const { email, name, userId } = await req.json();

    console.log("Received:", { email, name, userId });

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: email, userId" },
        { status: 400 }
      );
    }

    if (sentEmails.has(userId)) {
      console.log("Already sent for userId:", userId);
      return NextResponse.json({ skipped: true });
    }

    sentEmails.add(userId);

    const { data, error } = await resend.emails.send({
      from: "DelusionAI <support@delusionai.in>",
      to: email,
      subject: "Welcome to DelusionAI!",
      html: "<div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;'><h1 style='font-size: 24px; color: #111;'>Welcome to DelusionAI!</h1><p style='color: #444; line-height: 1.6;'>Thanks for signing up. Your account is ready to go.</p><a href='https://delusionai.in' style='display: inline-block; margin-top: 24px; padding: 12px 24px; background: #4F46E5; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;'>Get Started</a></div>",
    });

    if (error) {
      sentEmails.delete(userId);
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log("Email sent successfully. Resend ID:", data?.id);
    return NextResponse.json({ success: true, id: data?.id });

  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
