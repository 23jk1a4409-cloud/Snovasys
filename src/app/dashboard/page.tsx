import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth";
import { logout } from "../login/actions";
import DocumentsList from "./documents-list";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-700">
            Signed in as <strong>{user.email}</strong> with role{" "}
            <strong>{user.role}</strong>.
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded border border-slate-300 px-3 py-2">
            Sign out
          </button>
        </form>
      </header>

      {user.role === "owner" && (
        <Link
          href="/documents/new"
          className="inline-block rounded bg-slate-900 px-4 py-2 text-white"
        >
          Upload a document
        </Link>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-900">Documents</h2>
        <DocumentsList user={user} />
      </section>
    </main>
  );
}
