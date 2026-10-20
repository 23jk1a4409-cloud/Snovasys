# PROMPTS.md

AI tool used: Claude (chat). I log what I asked, what it produced, what was wrong, how I checked, and the commit that fixed it.

## Reusable context
- docs/ai-context/MASTER_PROMPT.md (planned): the master prompt I gave the AI at the start.

### Entry 1 - 19 Oct 2026 - Server could not read the profiles table (access control)

1. **What I asked the AI:** Write the database migration for profiles, documents and document_grants with deny-by-default row level security, then write the login code that reads the user's role from the database.
2. **What the AI produced:** A migration that enabled RLS and revoked all access on the three tables from the anon and authenticated roles, plus login and dashboard code that reads the role with the server-side secret key.
3. **The defect:** The AI assumed the server role (service_role) would keep default access to the tables. It did not on my project. Login succeeded but the dashboard sent me back to the login page, with no error on screen.
4. **How I checked:** The audit log showed auth.login success rows, so the password was correct. I added a temporary console line in src/lib/auth.ts that printed the real Supabase error. It said: permission denied for table profiles.
5. **What I changed:** Added migration 0003_service_role_grants.sql, which grants select, insert, update and delete on the three tables to service_role only. The browser roles stay fully revoked. I then removed the temporary debug lines.
6. **Commit:** af47bee

Verified by signing in as the owner and seeing the dashboard show role owner.

### Entry 2 - 20 Oct 2026 - Malformed document IDs were not audited (audit integrity)

1. **What I asked the AI:** Write the secure download route. Every download attempt, allowed or denied, must be audited.
2. **What the AI produced:** A route that calls a database function which writes the audit row, and returns "Not found" for denied requests.
3. **The defect:** The route checked the ID format first and returned "Not found" for a malformed ID before reaching the database function. Those attempts were never audited, so someone probing the route with junk IDs left no trace.
4. **How I checked:** I noted max(seq) in audit_log (54), opened /api/documents/not-a-real-id/download, and queried max(seq) again. It was still 54, so nothing had been recorded.
5. **What I changed:** The malformed-ID branch now writes a denied audit row with the reason invalid_id (the raw input is not stored). If that audit write fails, the route returns an error instead of silently continuing.
6. **Commit:** a0a3abe

Verified by repeating the request and finding a new document.download / denied row with reason invalid_id.
