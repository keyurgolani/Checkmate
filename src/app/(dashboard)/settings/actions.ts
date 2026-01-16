"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { setAuthCookie, type AuthCookieData } from "@/lib/auth-cookies";

export interface UpdateProfileInput {
  displayName: string;
}

export interface SettingsActionResult {
  success: boolean;
  error?: string;
}

export async function updateDisplayName(input: UpdateProfileInput): Promise<SettingsActionResult> {
  const { isAuthenticated, pb, user } = await getServerAuth();
  
  if (!isAuthenticated || !user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const updatedRecord = await pb.collection("users").update(user.id, {
      displayName: input.displayName,
    });

    // Update the auth cookie with new display name
    const authData: AuthCookieData = {
      token: pb.authStore.token,
      model: {
        id: updatedRecord.id,
        collectionId: updatedRecord.collectionId,
        collectionName: "users",
        email: updatedRecord.email,
        displayName: updatedRecord.displayName ?? null,
        verified: updatedRecord.verified ?? false,
        emailVisibility: updatedRecord.emailVisibility ?? false,
        avatarUrl: updatedRecord.avatarUrl ?? null,
        preferences: updatedRecord.preferences ?? null,
        created: updatedRecord.created,
        updated: updatedRecord.updated,
      },
    };
    
    await setAuthCookie(authData);

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update display name" 
    };
  }
}
