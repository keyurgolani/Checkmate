import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/pocketbase';
import { getDefaultPreferences } from '@/lib/services/preferences';

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || 'demo@checkmate.local';

const DEMO_OWNED_COLLECTIONS = [
  'activityLog',
  'notifications',
  'collaborators',
  'instanceItems',
  'instances',
  'items',
  'blueprints',
  'workspaces',
] as const;

const COLLECTION_OWNER_FIELDS: Record<string, string> = {
  instances: 'user',
  instanceItems: 'createdBy',
  blueprints: 'createdBy',
  items: 'createdBy',
  workspaces: 'owner',
  collaborators: 'user',
  notifications: 'recipient',
  activityLog: 'user',
};

export async function resetDemoUserData(userId: string): Promise<void> {
  const adminPb = await createAdminClient();

  for (const collection of DEMO_OWNED_COLLECTIONS) {
    try {
      const ownerField = COLLECTION_OWNER_FIELDS[collection] || 'createdBy';
      const records = await adminPb.collection(collection).getFullList({
        filter: `${ownerField} = "${userId}"`,
        fields: 'id',
      });
      for (const record of records) {
        try {
          await adminPb.collection(collection).delete(record.id);
        } catch {
          // skip records blocked by relation constraints
        }
      }
    } catch {
      // collection may not exist yet
    }
  }

  await adminPb.collection('users').update(userId, {
    displayName: 'Demo User',
    preferences: getDefaultPreferences(),
  });

  console.log(`[Demo Reset] Wiped data for demo user ${userId}`);
}

interface DemoResetResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DemoResetResponse>> {
  try {
    const body = await request.json();
    const { userId, email } = body as { userId?: string; email?: string };

    if (!userId || email !== DEMO_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Not a demo user' },
        { status: 403 }
      );
    }

    await resetDemoUserData(userId);
    return NextResponse.json({ success: true, message: 'Demo data reset' });
  } catch (error) {
    console.error('[Demo Reset] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Reset failed' },
      { status: 500 }
    );
  }
}
