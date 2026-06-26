/**
 * FILE 3: loginHandlerExample.ts
 * 
 * DESCRIPTION:
 * Example of how to integrate the `sendWelcomeEmail` function inside your auth form handler.
 * Crucially, it bypasses React's `useEffect` hook entirely and only triggers on manual user interaction,
 * awaiting the dispatch fully before completing the route navigation.
 */

import { sendWelcomeEmail } from "./sendWelcomeEmail";

// Mock router / navigate interface
interface Router {
  push: (url: string) => void;
}

// Mock auth provider interface
interface AuthResult {
  isNewUser: boolean;
  userId: string;
  email: string;
  name: string;
}

interface HandleEmailAuthParams {
  emailInput: string;
  passwordInput: string;
  nameInput: string;
  isLoginMode: boolean;
  authProvider: {
    signIn: (e: string, p: string) => Promise<AuthResult>;
    signUp: (e: string, p: string, n: string) => Promise<AuthResult>;
  };
  router: Router;
  setLoadingState: (loading: boolean) => void;
  setErrorState: (error: string) => void;
}

/**
 * Handle form submission for sign-in or registration.
 * This should be attached directly to your <form onSubmit={handleEmailAuth}> element.
 */
export async function handleEmailAuthExample({
  emailInput,
  passwordInput,
  nameInput,
  isLoginMode,
  authProvider,
  router,
  setLoadingState,
  setErrorState
}: HandleEmailAuthParams): Promise<void> {
  setLoadingState(true);
  setErrorState("");

  try {
    let authResult: AuthResult;

    if (isLoginMode) {
      // User is logging in
      authResult = await authProvider.signIn(emailInput, passwordInput);
    } else {
      // User is signing up / registering a new account
      authResult = await authProvider.signUp(emailInput, passwordInput, nameInput);
    }

    // Check if the user is a brand new account registration
    if (authResult.isNewUser) {
      console.log(`[Auth Handler] New user detected: ${authResult.userId}. Dispatching welcome email.`);
      
      // ALWAYS await the email dispatch before transitioning the page!
      // This ensures the fetch request is fully sent and not aborted prematurely by the browser navigating.
      const sent = await sendWelcomeEmail({
        userId: authResult.userId,
        email: authResult.email,
        name: authResult.name || "Valued Member",
      });

      if (sent) {
        console.log("[Auth Handler] Welcome email successfully dispatched/handled.");
      } else {
        console.warn("[Auth Handler] Welcome email dispatch failed or was skipped.");
      }
    }

    // Route navigation is performed AFTER the email dispatch finishes
    console.log("[Auth Handler] Directing user to dashboard...");
    router.push("/dashboard");

  } catch (err: any) {
    console.error("[Auth Handler] Authentication or dispatch failure:", err);
    setErrorState(err.message || "An authentication error occurred.");
  } finally {
    setLoadingState(false);
  }
}
