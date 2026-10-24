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
6. **Commit:** 9ed0b84

Verified by signing in as the owner and seeing the dashboard show role owner.

### Entry 2 - 20 Oct 2026 - Malformed document IDs were not audited (audit integrity)

1. **What I asked the AI:** Write the secure download route. Every download attempt, allowed or denied, must be audited.
2. **What the AI produced:** A route that calls a database function which writes the audit row, and returns "Not found" for denied requests.
3. **The defect:** The route checked the ID format first and returned "Not found" for a malformed ID before reaching the database function. Those attempts were never audited, so someone probing the route with junk IDs left no trace.
4. **How I checked:** I noted max(seq) in audit_log (54), opened /api/documents/not-a-real-id/download, and queried max(seq) again. It was still 54, so nothing had been recorded.
5. **What I changed:** The malformed-ID branch now writes a denied audit row with the reason invalid_id (the raw input is not stored). If that audit write fails, the route returns an error instead of silently continuing.
6. **Commit:** a0a3abe

Verified by repeating the request and finding a new document.download / denied row with reason invalid_id.

### Entry 3 - 22 Oct 2026 - Do the tests actually catch a broken authorization check? (access control)

1. **What I asked the AI:** Write automated tests proving a viewer cannot read an unshared document, that revoked access is denied on the next request, and that denied attempts are audited.
2. **What the AI produced:** 17 tests (7 upload checks, 10 authorization and audit checks). All 17 passed on the first run.
3. **The concern:** A passing suite proves nothing if it would also pass with a broken check. The AI only gave me passing tests and did not show that they fail when the protection is removed.
4. **How I checked:** I replaced the authorize_document_read database function with a version that ignored grants, then ran the suite again. 4 tests failed: viewer cannot read an unshared document, viewer cannot grant themselves access, revoked access is denied on the very next request, and records a denied read attempt.
5. **What I changed:** I restored the correct function and re-ran the suite: 17 passed again. The broken function also wrote false success rows to the audit log, which cannot be deleted because the log is append-only. Those rows have request IDs starting with test-.
6. **Commit:** (the commit that added the tests, from git log)

Lesson: run this kind of check against a separate test database, not the database the live site uses. For a short time, the live site's download check was weakened.
