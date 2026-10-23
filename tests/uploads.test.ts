import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUpload } from "../src/lib/uploads";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("upload validation", () => {
  it("accepts a real text file", () => {
    expect(validateUpload("note.txt", bytes("hello")).ok).toBe(true);
  });

  it("accepts a real PDF header", () => {
    expect(validateUpload("a.pdf", bytes("%PDF-1.4 test")).ok).toBe(true);
  });

  it("rejects a text file renamed to .pdf", () => {
    expect(validateUpload("fake.pdf", bytes("not a pdf")).ok).toBe(false);
  });

  it("rejects executable extensions", () => {
    expect(validateUpload("run.exe", bytes("MZ")).ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateUpload("a.txt", new Uint8Array(0)).ok).toBe(false);
  });

  it("rejects oversized files", () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(97);
    expect(validateUpload("big.txt", big).ok).toBe(false);
  });

  it("rejects path traversal in the file name", () => {
    expect(validateUpload("../../etc/passwd.txt", bytes("x")).ok).toBe(false);
    expect(validateUpload("a\\b.txt", bytes("x")).ok).toBe(false);
  });
});
