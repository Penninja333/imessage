import { FileText, FileSpreadsheet, FileArchive, FileCode, File } from "lucide-react";

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileBadgeInfo(fileName = "", mimeType = "") {
  const ext = fileName ? fileName.split(".").pop().toLowerCase() : "";

  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return {
      label: "PDF",
      typeDescription: "PDF Document",
      color: "bg-rose-500",
      textColor: "text-rose-500",
      bgLight: "bg-rose-500/15",
      borderColor: "border-rose-500/30",
      IconComponent: FileText,
    };
  }
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) {
    return {
      label: "DOC",
      typeDescription: "Word Document",
      color: "bg-blue-500",
      textColor: "text-blue-500",
      bgLight: "bg-blue-500/15",
      borderColor: "border-blue-500/30",
      IconComponent: FileText,
    };
  }
  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    mimeType?.includes("excel") ||
    mimeType?.includes("spreadsheet")
  ) {
    return {
      label: "XLS",
      typeDescription: ext === "csv" ? "CSV Spreadsheet" : "Excel Spreadsheet",
      color: "bg-emerald-500",
      textColor: "text-emerald-500",
      bgLight: "bg-emerald-500/15",
      borderColor: "border-emerald-500/30",
      IconComponent: FileSpreadsheet,
    };
  }
  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
    mimeType?.includes("zip") ||
    mimeType?.includes("compressed")
  ) {
    return {
      label: "ZIP",
      typeDescription: "Archive File",
      color: "bg-amber-500",
      textColor: "text-amber-500",
      bgLight: "bg-amber-500/15",
      borderColor: "border-amber-500/30",
      IconComponent: FileArchive,
    };
  }
  if (["json", "js", "jsx", "ts", "tsx", "html", "css", "py", "sh", "rs", "go"].includes(ext)) {
    return {
      label: "CODE",
      typeDescription: "Code Source",
      color: "bg-indigo-500",
      textColor: "text-indigo-500",
      bgLight: "bg-indigo-500/15",
      borderColor: "border-indigo-500/30",
      IconComponent: FileCode,
    };
  }
  if (["txt", "md", "rtf"].includes(ext) || mimeType?.includes("text")) {
    return {
      label: "TXT",
      typeDescription: "Text Document",
      color: "bg-purple-500",
      textColor: "text-purple-500",
      bgLight: "bg-purple-500/15",
      borderColor: "border-purple-500/30",
      IconComponent: FileText,
    };
  }

  return {
    label: (ext.slice(0, 4) || "FILE").toUpperCase(),
    typeDescription: "Document",
    color: "bg-zinc-500",
    textColor: "text-zinc-500",
    bgLight: "bg-zinc-500/15",
    borderColor: "border-zinc-500/30",
    IconComponent: File,
  };
}
