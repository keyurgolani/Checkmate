"use client";

/**
 * AI Summary Component
 * 
 * Displays an AI-generated summary of the user's dashboard state.
 * Features:
 * - Daily caching with 24-hour TTL
 * - Manual refresh capability
 * - Graceful degradation when LLM is not configured
 * - Loading and error states
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { DashboardSummary } from "@/lib/pocketbase-types";
import { streamCollect, simpleFetch, classifyFetchError } from "@/lib/services/relay-client";

// ============================================================================
// Types
// ============================================================================

interface AISummaryProps {
  /** Pre-fetched summary from server (if available) */
  initialSummary: DashboardSummary | null;
  /** Whether the user has configured an LLM provider */
  llmConfigured: boolean;
}

interface SummaryResponse {
  success: boolean;
  summary?: DashboardSummary;
  cached?: boolean;
  needsConfiguration?: boolean;
  selfHostedRelay?: boolean;
  requestSpec?: { url: string; method: string; headers: Record<string, string>; body?: string; responseHandling: string };
  statsSnapshot?: Record<string, unknown>;
  error?: { message: string };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Formats the generation time in a hydration-safe way.
 * Returns a stable string that can be computed on both server and client.
 */
function formatTimeAgo(generatedAt: string): string {
  const generatedDate = new Date(generatedAt);
  const now = new Date();
  
  // Use UTC comparison to avoid timezone issues
  const isToday = 
    generatedDate.getUTCFullYear() === now.getUTCFullYear() &&
    generatedDate.getUTCMonth() === now.getUTCMonth() &&
    generatedDate.getUTCDate() === now.getUTCDate();
  
  if (isToday) {
    // Use UTC hours/minutes for consistent server/client rendering
    const hours = generatedDate.getUTCHours().toString().padStart(2, '0');
    const minutes = generatedDate.getUTCMinutes().toString().padStart(2, '0');
    return `Today at ${hours}:${minutes} UTC`;
  }
  
  // Use ISO date format for consistency
  const isoDate = generatedDate.toISOString().split('T')[0];
  return isoDate ?? generatedDate.toISOString();
}

export function AISummary({ initialSummary, llmConfigured }: AISummaryProps) {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(initialSummary);
  const [isLoading, setIsLoading] = React.useState(!initialSummary && llmConfigured);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [timeAgo, setTimeAgo] = React.useState<string>(() => 
    initialSummary ? formatTimeAgo(initialSummary.generatedAt) : ''
  );

  // Update time display on client after hydration (for local timezone)
  React.useEffect(() => {
    if (summary?.generatedAt) {
      const generatedDate = new Date(summary.generatedAt);
      const now = new Date();
      const isToday = now.toDateString() === generatedDate.toDateString();
      
      if (isToday) {
        setTimeAgo(`Today at ${generatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        setTimeAgo(generatedDate.toLocaleDateString());
      }
    }
  }, [summary?.generatedAt]);

  // Fetch summary on mount if not provided and LLM is configured
  React.useEffect(() => {
    if (!initialSummary && llmConfigured) {
      fetchSummary();
    }
  }, [initialSummary, llmConfigured]);

  const fetchSummary = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const url = forceRefresh
        ? '/api/dashboard/summary?refresh=true'
        : '/api/dashboard/summary';
      const response = await fetch(url);
      const data: SummaryResponse = await response.json();

      // Handle self-hosted relay response
      if (data.success && data.selfHostedRelay) {
        let rawResponse: string;
        try {
          if (data.requestSpec?.responseHandling === 'stream-collect') {
            rawResponse = await streamCollect(data.requestSpec as Parameters<typeof streamCollect>[0]);
          } else {
            rawResponse = await simpleFetch(data.requestSpec as Parameters<typeof simpleFetch>[0]);
          }
        } catch (err) {
          setError(classifyFetchError(err, data.requestSpec?.url ?? ''));
          return;
        }

        const saveResponse = await fetch('/api/dashboard/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawResponse, statsSnapshot: data.statsSnapshot }),
        });
        const saveData = await saveResponse.json();
        if (saveData.success && saveData.summary) {
          setSummary(saveData.summary);
        } else {
          setError(saveData.error?.message || 'Failed to process summary');
        }
        return;
      }

      // Normal cloud path
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else if (data.needsConfiguration) {
        // LLM not configured - don't show error, component will show config prompt
      } else {
        setError(data.error?.message || 'Failed to load summary');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Don't render anything if LLM is not configured - show configuration prompt
  if (!llmConfigured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[var(--radius)] border border-dashed border-muted-foreground/20 bg-muted/30 p-4 flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            Configure an AI provider in Settings to get personalized daily insights.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configure
          </Link>
        </Button>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius)] border bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 animate-pulse">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3"
      >
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive flex-1">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => fetchSummary()}>
          Retry
        </Button>
      </motion.div>
    );
  }

  // No summary available
  if (!summary) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius)] border bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 p-4 relative overflow-hidden group"
    >
      {/* Subtle animated gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-primary">AI Insight</span>
            <span className="text-xs text-muted-foreground">• {timeAgo}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {summary.content}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => fetchSummary(true)}
          disabled={isRefreshing}
          title="Refresh summary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </motion.div>
  );
}
