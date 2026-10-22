"use client";

import { useActionState } from "react";
import { grantAccess } from "./actions";

export default function ShareForm({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(grantAccess, undefined);
  const input = "w-full rounded border border-slate-300 p-2 text-slate-900";

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="documentId" value={documentId} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email of the user
        </label>
        <input id="email" name="email" type="email" required className={input} />
      </div>
      <div className="space-y-1">
        <label htmlFor="permission" className="text-sm font-medium text-slate-700">
          Permission
        </label>
        <select id="permission" name="permission" className={input}>
          <option value="read">read</option>
          <option value="edit">edit</option>
        </select>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : "Grant access"}
      </button>
    </form>
  );
}
