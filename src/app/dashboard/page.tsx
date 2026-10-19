import { requireAuthenticatedUser } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="text-slate-700">
        Signed in as <strong>{user.email}</strong> with role{" "}
        <strong>{user.role}</strong>.
      </p>
      <form action={logout}>
        <button type="submit" className="rounded border border-slate-300 px-3 py-2">
          Sign out
        </button>
      </form>
    </main>
  );
}
