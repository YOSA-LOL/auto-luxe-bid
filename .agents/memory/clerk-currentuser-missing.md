---
    name: Clerk currentUser not exported
    description: currentUser is NOT in @clerk/tanstack-react-start/server
    ---

    ## Rule
    Never import { currentUser } from "@clerk/tanstack-react-start/server" — not exported.

    **How to apply:** Use auth() for userId, then clerkClient().users.getUser(userId).

    **Why:** Package only exports auth, clerkClient, clerkMiddleware. Vite hid the error at runtime; tsc catches it.
    