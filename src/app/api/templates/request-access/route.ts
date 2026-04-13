import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { NotificationService } from "@/lib/services/notification";
import { createAdminClient } from "@/lib/pocketbase";

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Use admin client to fetch template details including owner
    // We need admin access because the user doesn't have access to this private template yet
    const adminPb = await createAdminClient();
    const templateService = new TemplateService(adminPb);
    const notificationService = new NotificationService(adminPb);

    // Get template with owner
    const templateResult = await templateService.getById(templateId, "owner");

    if (!templateResult.success || !templateResult.data) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    const template = templateResult.data;

    if (!template.owner) {
      return NextResponse.json(
        { success: false, error: "Template has no owner" },
        { status: 400 }
      );
    }

    // Check if user is already the owner
    if (template.owner === user.id) {
       return NextResponse.json(
        { success: false, error: "You are already the owner of this template" },
        { status: 400 }
      );
    }

    // Send notification to owner
    const notificationResult = await notificationService.createAccessRequestNotification({
      userId: template.owner,
      blueprintId: template.id,
      blueprintTitle: template.title,
      requesterId: user.id,
      requesterName: user.displayName || user.email || "A user",
    });

    if (!notificationResult.success) {
      console.error("Failed to create notification:", notificationResult.error);
       return NextResponse.json(
        { success: false, error: "Failed to send request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing access request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
