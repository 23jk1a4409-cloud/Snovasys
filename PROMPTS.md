# PROMPTS.md

AI tool used: Claude (chat). I log what I asked, what it produced, what was wrong, how I checked, and the commit that fixed it.

## Reusable context
- docs/ai-context/MASTER_PROMPT.md (planned): the master prompt I gave the AI at the start.

## Entries
(Entries are added only when I find a real problem. None yet.)

### Entry 2 - 20 Oct 2026 - Malformed document IDs were not audited (audit integrity)

1. **What I asked the AI:** Write the secure download route. Every download attempt, allowed or denied, must be audited.
2. **What the AI produced:** A route that calls a database function which writes the audit row, and returns "Not found" for denied requests.
3. **The defect:** The route checked the ID format first and returned "Not found" for a malformed ID before reaching the database function. Those attempts were never audited, so someone probing the route with junk IDs left no trace.
4. **How I checked:** I noted max(seq) in audit_log (54), opened /api/documents/not-a-real-id/download, and queried max(seq) again. It was still 54, so nothing had been recorded.
5. **What I changed:** The malformed-ID branch now writes a denied audit row with the reason invalid_id (the raw input is not stored). If that audit write fails, the route returns an error instead of silently continuing.
6. **Commit:** a0a3abe

Verified by repeating the request and finding a new document.download / denied row with reason invalid_id.
