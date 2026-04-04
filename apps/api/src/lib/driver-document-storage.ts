import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DriverDocumentUpload } from "@shared/contracts";
import { env } from "../config/env.js";

const baseUploadDir = path.resolve(process.cwd(), env.driverDocumentUploadDir);

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

export const MAX_DRIVER_DOCUMENT_BYTES = 3 * 1024 * 1024;

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

function decodeBase64(contentBase64: string) {
  try {
    return Buffer.from(contentBase64, "base64");
  } catch {
    throw new Error("Driver document upload is not valid base64 content");
  }
}

export async function persistDriverDocumentUpload(
  driverId: string,
  upload: DriverDocumentUpload
): Promise<{ storagePath: string; fileSizeBytes: number }> {
  if (!allowedMimeTypes.has(upload.mimeType)) {
    throw new Error("Driver documents must be a PDF, JPG, PNG, or WEBP file");
  }

  const buffer = decodeBase64(upload.contentBase64);
  if (!buffer.byteLength) {
    throw new Error("Driver document upload is empty");
  }

  if (buffer.byteLength > MAX_DRIVER_DOCUMENT_BYTES) {
    throw new Error("Each driver document must be 3 MB or smaller");
  }

  const driverDirectory = path.join(baseUploadDir, driverId);
  await mkdir(driverDirectory, { recursive: true });

  const safeFileName = sanitizeSegment(upload.fileName);
  const relativePath = path.join(driverId, `${upload.type}-${Date.now()}-${safeFileName}`);
  const absolutePath = path.join(baseUploadDir, relativePath);

  await writeFile(absolutePath, buffer);

  return {
    storagePath: relativePath,
    fileSizeBytes: buffer.byteLength
  };
}

export function resolveStoredDriverDocumentPath(storagePath: string) {
  return path.join(baseUploadDir, storagePath);
}

export async function removeStoredDriverDocument(storagePath: string | null | undefined) {
  if (!storagePath) {
    return;
  }

  await rm(resolveStoredDriverDocumentPath(storagePath), { force: true });
}
