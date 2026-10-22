import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";

type Row = {
  id: string;
  title: string;
  category: string;
  original_filename: string;
  size_bytes: number;
  created_at: string;
  owner_id: string;
};

export default async function DocumentsList({ user }: { user: CurrentUser }) {
  const admin = createAdminClient();

  // Documents the user owns.
  const { data: owned } = await admin
    .from("documents")
    .select("id,title,category,original_filename,size_bytes,created_at,owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Documents shared with the user through a current grant.
  const { data: grants } = await admin
    .from("document_grants")
    .select("permission, documents(id,title,category,original_filename,size_bytes,created_at,owner_id)")
    .eq("grantee_id", user.id);

  const shared: (Row & { permission: string })[] = (grants ?? []).flatMap((g) => {
    const doc = g.documents as unknown as Row | null;
    return doc ? [{ ...doc, permission: g.permission }] : [];
  });

  const rows = [
    ...(owned ?? []).map((d) => ({ ...d, permission: "owner" })),
    ...shared,
  ];

  if (rows.length === 0) {
    return <p className="text-slate-600">No documents yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="p-2">Title</th>
            <th className="p-2">Category</th>
            <th className="p-2">Access</th>
            <th className="p-2">Size</th>
            <th className="p-2">Uploaded</th>
            <th className="p-2">Download</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-b border-slate-100">
              <td className="p-2 text-slate-900">{d.title}</td>
              <td className="p-2">{d.category}</td>
              <td className="p-2">{d.permission}</td>
              <td className="p-2">{Math.ceil(d.size_bytes / 1024)} KB</td>
              <td className="p-2">{new Date(d.created_at).toISOString().slice(0, 10)}</td>
                           <td className="p-2 space-x-3">
                <a className="text-blue-700 underline" href={`/api/documents/${d.id}/download`}>
                  Download
                </a>
                {d.permission === "owner" && (
                  <a className="text-blue-700 underline" href={`/documents/${d.id}/share`}>
                    Share
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}