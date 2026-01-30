"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { formatDate, cn } from "@/lib/utils";
import { updateDisplayName, updateLLMSettings } from "./actions";
import { useUnifiedThemeStore, themePresets, colorThemes } from "@/lib/themes";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLMProvider, WebResearchProvider, type LLMSettings, type LLMModel, type WebResearchSettings } from "@/lib/pocketbase-types";
import { PROVIDER_CONFIG } from "@/lib/services/llm";
import { WEB_RESEARCH_PROVIDER_CONFIG } from "@/lib/services/web-research";
import { Mail, Calendar, Palette, AlertTriangle, Check, Sparkles, Shield, Bot, Key, Server, Loader2, RefreshCw, Globe, Search } from "lucide-react";

interface SettingsFormProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl?: string | null;
    created: string;
    preferences?: {
      llmSettings?: LLMSettings;
    } | null;
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

  // LLM Settings State
  const [llmProvider, setLlmProvider] = React.useState<LLMProvider | ''>(
    user.preferences?.llmSettings?.provider || ''
  );
  const [llmApiKey, setLlmApiKey] = React.useState(
    user.preferences?.llmSettings?.apiKey || ''
  );
  const [llmBaseUrl, setLlmBaseUrl] = React.useState(
    user.preferences?.llmSettings?.baseUrl || ''
  );
  const [llmSelectedModel, setLlmSelectedModel] = React.useState(
    user.preferences?.llmSettings?.selectedModel || ''
  );
  const [llmModels, setLlmModels] = React.useState<LLMModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);
  const [isSavingLLM, setIsSavingLLM] = React.useState(false);
  const [llmMessage, setLlmMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Web Research Settings State
  const [webResearchEnabled, setWebResearchEnabled] = React.useState(
    user.preferences?.llmSettings?.webResearch?.enabled || false
  );
  const [webResearchProvider, setWebResearchProvider] = React.useState<WebResearchProvider | ''>(
    user.preferences?.llmSettings?.webResearch?.provider || ''
  );
  const [webResearchApiKey, setWebResearchApiKey] = React.useState(
    user.preferences?.llmSettings?.webResearch?.apiKey || ''
  );
  const [webResearchBaseUrl, setWebResearchBaseUrl] = React.useState(
    user.preferences?.llmSettings?.webResearch?.baseUrl || ''
  );

  // Get the current web research provider config
  const webResearchProviderConfig = webResearchProvider 
    ? WEB_RESEARCH_PROVIDER_CONFIG[webResearchProvider as WebResearchProvider] 
    : null;

  // Check if web research should be available (non-Perplexity provider)
  const showWebResearch = llmProvider && llmProvider !== LLMProvider.PERPLEXITY;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchModels = React.useCallback(async () => {
    if (!llmProvider) return;
    
    const config = PROVIDER_CONFIG[llmProvider as LLMProvider];
    if (config.requiresApiKey && !llmApiKey) return;

    setIsLoadingModels(true);
    setLlmMessage(null);

    try {
      const response = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmProvider,
          apiKey: llmApiKey,
          baseUrl: llmBaseUrl || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLlmModels(data.models);
        if (data.models.length > 0 && !llmSelectedModel) {
          setLlmSelectedModel(data.models[0].id);
        }
      } else {
        setLlmMessage({ type: "error", text: data.error?.message || "Failed to fetch models" });
      }
    } catch {
      setLlmMessage({ type: "error", text: "Failed to connect to provider" });
    } finally {
      setIsLoadingModels(false);
    }
  }, [llmProvider, llmApiKey, llmBaseUrl, llmSelectedModel]);

  const handleSaveLLMSettings = async () => {
    setIsSavingLLM(true);
    setLlmMessage(null);

    // Build web research settings if applicable
    const webResearch: WebResearchSettings | null = showWebResearch && webResearchEnabled
      ? {
          enabled: webResearchEnabled,
          provider: webResearchProvider as WebResearchProvider || null,
          apiKey: webResearchApiKey || null,
          baseUrl: webResearchBaseUrl || null,
        }
      : null;

    const result = await updateLLMSettings({
      llmSettings: {
        provider: llmProvider as LLMProvider || null,
        apiKey: llmApiKey || null,
        baseUrl: llmBaseUrl || null,
        selectedModel: llmSelectedModel || null,
        webResearch,
      },
    });

    if (result.success) {
      setLlmMessage({ type: "success", text: "AI settings saved successfully" });
    } else {
      setLlmMessage({ type: "error", text: result.error ?? "Failed to save settings" });
    }

    setIsSavingLLM(false);
  };

  // Auto-fetch models when provider or API key changes
  React.useEffect(() => {
    if (llmProvider) {
      const config = PROVIDER_CONFIG[llmProvider as LLMProvider];
      if (!config.requiresApiKey || llmApiKey) {
        fetchModels();
      }
    }
  }, [llmProvider, llmApiKey, fetchModels]);

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

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
            Member since {formatDate(user.created, { format: "long" })}
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

      {/* AI Configuration Section */}
      <SettingsCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">AI Template Generation</h3>
        </div>
        
        <div className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="llm-provider">Provider</Label>
            <Select value={llmProvider} onValueChange={(v) => {
              setLlmProvider(v as LLMProvider);
              setLlmModels([]);
              setLlmSelectedModel('');
            }}>
              <SelectTrigger id="llm-provider" className="rounded-lg">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
                <SelectItem value="mistral">Mistral AI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="xai">xAI (Grok)</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="perplexity">Perplexity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ollama Base URL */}
          {llmProvider === LLMProvider.OLLAMA && (
            <div className="space-y-2">
              <Label htmlFor="llm-base-url" className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" />
                Ollama URL
              </Label>
              <Input
                id="llm-base-url"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="rounded-lg"
              />
            </div>
          )}

          {/* API Key */}
          {llmProvider && llmProvider !== LLMProvider.OLLAMA && (
            <div className="space-y-2">
              <Label htmlFor="llm-api-key" className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                API Key
              </Label>
              <Input
                id="llm-api-key"
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="rounded-lg"
              />
            </div>
          )}

          {/* Model Selection */}
          {llmProvider && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="llm-model">Model</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchModels}
                  disabled={isLoadingModels}
                  className="h-7 px-2"
                >
                  {isLoadingModels ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <Select value={llmSelectedModel} onValueChange={setLlmSelectedModel} disabled={llmModels.length === 0}>
                <SelectTrigger id="llm-model" className="rounded-lg">
                  <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {llmModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Web Research Section - Only for non-Perplexity providers */}
          {showWebResearch && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="web-research-toggle" className="text-sm font-medium">
                      Web Research
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enhance AI with live internet search
                    </p>
                  </div>
                </div>
                <Switch
                  id="web-research-toggle"
                  checked={webResearchEnabled}
                  onCheckedChange={setWebResearchEnabled}
                />
              </div>

              {webResearchEnabled && (
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  {/* Web Research Provider */}
                  <div className="space-y-2">
                    <Label htmlFor="web-research-provider" className="flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Search Provider
                    </Label>
                    <Select 
                      value={webResearchProvider} 
                      onValueChange={(v) => {
                        setWebResearchProvider(v as WebResearchProvider);
                        // Clear API key and base URL when switching providers
                        setWebResearchApiKey('');
                        setWebResearchBaseUrl('');
                      }}
                    >
                      <SelectTrigger id="web-research-provider" className="rounded-lg">
                        <SelectValue placeholder="Select a search provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tavily">
                          <div className="flex flex-col">
                            <span>Tavily</span>
                            <span className="text-xs text-muted-foreground">AI-optimized search API</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="exa">
                          <div className="flex flex-col">
                            <span>Exa</span>
                            <span className="text-xs text-muted-foreground">Neural search engine</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="firecrawl">
                          <div className="flex flex-col">
                            <span>Firecrawl</span>
                            <span className="text-xs text-muted-foreground">Web scraping and search API</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="brave">
                          <div className="flex flex-col">
                            <span>Brave Search</span>
                            <span className="text-xs text-muted-foreground">Independent search with own index</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="searxng">
                          <div className="flex flex-col">
                            <span>SearXNG</span>
                            <span className="text-xs text-muted-foreground">Self-hosted meta-search engine</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Base URL for self-hosted providers (SearXNG) */}
                  {webResearchProviderConfig?.requiresBaseUrl && (
                    <div className="space-y-2">
                      <Label htmlFor="web-research-base-url" className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5" />
                        {webResearchProviderConfig.name} URL
                      </Label>
                      <Input
                        id="web-research-base-url"
                        value={webResearchBaseUrl}
                        onChange={(e) => setWebResearchBaseUrl(e.target.value)}
                        placeholder="http://localhost:8080"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the URL of your self-hosted {webResearchProviderConfig.name} instance
                      </p>
                    </div>
                  )}

                  {/* Web Research API Key */}
                  {webResearchProviderConfig?.requiresApiKey && (
                    <div className="space-y-2">
                      <Label htmlFor="web-research-api-key" className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5" />
                        {webResearchProviderConfig.name} API Key
                      </Label>
                      <Input
                        id="web-research-api-key"
                        type="password"
                        value={webResearchApiKey}
                        onChange={(e) => setWebResearchApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API key from{' '}
                        <a 
                          href={webResearchProviderConfig.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {webResearchProviderConfig.docsUrl}
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Self-hosted indicator */}
                  {webResearchProviderConfig?.isSelfHosted && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Self-hosted provider - your searches stay private on your own infrastructure
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Perplexity has built-in web search */}
          {llmProvider === LLMProvider.PERPLEXITY && (
            <div className="space-y-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                Perplexity has built-in web search capabilities, so additional web research is not needed.
              </p>
            </div>
          )}

          {/* Status Message */}
          {llmMessage && (
            <div className={cn(
              "flex items-center gap-2 text-xs p-2 rounded-lg",
              llmMessage.type === "success" 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
            )}>
              {llmMessage.type === "success" && <Check className="h-3 w-3" />}
              {llmMessage.text}
            </div>
          )}

          {/* Save Button */}
          <Button
            type="button"
            onClick={handleSaveLLMSettings}
            disabled={isSavingLLM || !llmProvider}
            size="sm"
            className="rounded-lg"
          >
            {isSavingLLM ? "Saving..." : "Save AI Settings"}
          </Button>
        </div>
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
