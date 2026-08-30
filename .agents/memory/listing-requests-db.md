---
name: Listing Requests DB
description: Schema and server functions for the "List Your Car" submissions flow
---

# Listing Requests

Table `listing_requests` was created in the managed PostgreSQL DB with these columns:
id, name, email, phone, brand, model, year (TEXT), price (TEXT), notes, status (DEFAULT 'pending'), created_at (TIMESTAMPTZ).

Server functions live in `src/lib/cars.server.ts`:
- `createListingRequest` — saves a submission from the List Your Car form
- `getListingRequests` — admin fetch, returns all rows ordered by created_at DESC
- `updateListingRequestStatus` — sets status to 'pending'|'approved'|'rejected'
- `getBidsForUser(userName)` — joins bids + cars, used on /account page
- `getCarsByDealership(dealership)` — used on /dealers/$dealerId page

**Why:** The standard bid flow uses the hardcoded user name "You" in placeBidInDb, so getBidsForUser queries for "You" on the account page.

**How to apply:** When adding new server functions, follow the createServerFn() + .inputValidator() + .handler() pattern. Pool must be ended in finally block.
