import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeAccess } from "./actions";
import ShareForm from "./share-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["owner"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id,title,owner_id")
    .eq("id", id)
    .maybeSingle();

  // Only the document's owner may see this page; everyone else gets the same 404.
  if (!doc || doc.owner_id !== user.id) notFound();

  const { data: grants } = await admin
    .from("document_grants")
    .select("grantee_id, permission, granted_at, profiles!document_grants_grantee_id_fkey(email)")
    .eq("document_id", id);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard" className="text-sm text-blue-700 underline">
        Back to dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Share: {doc.title}</h1>

      <ShareForm documentId={doc.id} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-900">Who has access</h2>
        {(grants ?? []).length === 0 ? (
          <p className="text-slate-600">Only you.</p>
        ) : (
          <ul className="space-y-2">
            {(grants ?? []).map((g) => {
              const p = g.profiles as unknown as { email: string } | null;
              return (
                <li
                  key={g.grantee_id}
                  className="flex items-center justify-between rounded border border-slate-200 p-3"
                >
                  <span>
                    {p?.email ?? g.grantee_id} <strong>({g.permission})</strong>
                  </span>
                  <form action={revokeAccess}>
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input type="hidden" name="granteeId" value={g.grantee_id} />
                    <button type="submit" className="rounded border border-red-300 px-3 py-1 text-red-700">
                      Revoke
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
