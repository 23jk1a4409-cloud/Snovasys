# THREATS.md

Status key: **Tested** = an automated test or a recorded manual test shows it. **Implemented** = the protection is in the code, but not tested. **Not done** = not implemented.

| # | Threat | Where | Mitigation | Status | Evidence | Residual risk |
|---|---|---|---|---|---|---|
| 1 | Reading another user's document by changing the ID (IDOR) | GET /api/documents/[id]/download | The database function authorize_document_read checks the current owner and grants on every request | Tested | tests/authorization.test.ts: "viewer cannot read an unshared document", "a random document ID gives the same denial" | None known |
| 2 | Viewer gives themselves access (privilege escalation) | grant_document_access | The function allows only the document's owner to grant, and the actor comes from the server session, never the request body | Tested | "viewer cannot grant themselves access" | None known |
| 3 | A viewer revokes or changes someone else's access | revoke_document_access | Same owner-only check inside the function | Tested | "a viewer cannot revoke someone else's grant" | None known |
| 4 | Access still works after revocation | Download route | Revoking deletes the grant row. There are no signed links and no caching, so the next request is denied | Tested | "revoked access is denied on the very next request"; manual browser test | A download already streaming when access is revoked is not interrupted |
| 5 | Viewer uploads a file | POST /api/documents | The server checks the role (owner only) and audits the denial | Tested manually | Viewer called the API from the browser console and got 403; the audit row shows role_not_allowed | Automated test only covers the database layer, not this HTTP route |
| 6 | Upload spoofing (a .txt renamed to .pdf, executables) | uploads.ts | The server reads the file's first bytes, allows only PDF, PNG, JPG and TXT, and ignores the browser's claimed type | Tested | tests/uploads.test.ts | Text files are not scanned for malware |
| 7 | Oversized files | Upload route | 4 MB limit in code, plus an early Content-Length check | Tested | "rejects oversized files" | Limit comes from Vercel's free plan |
| 8 | Path traversal in file names | uploads.ts | The storage path uses a random UUID. The original name is only stored as metadata | Tested | "rejects path traversal in the file name" | None known |
| 9 | Audit log is edited or deleted | audit_log | Triggers block UPDATE, DELETE and TRUNCATE. Browser roles have no access | Tested | "the app cannot edit audit entries" | A database owner can disable the trigger |
| 10 | Audit log is altered by someone with high privileges | audit_log | Hash chain and verify_audit_chain() | Chain verifies: tested. Tamper detection: see note below | "the audit chain verifies" | A privileged person could rewrite the whole chain. The chain makes edits detectable, not impossible |
| 11 | An action succeeds without an audit record | Upload, grant, revoke, download, login | The change and its audit row are written in one database transaction. If the audit write fails, the action fails | Implemented | Login is undone if the audit write fails | Not covered by an automated failure-injection test |
| 12 | Denied attempts are missing from the log | Download route | Denials, including malformed IDs, are audited | Tested manually | Found and fixed a gap, see PROMPTS.md entry 2 | None known |
| 13 | Error messages reveal whether a document exists | Download route | Missing and forbidden documents return the same 404 | Tested manually | Viewer got the same message as for a random ID | Response timing was not measured |
| 14 | Forged role | getCurrentUser | The role is read from our profiles table on every request, never from the token | Implemented | Not tested | None known |
| 15 | Disabled account keeps working | getCurrentUser | is_active is checked on every request | Implemented | Not tested | A disabled user's session cookie is still valid at Supabase, but the app refuses it |
| 16 | Session misuse | Auth | Supabase getUser verifies the token with the server each time | Implemented | Not tested | None known |
| 17 | SQL injection | All queries | Only the Supabase client and parameterised database functions are used. No SQL is built from strings | Implemented | Not tested | None known |
| 18 | Cross-site scripting | UI and downloads | React escapes output. Downloads use Content-Disposition: attachment and X-Content-Type-Options: nosniff | Implemented | Not tested | None known |
| 19 | CSRF | POST routes | Session cookies are set by Supabase. Next.js server actions check the request origin. The upload API relies on SameSite cookies | Implemented | Not tested | I have not verified the cookie's SameSite setting |
| 20 | Secrets committed to Git | Repo | .env.local is in .gitignore. The secret key exists only in .env.local and in Vercel's environment | Tested manually | git status never listed .env.local | A key pasted into chat or a screenshot would need rotating |
| 21 | Brute-force logins and rate abuse | Login | Only Supabase's default limits | **Not done** | None | No limit of my own |
| 22 | Insecure deployment configuration | Vercel | Variables are set in Vercel, the bucket is private, and public sign-up is off | Implemented | The live login works | Production and tests share one Supabase project |
| 23 | Weakened authorization check goes unnoticed | Tests | A suite that fails when a check is removed | Tested | Replacing the read check made 4 tests fail. Restoring it made all 17 pass. See PROMPTS.md entry 3 | The test left false success rows in the audit log, which cannot be deleted |

## Not built

Editing and deleting documents, search, the audit log page and the administrator dashboard. Because editing is not built, the "edit" permission is stored but not used.

## Note on threat 10

verify_audit_chain() returns ok = true in the tests. A tamper check (change a row, confirm it reports ok = false, roll back) is a manual SQL step. Do not rely on this document for tamper detection until that step has been run and recorded.
