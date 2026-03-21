"use client";

/**
 * Import Dialog Component
 *
 * Provides import functionality for templates with file upload.
 * Only JSON format is supported for import. CSV and Markdown exports
 * are for personal use only and cannot be re-imported.
 *
 * Requirements: 11.3
 */

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileJson,
  Loader2,
  Check,
  AlertCircle,
  X,
  File,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

export type ImportFormat = "json";

interface ImportDialogProps {
  workspaceId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (templateId: string) => void;
}

interface ImportPreview {
  filename: string;
  format: ImportFormat | null;
  size: string;
  content: string;
}

// ============================================================================
// Constants
// ============================================================================

const FORMAT_INFO: Record<
  ImportFormat,
  { label: string; icon: typeof FileJson; extensions: string[] }
> = {
  json: {
    label: "JSON",
    icon: FileJson,
    extensions: [".json"],
  },
};

const ACCEPTED_EXTENSIONS = [".json"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectFormatFromExtension(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (ext === ".json") return "json";
  return null;
}

// ============================================================================
// Import Dialog Component
// ============================================================================

export function ImportDialog({
  workspaceId,
  isOpen,
  onOpenChange,
  onSuccess,
}: ImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [titleOverride, setTitleOverride] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);
      setWarnings([]);

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
        return;
      }

      // Validate extension
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(
          `Unsupported file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(", ")}`
        );
        return;
      }

      // Read file content
      try {
        const content = await file.text();
        const format = detectFormatFromExtension(file.name);

        setPreview({
          filename: file.name,
          format,
          size: formatFileSize(file.size),
          content,
        });
      } catch (err) {
        console.error("Failed to read file:", err);
        setError("Failed to read file");
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      // Create a synthetic event to reuse handleFileSelect logic
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Trigger the change event
        const changeEvent = new Event("change", { bubbles: true });
        input.dispatchEvent(changeEvent);
      }
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleClearFile = useCallback(() => {
    setPreview(null);
    setTitleOverride("");
    setError(null);
    setWarnings([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!preview) return;

    setIsImporting(true);
    setError(null);
    setWarnings([]);
    setSuccess(false);

    try {
      const response = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: preview.content,
          workspaceId,
          format: preview.format || undefined,
          title: titleOverride.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Import failed");
      }

      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      setSuccess(true);

      // Navigate to the new template after a short delay
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(data.templateId);
        } else {
          router.push(`/templates/${data.templateId}`);
        }
      }, 1500);
    } catch (err) {
      console.error("Import failed:", err);
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [preview, workspaceId, titleOverride, onOpenChange, onSuccess, router]);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      handleClearFile();
      onOpenChange(false);
    }
  }, [isImporting, handleClearFile, onOpenChange]);

  const FormatIcon = preview?.format ? FORMAT_INFO[preview.format].icon : File;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl rounded-[var(--radius)] border bg-card/95 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Import Template</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Upload a checklist file to create a new template
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div 
                className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div 
                className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/50"
                role="status"
                aria-live="polite"
              >
                <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Import successful! Redirecting...</span>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div 
                className="p-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/50"
                role="alert"
                aria-live="polite"
              >
                <div className="font-medium mb-1">Warnings:</div>
                <ul className="list-disc list-inside space-y-1 text-xs" role="list">
                  {warnings.map((warning, index) => (
                    <li key={index} role="listitem">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* File Upload Area */}
            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Drop a file here or click to browse. Supports JSON files"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Select file to import"
                />
                <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium mb-1">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JSON format (max {formatFileSize(MAX_FILE_SIZE)})
                </p>
              </div>
            ) : (
              /* File Preview */
              <div className="border rounded-xl p-4 bg-muted/20" role="region" aria-label="Selected file preview">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl" aria-hidden="true">
                    <FormatIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{preview.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {preview.format
                        ? FORMAT_INFO[preview.format].label
                        : "Unknown format"}{" "}
                      • {preview.size}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleClearFile}
                    disabled={isImporting}
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {/* Title Override */}
            {preview && (
              <div className="space-y-2">
                <Label htmlFor="title-override" className="text-sm font-medium">
                  Template Title (optional)
                </Label>
                <Input
                  id="title-override"
                  placeholder="Leave empty to use title from file"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  disabled={isImporting}
                  maxLength={200}
                  className="rounded-lg"
                  aria-describedby="title-override-desc"
                  autoComplete="off"
                />
                <p id="title-override-desc" className="text-xs text-muted-foreground">
                  Override the title from the imported file
                </p>
              </div>
            )}

            {/* Supported Formats Info */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" id="supported-formats-label">Supported Format</Label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border" role="region" aria-labelledby="supported-formats-label">
                <div className="p-1.5 rounded-lg bg-background">
                  <FileJson className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-medium">JSON</span>
                  <span className="text-[10px] text-muted-foreground ml-2">.json</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV and Markdown exports are for personal use and cannot be re-imported.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={handleClose} disabled={isImporting} className="rounded-lg">
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!preview || isImporting}
            className="rounded-lg"
            aria-label={preview ? `Import ${preview.filename}` : "Import template"}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
