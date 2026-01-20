"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, cn } from "@/lib/utils";
import { updateDisplayName } from "./actions";
import { useUnifiedThemeStore, themePresets, colorThemes } from "@/lib/themes";
import { Mail, Calendar, Palette, AlertTriangle, Check, Sparkles, Shield } from "lucide-react";

interface SettingsFormProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl?: string | null;
    created: string;
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

function SettingsCard({ 
  children, 
  className,
  danger = false,
}: { 
  children: React.ReactNode; 
  className?: string;
  danger?: boolean;
}) {
  return (
    <motion.div
      variants={item}
      data-slot="card"
      className={cn(
        "rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-5",
        danger && "border-destructive/50",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function SettingsForm({ user }: SettingsFormProps) {
  const themeStore = useUnifiedThemeStore();
  const [mounted, setMounted] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(user.displayName ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const result = await updateDisplayName({ displayName });
    
    if (result.success) {
      setMessage({ type: "success", text: "Display name updated successfully" });
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to update" });
    }
    
    setIsSaving(false);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-3xl pb-20"
    >
      {/* Profile Header */}
      <motion.div variants={item} className="flex items-center gap-4 mb-8">
        <Avatar className="h-20 w-20 border-4 border-background shadow-xl shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || "User"} />
          <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold truncate">{user.displayName || "User"}</h2>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Shield className="h-3 w-3" />
            Member since {formatDate(user.created, { format: "year" })}
          </p>
        </div>
      </motion.div>

      {/* Two column grid for Profile and Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Profile Section */}
        <SettingsCard>
          <h3 className="font-medium mb-4">Display Name</h3>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={100}
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Visible to other users.
            </p>
            {message && (
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-lg",
                message.type === "success" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-destructive/10 text-destructive"
              )}>
                {message.type === "success" && <Check className="h-3 w-3" />}
                {message.text}
              </div>
            )}
            <Button type="submit" disabled={isSaving} size="sm" className="rounded-lg">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingsCard>

        {/* Account Section */}
        <SettingsCard>
          <h3 className="font-medium mb-4">Account Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm">{formatDate(user.created, { format: "long" })}</p>
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      {/* Preferences Section */}
      <SettingsCard className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Theme</h3>
          </div>
          <Button 
            onClick={() => themeStore.openThemePopup()}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Theme Studio
          </Button>
        </div>

        {mounted && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['clean-light', 'clean-dark', 'midnight-blue', 'forest'].map((presetId) => {
              const preset = themePresets[presetId];
              if (!preset) return null;
              const colorTheme = colorThemes[preset.colorThemeId];
              const isSelected = themeStore.activePresetId === presetId;

              return (
                <button
                  key={presetId}
                  onClick={() => themeStore.applyPreset(presetId)}
                  className={cn(
                    "relative p-3 rounded-lg border-2 text-left transition-all",
                    "hover:border-primary/50",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex gap-1 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full border shadow-sm"
                      style={{ background: colorTheme?.colors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border shadow-sm"
                      style={{ background: colorTheme?.colors.secondary }}
                    />
                  </div>
                  <span className="text-xs font-medium block truncate">{preset.name}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 p-0.5 rounded-full bg-primary">
                      <Check className="h-2 w-2 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SettingsCard>

      {/* Danger Zone */}
      <SettingsCard danger>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="min-w-0">
              <h3 className="font-medium text-destructive">Delete Account</h3>
              <p className="text-xs text-muted-foreground truncate">
                Permanently delete your account and data.
              </p>
            </div>
          </div>
          <Button variant="destructive" disabled size="sm" className="rounded-lg shrink-0">
            Delete
          </Button>
        </div>
      </SettingsCard>
    </motion.div>
  );
}
