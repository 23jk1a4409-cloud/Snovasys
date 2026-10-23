# SECURITY.md

## Permission model

- **Owner:** uploads documents, grants and revokes access to their own documents, and downloads them.
- **Viewer:** downloads only documents with a current grant. Cannot upload, share or revoke.
- **Administrator:** the role exists, but has no special access to document contents. There is no admin dashboard yet.
- Access is denied by default. A user can read a document only if they own it or hold a current row in document_grants.

## How a download is decided

1. The server identifies the user from the session cookie (Supabase checks it each time).
2. The user's role comes from the profiles table.
3. The database function authorize_document_read checks the current owner and grants, and writes the audit row in the same transaction.
4. If allowed, the file is read from private storage and streamed through the server. There are no signed links.

Hiding a button is not authorization. Every route and database function checks permission itself.

## Audit log

Each entry has a time, actor, action, document, outcome, small non-sensitive metadata, a request ID, and a hash of the previous entry. Entries are added only through the append_audit function, which only the server can call. UPDATE, DELETE and TRUNCATE are blocked by triggers.

**Limits:** a hash chain makes tampering detectable, not impossible. Someone with full database owner access could disable the triggers or rewrite the whole chain. The log also contains rows written during tests (request ID starts with test-), which cannot be removed.

## Known limits

- Edit, delete, search, the audit log page and the admin dashboard are not built.
- No rate limiting of my own.
- A download in progress is not cut off if access is revoked mid-transfer.
- Tests and the live app share one database.
- Upload size limit is 4 MB.

## Secrets

The Supabase secret key is only in .env.local (not committed) and in Vercel's environment variables. It must never be shared or pasted into a browser.
