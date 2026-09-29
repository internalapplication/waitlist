import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// Google returns here after sign-in. Clerk finishes the session (or creates the
// account on first sign-in) and then redirects to "/".
export default function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
      {/* Used by Clerk's bot protection during sign-up */}
      <div id="clerk-captcha" />
    </>
  )
}
