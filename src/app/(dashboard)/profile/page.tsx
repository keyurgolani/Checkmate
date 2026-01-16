import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui/page-header";
import { User as UserIcon, Mail, Calendar, Edit, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function ProfilePage() {
  const { isAuthenticated, user } = await getServerAuth();

  if (!isAuthenticated || !user) {
    redirect("/signin");
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div className="w-full space-y-8">
      <PageHeader
        title="Profile"
        description="View your public profile information."
        icon={<UserIcon className="h-6 w-6" />}
        gradient
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Profile Card */}
        <Card className="col-span-2 md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || "User"} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">{user.displayName || "User"}</CardTitle>
              <CardDescription className="text-base flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Member since {formatDate(user.created, { format: "year" })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="flex gap-4">
              <Button asChild className="w-full gap-2 shadow-lg hover:shadow-primary/25">
                <Link href="/settings">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Your account details and visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-background shadow-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Email Address</p>
                <p className="text-sm text-muted-foreground break-all">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-background shadow-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Joined</p>
                <p className="text-sm text-muted-foreground">{formatDate(user.created, { format: "long" })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
