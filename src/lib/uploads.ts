const envMax = Number(process.env.MAX_UPLOAD_BYTES);
export const MAX_UPLOAD_BYTES =
  Number.isFinite(envMax) && envMax > 0 ? envMax : 4 * 1024 * 1024;
export const CATEGORIES = ["general", "contract", "hr", "client", "audit"] as const;
export type Category = (typeof CATEGORIES)[number];
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
};
export type UploadCheck =
  | { ok: true; ext: string; mime: string; safeName: string }
  | { ok: false; error: string };
function fail(error: string): UploadCheck {
  return { ok: false, error };
}
// Decide the real type from the file's first bytes, not from its name.
export function detectMime(bytes: Uint8Array): string | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.includes(0)) return null;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "text/plain";
  } catch {
    return null;
  }
}
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim()
    .slice(-120);
}
export function validateUpload(name: string, bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return fail("The file is empty.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return fail(`The file is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
  if (/[\/\\\u0000]/.test(name) || name.includes("..")) {
    return fail("Invalid file name.");
  }
  const safeName = sanitizeFilename(name);
  if (!safeName) return fail("Invalid file name.");
  const dot = safeName.lastIndexOf(".");
  const ext = dot > 0 ? safeName.slice(dot + 1).toLowerCase() : "";
  const expected = MIME_BY_EXT[ext];
  if (!expected) return fail("This file type is not allowed. Allowed: PDF, PNG, JPG, TXT.");
  if (detectMime(bytes) !== expected) {
    return fail("The file contents do not match its extension.");
  }
  return { ok: true, ext, mime: expected, safeName };
}
