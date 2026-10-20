import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, MAX_UPLOAD_BYTES, validateUpload } from "@/lib/uploads";
function bad(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
export async function POST(request: Request) {
  const requestId = randomUUID();
  const user = await getCurrentUser();
  if (!user) return bad("Not authenticated.", 401);
  const admin = createAdminClient();
  const audit = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, unknown>
  ) =>
    admin.rpc("append_audit", {
      p_actor: user.id,
      p_action: "document.upload",
      p_document: null,
      p_outcome: outcome,
      p_metadata: metadata,
      p_request_id: requestId,
    });
  // Authorization is decided here on the server, whatever the UI shows.
  if (user.role !== "owner") {
    await audit("denied", { reason: "role_not_allowed" });
    return bad("You do not have permission to upload documents.", 403);
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 1024 * 1024) {
    await audit("denied", { reason: "too_large" });
    return bad("The file is too large.", 413);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Invalid upload request.", 400);
  }
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  const category = String(form.get("category") ?? "general");
  if (!(file instanceof File)) return bad("Choose a file to upload.", 400);
  if (title.length < 1 || title.length > 200) {
    return bad("Title must be between 1 and 200 characters.", 400);
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return bad("Invalid category.", 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(file.name, bytes);
  if (!check.ok) {
    await audit("denied", { reason: "validation_failed" });
    return bad(check.error, 400);
  }
  // Random storage name: the client-supplied filename never touches the path.
  const storagePath = `${user.id}/${randomUUID()}.${check.ext}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { error: storageError } = await admin.storage
    .from("documents")
    .upload(storagePath, bytes, { contentType: check.mime, upsert: false });
  if (storageError) {
    await audit("error", { reason: "storage_failed" });
    return bad("Upload failed. Please try again.", 500);
  }
  const { data: id, error: dbError } = await admin.rpc("create_document_with_audit", {
    p_owner: user.id,
    p_title: title,
    p_description: description,
    p_category: category,
    p_original_filename: check.safeName,
    p_storage_path: storagePath,
    p_mime: check.mime,
    p_size: bytes.length,
    p_sha256: sha256,
    p_request_id: requestId,
  });
  if (dbError) {
    // Do not leave an orphaned file behind.
    await admin.storage.from("documents").remove([storagePath]);
    await audit("error", { reason: "database_failed" });
    return bad("Upload failed. Please try again.", 500);
  }
  return NextResponse.json({ id }, { status: 201 });
}
