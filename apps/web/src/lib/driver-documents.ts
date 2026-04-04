import type { DriverDocumentType, DriverDocumentUpload } from "@shared/contracts";

export const maxDriverDocumentBytes = 3 * 1024 * 1024;
export const acceptedDriverDocumentMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
] as const;

export const driverDocumentDefinitions: Array<{
  type: DriverDocumentType;
  label: string;
  description: string;
}> = [
  {
    type: "insurance",
    label: "Insurance",
    description: "Active insurance card or declaration page for the vehicle you plan to drive."
  },
  {
    type: "registration",
    label: "Registration",
    description: "Current registration showing the vehicle is active and tied to your operating market."
  },
  {
    type: "background_check",
    label: "Background check",
    description: "Upload the completed background check document so admin can review it with your application."
  },
  {
    type: "mvr",
    label: "MVR check",
    description: "Upload your motor vehicle record report for approval before dispatch access is granted."
  }
];

export function formatDriverDocumentLabel(type: DriverDocumentType) {
  return driverDocumentDefinitions.find((document) => document.type === type)?.label ?? type.replaceAll("_", " ");
}

export function formatDriverDocumentFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function fileToDriverDocumentUpload(
  type: DriverDocumentType,
  file: File
): Promise<DriverDocumentUpload> {
  if (!acceptedDriverDocumentMimeTypes.includes(file.type as (typeof acceptedDriverDocumentMimeTypes)[number])) {
    throw new Error("Driver documents must be a PDF, JPG, PNG, or WEBP file");
  }

  if (file.size > maxDriverDocumentBytes) {
    throw new Error("Each driver document must be 3 MB or smaller");
  }

  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64Content = ""] = result.split(",");
      resolve(base64Content);
    };

    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

  return {
    type,
    fileName: file.name,
    mimeType: file.type,
    contentBase64
  };
}
