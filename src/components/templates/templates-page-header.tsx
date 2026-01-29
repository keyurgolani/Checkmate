"use client";

/**
 * Templates Page Header Component
 *
 * Client component that provides the page header with import and AI generation functionality.
 * Includes the import dialog for creating templates from files and AI generation dialog.
 *
 * Requirements: 11.3 - Import templates from files
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, Plus, Upload, Sparkles } from "lucide-react";
import Link from "next/link";
import { ImportDialog } from "./import-dialog";
import { AIGenerateDialog } from "./ai-generate-dialog";
import { useRouter } from "next/navigation";
import type { LLMSettings } from "@/lib/pocketbase-types";

interface Workspace {
  id: string;
  name: string;
}

interface TemplatesPageHeaderProps {
  defaultWorkspaceId: string;
  workspaces: Workspace[];
  llmSettings: LLMSettings | null;
}

export function TemplatesPageHeader({ 
  defaultWorkspaceId, 
  workspaces,
  llmSettings,
}: TemplatesPageHeaderProps) {
  const router = useRouter();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const handleImportSuccess = (templateId: string) => {
    router.push(`/templates/${templateId}`);
    router.refresh();
  };

  const handleAISuccess = (templateId: string) => {
    router.push(`/templates/${templateId}`);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title="Templates"
        description="Create and manage your checklist templates."
        icon={<FileText className="h-6 w-6" />}
        gradient
      >
        <Button 
          variant="outline" 
          onClick={() => setShowAIDialog(true)} 
          className="rounded-xl gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-primary"
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
        <Button variant="outline" onClick={() => setShowImportDialog(true)} className="rounded-xl gap-2 border-border/50 hover:bg-muted/50">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button asChild className="rounded-xl gap-2">
          <Link href="/templates/new">
            <Plus className="h-4 w-4" />
            New Template
          </Link>
        </Button>
      </PageHeader>

      <ImportDialog
        workspaceId={defaultWorkspaceId}
        isOpen={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />

      <AIGenerateDialog
        isOpen={showAIDialog}
        onOpenChange={setShowAIDialog}
        workspaces={workspaces}
        defaultWorkspaceId={defaultWorkspaceId}
        llmSettings={llmSettings}
        onSuccess={handleAISuccess}
      />
    </>
  );
}
