"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/uploads";

export default function UploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/documents", { method: "POST", body });
      if (res.ok) {
        router.push("/dashboard");
        return;
      }
      let message = "Upload failed. Please try again.";
      if (res.status === 413) {
        message = "The file is too large.";
      } else {
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {}
      }
      setError(message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded border border-slate-300 p-2 text-slate-900";
  const label = "text-sm font-medium text-slate-700";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="space-y-1">
        <label htmlFor="title" className={label}>Title</label>
        <input id="title" name="title" required maxLength={200} className={input} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className={label}>Description (optional)</label>
        <textarea id="description" name="description" maxLength={1000} rows={3} className={input} />
      </div>
      <div className="space-y-1">
        <label htmlFor="category" className={label}>Category</label>
        <select id="category" name="category" className={input}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="file" className={label}>File (PDF, PNG, JPG or TXT, up to 4 MB)</label>
        <input id="file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.txt" className={input} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
      <button type="submit" disabled={busy} className="w-full rounded bg-slate-900 p-2 text-white disabled:opacity-50">
        {busy ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
