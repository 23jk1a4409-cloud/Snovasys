import { requireRole } from "@/lib/auth";
import UploadForm from "./upload-form";
export default async function NewDocumentPage() {
  await requireRole(["owner"]);
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Upload a document</h1>
      <UploadForm />
    </main>
  );
}
