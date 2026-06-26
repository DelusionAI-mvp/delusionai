const welcomeHtml = `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
    <h1 style="font-size: 24px; color: #111;">Welcome to DelusionAI!</h1>
    <p style="color: #444; line-height: 1.6;">
      Thanks for signing up. Your account is ready to go.
    </p>
    
      href="https://delusionai.in"
      style="
        display: inline-block;
        margin-top: 24px;
        padding: 12px 24px;
        background: #4F46E5;
        color: white;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
      "
    >
      Get Started →
    </a>
  </div>
`;

const { data, error } = await resend.emails.send({
  from: "DelusionAI <hello@mail.delusionai.in>",
  to: email,
  subject: "Welcome to DelusionAI!",
  html: welcomeHtml,
});
