"use client";

import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type GeneratedExportCardOutput = Partial<{
  content: string;
  fileName: string;
  format: "Text" | "JSON" | "HTML";
  exportMemoId: string;
  storageKey: string;
  downloadUrl: string;
  expiresAt: string;
}>;

type ExportDownloadResult = {
  downloadUrl?: string;
  expiresAt?: string;
};

interface ExportCardProps {
  title: string;
  description: string;
  format: "Text" | "JSON" | "HTML";
  content: string;
  fileName: string;
  disabled?: boolean;
  gateMessage?: string;
  testId?: string;
  onGenerate?: () => Promise<GeneratedExportCardOutput | void> | GeneratedExportCardOutput | void;
  onDownload?: (generated: {
    fileName: string;
    content: string;
    format: "Text" | "JSON" | "HTML";
    exportMemoId?: string;
    storageKey?: string;
    downloadUrl?: string;
    expiresAt?: string;
  }) => Promise<ExportDownloadResult | void> | ExportDownloadResult | void;
}

function downloadMockExport(fileName: string, content: string, format: ExportCardProps["format"]) {
  const mimeType =
    format === "JSON" ? "application/json" : format === "HTML" ? "text/html" : "text/plain";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadSignedExport(downloadUrl: string, fileName: string) {
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  anchor.click();
}

export function ExportCard({
  title,
  description,
  format,
  content,
  fileName,
  disabled,
  gateMessage,
  testId,
  onGenerate,
  onDownload
}: ExportCardProps) {
  const [generated, setGenerated] = useState<{
    content: string;
    fileName: string;
    format: "Text" | "JSON" | "HTML";
    exportMemoId?: string;
    storageKey?: string;
    downloadUrl?: string;
    expiresAt?: string;
  }>({ content, fileName, format });
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>();

  const runGenerate = async () => {
    if (disabled) {
      throw new Error(gateMessage || "This export is not ready yet.");
    }

    if (hasGenerated) {
      return generated;
    }

    if (!onGenerate) {
      return generated;
    }

    setIsGenerating(true);
    setError(undefined);

    try {
      const next = await onGenerate();
      const resolved = next
        ? {
            content: next.content || generated.content,
            fileName: next.fileName || generated.fileName,
            format: next.format || generated.format,
            exportMemoId: next.exportMemoId || generated.exportMemoId,
            storageKey: next.storageKey || generated.storageKey,
            downloadUrl: next.downloadUrl || generated.downloadUrl,
            expiresAt: next.expiresAt || generated.expiresAt
          }
        : generated;

      setGenerated(resolved);
      setHasGenerated(true);

      return resolved;
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : "Unable to generate export.";
      setError(message);
      throw generateError;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const next = await runGenerate();
    const downloadResult = await onDownload?.(next);
    const signedDownloadUrl = downloadResult?.downloadUrl || next.downloadUrl;

    if (signedDownloadUrl) {
      downloadSignedExport(signedDownloadUrl, next.fileName);
      return;
    }

    downloadMockExport(next.fileName, next.content, next.format);
  };

  return (
    <article className="rounded-lg border bg-white p-5 shadow-panel" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{format}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Dialog onOpenChange={(open) => open && void runGenerate()}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={disabled || isGenerating}>
              <Eye className="h-4 w-4" />
              {isGenerating ? "Generating" : "Preview"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {generated.format === "HTML" ? (
              <iframe
                className="h-[58vh] w-full rounded-md border bg-white"
                srcDoc={generated.content}
                title={`${title} preview`}
              />
            ) : (
              <pre className="claims-scrollbar max-h-[58vh] overflow-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {generated.content}
              </pre>
            )}
            <DialogFooter>
              <Button onClick={() => void handleDownload()} disabled={disabled || isGenerating}>
                <Download className="h-4 w-4" />
                {isGenerating ? "Generating" : "Download export"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={() => void handleDownload()} disabled={disabled || isGenerating}>
          <Download className="h-4 w-4" />
          {isGenerating ? "Generating" : "Download"}
        </Button>
      </div>
      {disabled && gateMessage && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{gateMessage}</p>
      )}
      {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-xs leading-5 text-red-800">{error}</p>}
    </article>
  );
}
