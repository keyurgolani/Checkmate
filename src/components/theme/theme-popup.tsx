"use client";

import * as React from "react";
import {
  Check,
  Moon,
  Sun,
  RotateCcw,
  Palette,
  Type,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useUnifiedThemeStore,
  curatedThemeCollections,
  type UnifiedThemeState,
} from "@/lib/themes/unified-theme-store";
import {
  colorThemes,
  designLanguages,
  themePresets,
  getLightThemes,
  getDarkThemes,
  fontCategories,
  getFontsByCategory,
} from "@/lib/themes";

type TabValue = "presets" | "colors" | "fonts" | "design" | "effects";

export function ThemePopup() {
  const store = useUnifiedThemeStore();
  const [activeTab, setActiveTab] = React.useState<TabValue>("presets");

  const lightThemes = getLightThemes();
  const darkThemes = getDarkThemes();

  const handlePresetSelect = (presetId: string) => {
    store.applyPreset(presetId);
  };

  const handleColorThemeSelect = (themeId: string) => {
    store.setColorTheme(themeId);
  };

  return (
    <>
      {/* Theme Popup Dialog */}
      <Dialog
        open={store.isThemePopupOpen}
        onOpenChange={(open) =>
          open ? store.openThemePopup() : store.closeThemePopup()
        }
      >
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-full sm:max-w-3xl sm:max-h-[85vh] sm:h-[85vh] p-0 gap-0 overflow-hidden [&_[data-slot=close-btn]]:hidden flex flex-col rounded-none sm:rounded-xl">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Theme Studio</DialogTitle>
                  <DialogDescription>
                    Customize your interface with curated themes
                  </DialogDescription>
                </div>
              </div>

              {/* Quick Mode Toggle */}
              <div className="flex items-center gap-2">
                <ModeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={store.reset}
                  className="h-9 w-9"
                  title="Reset to defaults"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => store.closeThemePopup()}
                  className="h-9 w-9"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <nav className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r bg-muted/30 p-2 flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-visible shrink-0 scrollbar-hide">
              <NavItem
                icon={<Palette className="h-4 w-4" />}
                label="Presets"
                active={activeTab === "presets"}
                onClick={() => setActiveTab("presets")}
              />
              <NavItem
                icon={<Sparkles className="h-4 w-4" />}
                label="Colors"
                active={activeTab === "colors"}
                onClick={() => setActiveTab("colors")}
              />
              <NavItem
                icon={<Type className="h-4 w-4" />}
                label="Typography"
                active={activeTab === "fonts"}
                onClick={() => setActiveTab("fonts")}
              />
              <NavItem
                icon={<Layers className="h-4 w-4" />}
                label="Design Style"
                active={activeTab === "design"}
                onClick={() => setActiveTab("design")}
              />
              <NavItem
                icon={<SlidersHorizontal className="h-4 w-4" />}
                label="Effects"
                active={activeTab === "effects"}
                onClick={() => setActiveTab("effects")}
              />

              {/* Current Theme Info */}
              <div className="mt-auto p-3 rounded-lg bg-background border text-xs">
                <div className="font-medium mb-1">Current Theme</div>
                <div className="text-muted-foreground truncate">
                  {store.activePresetId
                    ? themePresets[store.activePresetId]?.name
                    : "Custom"}
                </div>
              </div>
            </nav>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 pb-20 sm:pb-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >

                    {activeTab === "presets" && (
                      <PresetsTab
                        onSelect={handlePresetSelect}
                        activePresetId={store.activePresetId}
                      />
                    )}
                    {activeTab === "colors" && (
                      <ColorsTab
                        lightThemes={lightThemes}
                        darkThemes={darkThemes}
                        activeColorId={store.colorThemeId}
                        onSelect={handleColorThemeSelect}
                      />
                    )}
                    {activeTab === "fonts" && (
                      <FontsTab
                        activeFontId={store.fontThemeId}
                        onSelect={store.setFontTheme}
                      />
                    )}
                    {activeTab === "design" && (
                      <DesignTab
                        activeDesign={store.designLanguage}
                        onSelect={store.setDesignLanguage}
                      />
                    )}
                    {activeTab === "effects" && <EffectsTab store={store} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// === HELPER COMPONENTS ===

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
        "flex-1 sm:flex-none justify-center sm:justify-start w-auto sm:w-full",
        active
          ? "bg-background shadow-sm sm:bg-primary sm:text-primary-foreground sm:shadow-none font-semibold text-foreground"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
      {active && <ChevronRight className="h-3 w-3 ml-auto hidden sm:block" />}
    </button>
  );
}

function ModeToggle() {
  const store = useUnifiedThemeStore();
  const isDark = store.isDarkMode();

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-full">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-colors",
          !isDark && "bg-background shadow-sm"
        )}
        onClick={() => store.setColorTheme("light")}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-colors",
          isDark && "bg-background shadow-sm"
        )}
        onClick={() => store.setColorTheme("dark")}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  );
}

// === TAB CONTENT COMPONENTS ===

function PresetsTab({
  onSelect,
  activePresetId,
}: {
  onSelect: (id: string) => void;
  activePresetId: string | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Curated Themes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pre-designed combinations of colors, fonts, and effects
        </p>
      </div>

      {Object.entries(curatedThemeCollections).map(([key, collection]) => (
        <div key={key} className="space-y-3">
          <div>
            <h4 className="font-medium">{collection.name}</h4>
            <p className="text-xs text-muted-foreground">
              {collection.description}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {collection.presets.map((presetId) => {
              const preset = themePresets[presetId];
              if (!preset) return null;
              return (
                <PresetCard
                  key={presetId}
                  preset={preset}
                  isSelected={activePresetId === presetId}
                  onClick={() => onSelect(presetId)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PresetCard({
  preset,
  isSelected,
  onClick,
}: {
  preset: {
    id: string;
    name: string;
    colorThemeId: string;
    designLanguage: string;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  const colorTheme = colorThemes[preset.colorThemeId];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all group",
        "hover:border-primary/50 hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:bg-muted/50"
      )}
    >
      {/* Color preview */}
      <div className="flex gap-1.5 mb-3">
        <div
          className="w-6 h-6 rounded-full border shadow-sm"
          style={{ background: colorTheme?.colors.primary }}
        />
        <div
          className="w-6 h-6 rounded-full border shadow-sm"
          style={{ background: colorTheme?.colors.secondary }}
        />
        <div
          className="w-6 h-6 rounded-full border shadow-sm"
          style={{ background: colorTheme?.colors.accent }}
        />
      </div>
      <span className="font-medium block">{preset.name}</span>
      <span className="text-xs text-muted-foreground capitalize">
        {preset.designLanguage.replace("-", " ")}
      </span>
      {isSelected && (
        <div className="absolute top-3 right-3 p-1 rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function ColorsTab({
  lightThemes,
  darkThemes,
  activeColorId,
  onSelect,
}: {
  lightThemes: (typeof colorThemes)[string][];
  darkThemes: (typeof colorThemes)[string][];
  activeColorId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Color Scheme</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your preferred color palette
        </p>
      </div>

      <Tabs defaultValue="dark" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="light">Light Themes</TabsTrigger>
          <TabsTrigger value="dark">Dark Themes</TabsTrigger>
        </TabsList>

        <TabsContent value="light">
          <div className="grid grid-cols-3 gap-3">
            {lightThemes.map((theme) => (
              <ColorCard
                key={theme.id}
                theme={theme}
                isSelected={activeColorId === theme.id}
                onClick={() => onSelect(theme.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dark">
          <div className="grid grid-cols-3 gap-3">
            {darkThemes.map((theme) => (
              <ColorCard
                key={theme.id}
                theme={theme}
                isSelected={activeColorId === theme.id}
                onClick={() => onSelect(theme.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorCard({
  theme,
  isSelected,
  onClick,
}: {
  theme: {
    id: string;
    name: string;
    description: string;
    colors: { primary: string; background: string; secondary: string };
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl border-2 text-center transition-all",
        "hover:border-primary/50 hover:shadow-md",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      <div
        className="w-full h-12 rounded-lg mb-2 border overflow-hidden"
        style={{ background: theme.colors.background }}
      >
        <div className="flex justify-center gap-1 pt-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: theme.colors.primary }}
          />
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: theme.colors.secondary }}
          />
        </div>
      </div>
      <span className="text-sm font-medium block">{theme.name}</span>
      <span className="text-xs text-muted-foreground line-clamp-1">
        {theme.description}
      </span>
      {isSelected && (
        <div className="absolute top-2 right-2 p-0.5 rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function FontsTab({
  activeFontId,
  onSelect,
}: {
  activeFontId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Typography</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a font that matches your style
        </p>
      </div>

      <Tabs defaultValue="professional" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-2">
          {fontCategories.slice(0, 3).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="w-full grid grid-cols-3 mb-4">
          {fontCategories.slice(3).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {fontCategories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-2 gap-2">
              {getFontsByCategory(category).map((font) => (
                <Button
                  key={font.id}
                  variant={activeFontId === font.id ? "default" : "outline"}
                  className={cn(
                    "justify-start h-12 text-base",
                    activeFontId === font.id && "ring-2 ring-primary/20"
                  )}
                  style={{ fontFamily: font.fontFamily }}
                  onClick={() => onSelect(font.id)}
                >
                  {font.name}
                  {activeFontId === font.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function DesignTab({
  activeDesign,
  onSelect,
}: {
  activeDesign: UnifiedThemeState["designLanguage"];
  onSelect: (id: UnifiedThemeState["designLanguage"]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Design Language</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a visual style for UI elements
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.values(designLanguages).map((lang) => (
          <button
            key={lang.id}
            onClick={() => onSelect(lang.id)}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50 hover:shadow-md",
              activeDesign === lang.id
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-medium">{lang.name}</span>
              {activeDesign === lang.id && (
                <div className="p-0.5 rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {lang.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function EffectsTab({ store }: { store: UnifiedThemeState }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-1">Effects & Styling</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Fine-tune visual effects and animations
        </p>
      </div>

      {/* Visual Effects */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Visual Effects
        </h4>

        <EffectSlider
          label="Border Radius"
          value={store.effects.borderRadius}
          min={0}
          max={2}
          step={0.125}
          unit="rem"
          onChange={(v) => store.setEffect("borderRadius", v)}
        />

        <EffectSlider
          label="Glass Blur"
          value={store.effects.glassBlur}
          min={0}
          max={24}
          step={1}
          unit="px"
          onChange={(v) => store.setEffect("glassBlur", v)}
        />

        <EffectSlider
          label="Shadow Strength"
          value={store.effects.shadowStrength}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => store.setEffect("shadowStrength", v)}
        />

        <EffectSlider
          label="Glow Strength"
          value={store.effects.glowStrength}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => store.setEffect("glowStrength", v)}
        />

        <EffectSlider
          label="Animation Speed"
          value={store.effects.animationSpeed}
          min={0.5}
          max={2}
          step={0.1}
          unit="x"
          onChange={(v) => store.setEffect("animationSpeed", v)}
        />
      </div>

      {/* Neumorphism (conditional) */}
      {store.designLanguage === "neumorphism" && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Neumorphism
          </h4>

          <EffectSlider
            label="Intensity"
            value={store.effects.neumoIntensity}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => store.setEffect("neumoIntensity", v)}
          />
          <EffectSlider
            label="Distance"
            value={store.effects.neumoDistance}
            min={0}
            max={20}
            step={1}
            unit="px"
            onChange={(v) => store.setEffect("neumoDistance", v)}
          />
        </div>
      )}

      {/* Grain & Texture */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Grain & Texture
        </h4>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-medium">Film Grain</Label>
            <p className="text-xs text-muted-foreground">
              Add analog noise texture
            </p>
          </div>
          <Switch
            checked={store.grainEnabled}
            onCheckedChange={store.setGrainEnabled}
          />
        </div>

        {store.grainEnabled && (
          <>
            <EffectSlider
              label="Grain Opacity"
              value={store.grainOpacity}
              min={0}
              max={50}
              step={1}
              unit="%"
              onChange={store.setGrainOpacity}
            />
            <EffectSlider
              label="Grain Size"
              value={store.grainSize}
              min={0.5}
              max={2}
              step={0.1}
              unit="x"
              onChange={store.setGrainSize}
            />
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="font-medium">Animated Grain</Label>
              <Switch
                checked={store.grainAnimated}
                onCheckedChange={store.setGrainAnimated}
              />
            </div>
          </>
        )}
      </div>

      {/* Background Pattern */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Background Pattern
        </h4>

        <div className="grid grid-cols-5 gap-2">
          {(["none", "dots", "grid", "noise", "gradient"] as const).map(
            (pattern) => (
              <Button
                key={pattern}
                variant={
                  store.backgroundPattern === pattern ? "default" : "outline"
                }
                size="sm"
                className="capitalize"
                onClick={() => store.setBackgroundPattern(pattern)}
              >
                {pattern}
              </Button>
            )
          )}
        </div>

        {store.backgroundPattern !== "none" && (
          <EffectSlider
            label="Pattern Opacity"
            value={store.backgroundPatternOpacity}
            min={0}
            max={30}
            step={1}
            unit="%"
            onChange={store.setBackgroundPatternOpacity}
          />
        )}
      </div>
    </div>
  );
}

function EffectSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums font-mono">
          {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v ?? min)}
        className="w-full"
      />
    </div>
  );
}
