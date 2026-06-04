import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function triggered on write to the firestore path users/{uid}.
 * Sends a welcome email using nodemailer if welcomeEmailSent is false or missing.
 */
export const sendWelcomeEmail = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    // If deleted, do nothing
    if (!change.after.exists) {
      console.log('Document deleted, skipping.');
      return null;
    }

    const userData = change.after.data();
    if (!userData) {
      console.log('No user data found, skipping.');
      return null;
    }

    const { email, displayName, welcomeEmailSent } = userData;

    // Check if welcomeEmailSent is false or missing (undefined)
    if (welcomeEmailSent === false || welcomeEmailSent === undefined) {
      if (!email) {
        console.warn(`User ${context.params.uid} does not have an email address. Cannot send welcome email.`);
        return null;
      }

      // Read credentials from functions config
      const mailConfig = functions.config().mail;
      const mailUser = mailConfig ? mailConfig.user : null;
      const mailPass = mailConfig ? mailConfig.pass : null;

      if (!mailUser || !mailPass) {
        console.error('SMTP email credentials (mail.user and mail.pass) are not configured via Firebase config.');
        return null;
      }

      // Configure nodemailer transporter using Gmail/custom service config
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      });

      const memberName = displayName || 'VIP Member';

      const mailOptions = {
        from: `"DelusionAI" <${mailUser}>`,
        to: email,
        subject: 'Thank you for joining DelusionAI!',
        html: `
          <div style="font-family: sans-serif; padding: 35px; line-height: 1.6; color: #2B050C; background-color: #F5EFE6; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #8B1A2F;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #8B1A2F; margin: 0; font-size: 28px;">DelusionAI</h1>
              <p style="text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #625052; font-weight: bold; margin-top: 5px;">Exclusive Early Access Waitlist</p>
            </div>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 20px 0;" />
            <p>Dear ${memberName},</p>
            <p>Thank you for signing in and joining the exclusive <strong>DelusionAI Early Access Waitlist</strong>! We are absolutely thrilled to welcome you to our curated mental health and emotional support community.</p>
            <p>Our team is currently refining <strong>Maya AI</strong> and our deep <strong>Similar Mindsets Peer Matching</strong> systems to ensure a premium, secure, and deeply comforting experience.</p>
            <p>We will contact you with further updates and early access invitations the moment stages become available. In the meantime, you are welcome to explore the client portal!</p>
            <p>Warmest regards,</p>
            <p style="font-weight: bold; color: #8B1A2F;">The DelusionAI Team</p>
            <hr style="border: none; border-top: 2px solid rgba(139,26,47,0.1); margin: 25px 0;" />
            <p style="font-size: 11px; color: #625052; text-align: center;">This is an automated notification from your DelusionAI Waitlist Account.</p>
          </div>
        `,
      };

      try {
        console.log(`Sending welcome email to ${email}...`);
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email successfully sent to ${email}.`);

        // Update the document to ensure the email is marked as sent and function doesn't loop
        await change.after.ref.update({ welcomeEmailSent: true });
        console.log(`Updated welcomeEmailSent to true for user: ${context.params.uid}`);
      } catch (error) {
        console.error(`Failed to send welcome email to ${email}:`, error);
      }
    } else {
      console.log(`Welcome email already sent for user: ${context.params.uid}. Skipping trigger.`);
    }

    return null;
  });
