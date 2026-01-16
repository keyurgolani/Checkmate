"use client";

/**
 * Export Dialog Component
 *
 * Provides export functionality for templates with format selection.
 * Supports JSON, CSV, and Markdown formats.
 *
 * Requirements: 11.1
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = "json" | "csv" | "markdown";

interface ExportDialogProps {
  templateId: string;
  templateTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileJson;
  extension: string;
}> = [
  {
    value: "json",
    label: "JSON",
    description: "Full structured data with all metadata",
    icon: FileJson,
    extension: ".json",
  },
  {
    value: "csv",
    label: "CSV",
    description: "Spreadsheet-compatible tabular format",
    icon: FileSpreadsheet,
    extension: ".csv",
  },
  {
    value: "markdown",
    label: "Markdown",
    description: "Human-readable documentation format",
    icon: FileText,
    extension: ".md",
  },
];

// ============================================================================
// Export Dialog Component
// ============================================================================

export function ExportDialog({
  templateId,
  templateTitle,
  isOpen,
  onOpenChange,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        includeMetadata: includeMetadata.toString(),
      });

      const response = await fetch(
        `/api/templates/${templateId}/export?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Export failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${templateTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${selectedFormat === "markdown" ? "md" : selectedFormat}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [templateId, templateTitle, selectedFormat, includeMetadata, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" aria-label="Export template">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Export Template</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Download &quot;{templateTitle}&quot;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
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
                <span>Export successful! Download started.</span>
              </div>
            )}

            {/* Format Selection */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Export Format</legend>
              <div className="grid gap-2" role="radiogroup" aria-label="Export format options">
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedFormat === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedFormat(option.value)}
                      disabled={isExporting}
                      role="radio"
                      aria-checked={isSelected}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary/30 bg-primary/5"
                          : "border-transparent hover:border-muted hover:bg-muted/50"
                      } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{option.label}</span>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                            {option.extension}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Options */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Options</legend>
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-muted hover:bg-muted/30 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  disabled={isExporting}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium">Include metadata</span>
                  <p className="text-xs text-muted-foreground">
                    Include timestamps, IDs, and other metadata
                  </p>
                </div>
              </label>
            </fieldset>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="rounded-lg"
            aria-label={`Export as ${FORMAT_OPTIONS.find(f => f.value === selectedFormat)?.label}`}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
