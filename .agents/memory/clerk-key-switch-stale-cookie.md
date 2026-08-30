---
  name: Clerk key-switch stale cookie loop
  description: Explains the "infinite redirect loop / keys do not match" Clerk dev warning that persists even after keys are corrected
  ---

  When CLERK_SECRET_KEY (or publishable key) is changed during a dev session, the browser may already hold a Clerk dev handshake/session cookie signed by the old key pair. Clerk's SDK then logs "Refreshing the session token resulted in an infinite redirect loop... keys do not match" on every request, even though the current keys are actually a valid matching pair.

  **Why:** @clerk/backend increments a handshakeRedirectLoopCounter cookie and throws this generic message once verification of a stale signed cookie fails 3 times; the real underlying error (visible in source) is "Handshake token verification failed due to an invalid signature. If you have switched Clerk keys locally, clear your cookies and try again." The generic message is misleading and does not necessarily mean the current key pair is mismatched.

  **How to apply:** Before assuming a fresh key pair is wrong, verify independently (e.g. compare the JWKS `kid` from the publishable key's frontend API domain against the secret key's `/v1/jwks` via the Clerk backend API — they should match). If they match, the loop is just a stale-cookie artifact from earlier key switching in that browser session; it self-resolves for any client without the old cookie (curl, real fresh users). Only the specific dev browser tab/profile that held the old cookie needs a cookie clear or hard refresh.
  