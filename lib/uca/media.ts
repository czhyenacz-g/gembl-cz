import "server-only";
import { mediaPath, ucaUploadRequest } from "./client.ts";
import type { UcaMedia } from "./types.ts";

/** Nahraje soubor a (volitelně) ho hned naváže na existující record. */
export async function uploadMedia(file: File, recordId?: number): Promise<UcaMedia> {
  const formData = new FormData();
  formData.append("file", file);
  if (recordId !== undefined) {
    formData.append("record_id", String(recordId));
  }

  const response = await ucaUploadRequest<{ data: UcaMedia }>(mediaPath(), formData);
  return response.data;
}
