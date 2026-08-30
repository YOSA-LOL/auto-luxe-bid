import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const uploadImage = createServerFn()
  .inputValidator(
    (input: { fileData: string; fileName: string }) => input
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const ext =
      data.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const base64 = data.fileData.replace(/^data:[^;]+;base64,/, "");
    await writeFile(join(dir, safeName), Buffer.from(base64, "base64"));
    return { url: `/uploads/${safeName}` };
  });
