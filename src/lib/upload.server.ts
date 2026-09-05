import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB decoded

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileData: string; fileName: string }) => input
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    return uploadFileHandler(data, ["jpg", "jpeg", "png", "webp", "gif"], "image");
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileData: string; fileName: string }) => input
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    return uploadFileHandler(data, ["pdf"], "document");
  });

async function uploadFileHandler(
  data: { fileData: string; fileName: string },
  allowedExts: string[],
  kind: "image" | "document",
): Promise<{ url: string }> {
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const ext =
    data.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (kind === "document" ? "pdf" : "jpg");
  if (!allowedExts.includes(ext)) {
    throw new Error(`Unsupported file type. Allowed: ${allowedExts.join(", ")}`);
  }
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const base64 = data.fileData.replace(/^data:[^;]+;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  if (buf.length > MAX_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB)`);
  }
  await writeFile(join(dir, safeName), buf);
  return { url: `/uploads/${safeName}` };
}
