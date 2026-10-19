"use server";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export type LoginState = { error?: string } | undefined;
export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const admin = createAdminClient();
  const requestId = randomUUID();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    // We do not log the typed email: people sometimes type a password there.
    await admin.rpc("append_audit", {
      p_actor: null,
      p_action: "auth.login",
      p_document: null,
      p_outcome: "denied",
      p_metadata: {},
      p_request_id: requestId,
    });
    return { error: "Invalid email or password." };
  }
  const { error: auditError } = await admin.rpc("append_audit", {
    p_actor: data.user.id,
    p_action: "auth.login",
    p_document: null,
    p_outcome: "success",
    p_metadata: {},
    p_request_id: requestId,
  });
  // No unaudited successful login: if we cannot record it, undo it.
  if (auditError) {
    await supabase.auth.signOut();
    return { error: "Sign-in could not be recorded. Please try again." };
  }
  redirect("/dashboard");
}
export async function logout() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const admin = createAdminClient();
    await admin.rpc("append_audit", {
      p_actor: data.user.id,
      p_action: "auth.logout",
      p_document: null,
      p_outcome: "success",
      p_metadata: {},
      p_request_id: randomUUID(),
    });
  }
  await supabase.auth.signOut();
  redirect("/login");
}
