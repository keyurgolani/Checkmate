/**
 * Dashboard Summary API Route
 * 
 * Generates and caches AI-powered dashboard summaries for users.
 * Summaries are cached for 24 hours and stored in user preferences.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { LLMService } from '@/lib/services/llm';
import { WorkspaceService, type WorkspaceStatistics } from '@/lib/services/workspace';
import { ChecklistService } from '@/lib/services/checklist';
import type { DashboardSummary, LLMSettings } from '@/lib/pocketbase-types';

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a cached summary is still valid (less than 24 hours old)
 */
function isCacheValid(summary: DashboardSummary | undefined): boolean {
  if (!summary?.generatedAt) return false;
  const generatedTime = new Date(summary.generatedAt).getTime();
  return Date.now() - generatedTime < CACHE_DURATION_MS;
}

// ============================================================================
// API Handler
// ============================================================================

export async function GET(request: NextRequest) {
  // Check for force refresh query param
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  
  const { isAuthenticated, user, pb } = await getServerAuth();
  
  if (!isAuthenticated || !user) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const cachedSummary = user.preferences?.dashboardSummary;
  
  // Return cached if valid and not forcing refresh
  if (!forceRefresh && isCacheValid(cachedSummary)) {
    return NextResponse.json({ 
      success: true, 
      summary: cachedSummary,
      cached: true 
    });
  }

  // Check if LLM is configured
  const llmSettings = user.preferences?.llmSettings;
  if (!llmSettings?.provider || !llmSettings?.selectedModel) {
    return NextResponse.json({ 
      success: false, 
      error: { message: 'LLM not configured' },
      needsConfiguration: true
    });
  }

  // Gather stats for summary generation
  try {
    const workspaceService = new WorkspaceService(pb);
    const checklistService = new ChecklistService(pb);

    // Get workspaces and calculate template count
    const workspacesResult = await workspaceService.getByOwner({ limit: 100 });
    let totalTemplates = 0;
    for (const workspace of workspacesResult.items) {
      try {
        const stats: WorkspaceStatistics = await workspaceService.getStatistics(workspace.id);
        totalTemplates += stats.templateCount ?? 0;
      } catch {
        // Ignore errors for individual workspaces
      }
    }

    // Get checklists
    const checklists = await checklistService.getByUser({ 
      sort: '-updated', 
      expand: 'blueprint' 
    });
    
    const activeChecklistsList = checklists.filter(c => (c.progress ?? 0) < 100);
    const completedChecklistsList = checklists.filter(c => (c.progress ?? 0) >= 100);
    
    // Calculate overall progress
    let overallProgress = 0;
    if (activeChecklistsList.length > 0) {
      overallProgress = activeChecklistsList.reduce(
        (sum, c) => sum + (c.progress ?? 0), 
        0
      ) / activeChecklistsList.length;
    }

    // Get recent activity (last 5 checklist names and their progress)
    const recentActivity = checklists.slice(0, 5).map(c => {
      const expandedTemplate = c.expand?.blueprint as { title?: string } | undefined;
      const templateTitle = expandedTemplate?.title || 'Unknown';
      return `${c.name} (${Math.round(c.progress || 0)}% complete, from "${templateTitle}")`;
    });

    const statsSnapshot = {
      totalTemplates,
      activeChecklists: activeChecklistsList.length,
      completedChecklists: completedChecklistsList.length,
      overallProgress: Math.round(overallProgress),
      recentActivity,
    };

    // Generate summary using LLM
    const llmService = new LLMService();
    const prompt = `You are a helpful productivity assistant. Generate a brief, encouraging summary (2-3 sentences max) of the user's current state based on these stats:

- Total templates created: ${statsSnapshot.totalTemplates}
- Active checklists in progress: ${statsSnapshot.activeChecklists}
- Completed checklists: ${statsSnapshot.completedChecklists}
- Average progress on active tasks: ${statsSnapshot.overallProgress}%
- Recent activity: ${recentActivity.length > 0 ? recentActivity.join('; ') : 'No recent activity'}

Be conversational, warm, and motivating. Focus on what they've accomplished and gently encourage next steps. If they have no activity, welcome them and suggest getting started. Keep it under 50 words.`;

    const result = await llmService.generateText(llmSettings as LLMSettings, prompt);
    
    if (!result.success || !result.text) {
      return NextResponse.json({ 
        success: false, 
        error: { message: result.error?.message || 'Failed to generate summary' }
      }, { status: 500 });
    }

    // Create new summary
    const newSummary: DashboardSummary = {
      content: result.text,
      generatedAt: new Date().toISOString(),
      statsSnapshot,
    };

    // Save to user preferences
    const updatedPreferences = {
      ...user.preferences,
      dashboardSummary: newSummary,
    };

    await pb.collection('users').update(user.id, {
      preferences: updatedPreferences,
    });

    return NextResponse.json({ 
      success: true, 
      summary: newSummary,
      cached: false 
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ 
      success: false, 
      error: { message: 'Failed to generate summary' }
    }, { status: 500 });
  }
}
