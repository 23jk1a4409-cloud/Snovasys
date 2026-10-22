"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ShareState = { error?: string; ok?: string } | undefined;

export async function grantAccess(
  _prev: ShareState,
  formData: FormData
): Promise<ShareState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const documentId = String(formData.get("documentId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const permission = String(formData.get("permission") ?? "");
  if (!UUID.test(documentId)) return { error: "Invalid document." };
  if (!["read", "edit"].includes(permission)) return { error: "Invalid permission." };

  const admin = createAdminClient();
  const { data: grantee } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (!grantee) return { error: "No active user with that email." };

  const { data: ok, error } = await admin.rpc("grant_document_access", {
    p_actor: user.id,
    p_document: documentId,
    p_grantee: grantee.id,
    p_permission: permission,
    p_request_id: randomUUID(),
  });
  if (error) return { error: "Could not save. Please try again." };
  if (!ok) return { error: "You cannot share this document." };

  revalidatePath(`/documents/${documentId}/share`);
  return { ok: "Access granted." };
}

export async function revokeAccess(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const documentId = String(formData.get("documentId") ?? "");
  const granteeId = String(formData.get("granteeId") ?? "");
  if (!UUID.test(documentId) || !UUID.test(granteeId)) return;

  const admin = createAdminClient();
  await admin.rpc("revoke_document_access", {
    p_actor: user.id,
    p_document: documentId,
    p_grantee: granteeId,
    p_request_id: randomUUID(),
  });
  revalidatePath(`/documents/${documentId}/share`);
}
