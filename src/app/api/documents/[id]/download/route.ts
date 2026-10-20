import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function notFound() {
  // One identical answer for "missing" and "not allowed": nothing leaks.
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = randomUUID();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!UUID.test(id)) {
    // A malformed ID is still an access attempt, so record it (without storing the raw input).
    const { error: auditError } = await createAdminClient().rpc("append_audit", {
      p_actor: user.id,
      p_action: "document.download",
      p_document: null,
      p_outcome: "denied",
      p_metadata: { reason: "invalid_id" },
      p_request_id: requestId,
    });
    if (auditError) {
      return NextResponse.json({ error: "Could not process the request." }, { status: 500 });
    }
    return notFound();
  }
  const admin = createAdminClient();
  // The database decides, using the CURRENT owner and grants, and records the audit event.
  const { data: storagePath, error } = await admin.rpc("authorize_document_read", {
    p_user: user.id,
    p_document: id,
    p_request_id: requestId,
  });
  // If the decision or its audit record failed, nothing is served.
  if (error) {
    return NextResponse.json({ error: "Could not process the request." }, { status: 500 });
  }
  if (!storagePath) return notFound();
  const { data: doc } = await admin
    .from("documents")
    .select("original_filename, mime_type")
    .eq("id", id)
    .single();
  const { data: file, error: fileError } = await admin.storage
    .from("documents")
    .download(storagePath);
  if (fileError || !file || !doc) {
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }
  const safeName = doc.original_filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(file.stream(), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}


