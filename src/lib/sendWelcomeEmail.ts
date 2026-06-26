/**
 * FILE 2: lib/sendWelcomeEmail.ts
 * 
 * DESCRIPTION:
 * Client-side helper function to fire the welcome email request securely.
 * Guards against double sending using sessionStorage and a local module-level `isSending` state lock.
 */

// Module-level lock to guard against simultaneous double triggers (e.g. concurrent form clicks)
let isSending = false;

interface SendWelcomeEmailParams {
  userId: string;
  email: string;
  name: string;
}

/**
 * Dispatches the welcome email via the backend API route.
 * Employs a dual-guard mechanism (sessionStorage and runtime variable lock).
 */
export async function sendWelcomeEmail({ userId, email, name }: SendWelcomeEmailParams): Promise<boolean> {
  const sessionKey = `welcome_sent_${userId}`;

  // Guard 1: Verify sessionStorage to guarantee we don't dispatch twice in the same session
  if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey) === "1") {
    console.log(`[sendWelcomeEmail] Blocked: Welcome email already marked as sent in sessionStorage for ${userId}.`);
    return true;
  }

  // Guard 2: Module-level latch to prevent concurrent duplicate invocations
  if (isSending) {
    console.log("[sendWelcomeEmail] Blocked: An email dispatch request is already in progress.");
    return false;
  }

  isSending = true;

  try {
    console.log(`[sendWelcomeEmail] Initiating API dispatch for User: ${userId} (${email})`);

    const response = await fetch("/api/send-welcome-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, email, name }),
    });

    // If response was not 200/OK, do NOT set sessionStorage to allow retries on subsequent logins
    if (!response.ok) {
      const errorResponse = await response.json().catch(() => ({}));
      console.error(
        `[sendWelcomeEmail] Server returned error status ${response.status}:`, 
        errorResponse.error || "Unknown error"
      );
      return false;
    }

    const result = await response.json();
    console.log("[sendWelcomeEmail] Server response:", result);

    // If success, store in sessionStorage to prevent any subsequent calls in this session
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, "1");
    }

    return true;
  } catch (error) {
    console.error("[sendWelcomeEmail] Network/Fetch Exception:", error);
    // Allow retry on error by not modifying sessionStorage
    return false;
  } finally {
    // Always unlock sending status regardless of success or failure
    isSending = false;
  }
}
