import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
export type Role = "admin" | "owner" | "viewer";
export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};
// Identity comes from Supabase (getUser checks the token with the server).
// The role comes from OUR database, never from the token or the request.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,full_name,role,is_active")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) {
    return null;
  }
  if (!profile.is_active) {
    return null;
  }
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
  };
}
export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await requireAuthenticatedUser();
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
