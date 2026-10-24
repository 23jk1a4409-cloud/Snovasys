# TrustVault

Secure document sharing with a real audit trail. Built for the Snovasys Fresher Hiring Challenge 2026.

- Live app: https://snovasys.vercel.app
- Repository: https://github.com/23jk1a4409-cloud/Snovasys

## The one rule

A user can never read a document without a current, server-side permission check, and every attempt (allowed or denied) is written to an append-only audit log. Revoking access takes effect on the very next request.

## Stack

Next.js (TypeScript), Supabase Auth, PostgreSQL, Supabase private Storage, Vitest. Deployed on Vercel.

## Demo accounts (demo data only, no real information)

| Role | Email | Password |
|---|---|---|
| Owner | owner@trustvault.test | (gangabhavani)|
| Viewer | viewer@trustvault.test | (sudhadurga) |
| Admin | admin@trustvault.test | (23jk1a4409) |

Public sign-up is disabled. Accounts are created by hand in Supabase.

## What works (tested)

- Login and logout, with every attempt audited. The role is read from our database, never from the token.
- Owner-only upload. The server checks the real file contents (not the name or browser type), enforces a 4 MB limit, and stores the file under a random name in a private bucket.
- Download only through our server. Each request checks the current owner and grants in the database and writes an audit row in the same transaction. There are no signed links, so nothing keeps working after revocation.
- Sharing: an owner grants read or edit permission to a user and revokes it from the Share page. Each change and its audit row are saved together.
- Append-only audit log with a hash chain and a verification function. Updates and deletes are blocked by database triggers.
- 17 automated tests (see below).

## Not finished (honest list)

- Editing and deleting documents (no UI or endpoint yet).
- Search by name, owner, category and date.
- Audit log page and administrator dashboard. The audit log exists in the database and can be queried in SQL.
- The "edit" permission can be granted but nothing uses it yet, because editing is not built.
- Rate limiting and brute-force protection beyond Supabase defaults.
- Tests run against the same Supabase project as the live app, and they leave `test-` rows in the audit log, which cannot be deleted.
- Upload limit is 4 MB because of Vercel's request size limit on the free plan.

## Run it locally

1. Install Node.js and run `npm install`.
2. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. The secret key is server-only and must never be committed.
3. Run the SQL files in `supabase/migrations` in order (0001 to 0007) in the Supabase SQL editor.
4. Create the three demo users in Supabase Auth and add their rows to `profiles` with the matching role.
5. Run `npm run dev`.

## Tests

Run `npm test`. They cover upload validation, viewer denial, revocation on the next request, audit rows for denied attempts and permission changes, and audit-chain verification.

The suite was also checked by deliberately removing the read check: 4 tests failed, and after restoring it all 17 passed. See PROMPTS.md.

## Documents

- PROMPTS.md: where the AI was wrong and how I found out.
- SECURITY.md and THREATS.md: security design, threats and known limits.
