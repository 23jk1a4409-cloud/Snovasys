import { config } from "dotenv";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

config({ path: ".env.local" });
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

let owner = "";
let viewer = "";
let doc = "";

async function profileId(email: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error || !data) throw new Error("Missing profile " + email);
  return data.id as string;
}

async function read(user: string, document: string = doc, requestId = "test-" + randomUUID()) {
  const { data, error } = await admin.rpc("authorize_document_read", {
    p_user: user, p_document: document, p_request_id: requestId,
  });
  expect(error).toBeNull();
  return data as string | null;
}

async function grant(actor: string, grantee: string, permission = "read") {
  const { data } = await admin.rpc("grant_document_access", {
    p_actor: actor, p_document: doc, p_grantee: grantee,
    p_permission: permission, p_request_id: "test-" + randomUUID(),
  });
  return data as boolean;
}

async function revoke(actor: string, grantee: string) {
  const { data } = await admin.rpc("revoke_document_access", {
    p_actor: actor, p_document: doc, p_grantee: grantee, p_request_id: "test-" + randomUUID(),
  });
  return data as boolean;
}

beforeAll(async () => {
  owner = await profileId("owner@trustvault.test");
  viewer = await profileId("viewer@trustvault.test");
  const { data, error } = await admin.rpc("create_document_with_audit", {
    p_owner: owner, p_title: "TEST-" + randomUUID(), p_description: "", p_category: "general",
    p_original_filename: "t.txt", p_storage_path: `${owner}/test-${randomUUID()}.txt`,
    p_mime: "text/plain", p_size: 1, p_sha256: "0".repeat(64), p_request_id: "test-setup",
  });
  if (error) throw error;
  doc = data as string;
});

afterAll(async () => {
  await admin.from("documents").delete().eq("id", doc);
});

describe("document authorization", () => {
  it("owner can read their own document", async () => {
    expect(await read(owner)).not.toBeNull();
  });

  it("viewer cannot read an unshared document", async () => {
    expect(await read(viewer)).toBeNull();
  });

  it("a random document ID gives the same denial", async () => {
    expect(await read(viewer, randomUUID())).toBeNull();
  });

  it("viewer cannot grant themselves access", async () => {
    expect(await grant(viewer, viewer, "edit")).toBe(false);
    expect(await read(viewer)).toBeNull();
  });

  it("revoked access is denied on the very next request", async () => {
    expect(await grant(owner, viewer, "read")).toBe(true);
    expect(await read(viewer)).not.toBeNull();
    expect(await revoke(owner, viewer)).toBe(true);
    expect(await read(viewer)).toBeNull();
  });

  it("a viewer cannot revoke someone else's grant", async () => {
    expect(await grant(owner, viewer, "read")).toBe(true);
    expect(await revoke(viewer, viewer)).toBe(false);
    expect(await read(viewer)).not.toBeNull();
    await revoke(owner, viewer);
  });
});

describe("audit trail", () => {
  it("records a denied read attempt", async () => {
    const requestId = "test-" + randomUUID();
    await read(viewer, doc, requestId);
    const { data } = await admin.from("audit_log").select("outcome,action").eq("request_id", requestId);
    expect(data?.[0]).toEqual({ outcome: "denied", action: "document.download" });
  });

  it("records permission changes", async () => {
    await grant(owner, viewer, "read");
    await revoke(owner, viewer);
    const { data } = await admin
      .from("audit_log").select("action").eq("document_id", doc)
      .in("action", ["permission.grant", "permission.revoke"]);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("the app cannot edit audit entries", async () => {
    const { error } = await admin.from("audit_log").update({ action: "hacked" }).eq("seq", 1);
    expect(error).not.toBeNull();
  });

  it("the audit chain verifies", async () => {
    const { data } = await admin.rpc("verify_audit_chain");
    expect(data?.[0]?.ok).toBe(true);
  });
});
