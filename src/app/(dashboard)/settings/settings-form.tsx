"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDate, cn } from "@/lib/utils";
import { updateDisplayName } from "./actions";
import { useUnifiedThemeStore, themePresets, colorThemes } from "@/lib/themes";
import { User, Mail, Calendar, Palette, AlertTriangle, Check, Sparkles } from "lucide-react";

interface SettingsFormProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    created: string;
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

function SettingsCard({ 
  children, 
  className,
  danger = false 
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
        "card rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-6",
        danger && "border-destructive/50",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function SettingsForm({ user }: SettingsFormProps) {
  // Removed unused next-themes hooks
  const themeStore = useUnifiedThemeStore();
  const [mounted, setMounted] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(user.displayName ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
      className="space-y-6 w-full pb-20"
    >
      {/* Profile Section */}
      <SettingsCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
          </div>
        </div>
        
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={100}
              className="rounded-xl"
            />
            <p className="text-sm text-muted-foreground">
              This is the name that will be displayed to other users.
            </p>
          </div>
          {message && (
            <div className={cn(
              "flex items-center gap-2 text-sm p-3 rounded-xl",
              message.type === "success" 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
            )}>
              {message.type === "success" && <Check className="h-4 w-4" />}
              {message.text}
            </div>
          )}
          <Button type="submit" disabled={isSaving} className="rounded-xl">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </SettingsCard>

      {/* Account Section */}
      <SettingsCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Account</h2>
            <p className="text-sm text-muted-foreground">Your account information.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              autoComplete="email" 
              value={user.email} 
              disabled 
              readOnly 
              className="rounded-xl bg-muted/50"
            />
            <p className="text-sm text-muted-foreground">
              Your email address cannot be changed.
            </p>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-sm">Account Created</Label>
              <p className="text-sm text-muted-foreground">{formatDate(user.created, { format: "long" })}</p>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Preferences Section */}
      <SettingsCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Preferences</h2>
            <p className="text-sm text-muted-foreground">Customize your experience.</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base">Theme Presets</Label>
              <p className="text-sm text-muted-foreground">
                Select a preset or open the studio for full customization.
              </p>
            </div>
            <Button 
              onClick={() => themeStore.openThemePopup()}
              className="w-full sm:w-auto gap-2"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              Open Theme Studio
            </Button>
          </div>

          {mounted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      "relative p-4 rounded-xl border-2 text-left transition-all group",
                      "hover:border-primary/50 hover:shadow-md",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex gap-1.5 mb-3">
                      <div 
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ background: colorTheme?.colors.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ background: colorTheme?.colors.secondary }}
                      />
                    </div>
                    <span className="font-medium block">{preset.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{preset.designLanguage.replace('-', ' ')}</span>
                    {isSelected && (
                      <div className="absolute top-3 right-3 p-1 rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Danger Zone */}
      <SettingsCard danger>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">Irreversible and destructive actions.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="font-medium">Delete Account</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <Button variant="destructive" disabled className="w-full sm:w-auto rounded-xl">
            Delete Account
          </Button>
        </div>
      </SettingsCard>
    </motion.div>
  );
}
