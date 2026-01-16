import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EffectSettings, DesignLanguage, ThemePreset } from './types';
import { defaultEffectSettings, designLanguages } from './design-languages';
import { colorThemes } from './color-themes';
import { fontThemes } from './font-themes';
import { themePresets } from './theme-presets';

// ============================================
// UNIFIED THEME STORE
// Consolidates all theming state into one store
// ============================================

export interface UnifiedThemeState {
  // === CORE SELECTIONS ===
  colorThemeId: string;
  fontThemeId: string;
  designLanguage: DesignLanguage;
  activePresetId: string | null;
  
  // === EFFECT SETTINGS ===
  effects: EffectSettings;
  
  // === GRAIN SETTINGS ===
  grainEnabled: boolean;
  grainOpacity: number;
  grainSize: number;
  grainAnimated: boolean;
  
  // === BACKGROUND SETTINGS ===
  backgroundPattern: 'none' | 'dots' | 'grid' | 'noise' | 'gradient';
  backgroundPatternOpacity: number;
  
  // === UI STATE ===
  isThemePopupOpen: boolean;
  
  // === ACTIONS ===
  // Core setters
  setColorTheme: (id: string) => void;
  setFontTheme: (id: string) => void;
  setDesignLanguage: (language: DesignLanguage) => void;
  
  // Preset management
  applyPreset: (presetId: string) => void;
  clearPreset: () => void;
  
  // Effect setters
  setEffect: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
  setEffects: (effects: Partial<EffectSettings>) => void;
  
  // Grain setters
  setGrainEnabled: (enabled: boolean) => void;
  setGrainOpacity: (opacity: number) => void;
  setGrainSize: (size: number) => void;
  setGrainAnimated: (animated: boolean) => void;
  
  // Background setters
  setBackgroundPattern: (pattern: UnifiedThemeState['backgroundPattern']) => void;
  setBackgroundPatternOpacity: (opacity: number) => void;
  
  // UI actions
  openThemePopup: () => void;
  closeThemePopup: () => void;
  toggleThemePopup: () => void;
  
  // Utility actions
  reset: () => void;
  
  // Computed helpers
  getActiveColorTheme: () => typeof colorThemes[string] | undefined;
  getActiveFontTheme: () => typeof fontThemes[string] | undefined;
  isDarkMode: () => boolean;
}

const initialState = {
  colorThemeId: 'dark',
  fontThemeId: 'inter',
  designLanguage: 'default' as DesignLanguage,
  activePresetId: null as string | null,
  effects: { ...defaultEffectSettings },
  grainEnabled: false,
  grainOpacity: 15,
  grainSize: 1.0,
  grainAnimated: false,
  backgroundPattern: 'none' as const,
  backgroundPatternOpacity: 10,
  isThemePopupOpen: false,
};

export const useUnifiedThemeStore = create<UnifiedThemeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // === CORE SETTERS ===
      setColorTheme: (id) => {
        const theme = colorThemes[id];
        if (theme) {
          set({ colorThemeId: id, activePresetId: null });
        }
      },
      
      setFontTheme: (id) => {
        const font = fontThemes[id];
        if (font) {
          set({ fontThemeId: id, activePresetId: null });
        }
      },
      
      setDesignLanguage: (language) => {
        const languageDefaults = designLanguages[language]?.defaultEffects || {};
        const newEffects = { ...defaultEffectSettings, ...languageDefaults };
        set({ 
          designLanguage: language, 
          effects: newEffects,
          activePresetId: null 
        });
      },

      // === PRESET MANAGEMENT ===
      applyPreset: (presetId) => {
        const preset = themePresets[presetId];
        if (preset) {
          set({
            colorThemeId: preset.colorThemeId,
            fontThemeId: preset.fontThemeId,
            designLanguage: preset.designLanguage,
            effects: { ...defaultEffectSettings, ...preset.effects },
            activePresetId: presetId,
          });
        }
      },
      
      clearPreset: () => set({ activePresetId: null }),

      // === EFFECT SETTERS ===
      setEffect: (key, value) => set((state) => ({
        effects: { ...state.effects, [key]: value },
        activePresetId: null,
      })),
      
      setEffects: (effects) => set((state) => ({
        effects: { ...state.effects, ...effects },
        activePresetId: null,
      })),

      // === GRAIN SETTERS ===
      setGrainEnabled: (enabled) => set({ grainEnabled: enabled }),
      setGrainOpacity: (opacity) => set({ grainOpacity: opacity }),
      setGrainSize: (size) => set({ grainSize: size }),
      setGrainAnimated: (animated) => set({ grainAnimated: animated }),

      // === BACKGROUND SETTERS ===
      setBackgroundPattern: (pattern) => set({ backgroundPattern: pattern }),
      setBackgroundPatternOpacity: (opacity) => set({ backgroundPatternOpacity: opacity }),

      // === UI ACTIONS ===
      openThemePopup: () => set({ isThemePopupOpen: true }),
      closeThemePopup: () => set({ isThemePopupOpen: false }),
      toggleThemePopup: () => set((state) => ({ isThemePopupOpen: !state.isThemePopupOpen })),

      // === UTILITY ACTIONS ===
      reset: () => set({ ...initialState, isThemePopupOpen: get().isThemePopupOpen }),

      // === COMPUTED HELPERS ===
      getActiveColorTheme: () => colorThemes[get().colorThemeId],
      getActiveFontTheme: () => fontThemes[get().fontThemeId],
      isDarkMode: () => {
        const theme = colorThemes[get().colorThemeId];
        return theme?.mode === 'dark';
      },
    }),
    {
      name: 'checkmate-unified-theme',
      partialize: (state) => ({
        // Only persist theme settings, not UI state
        colorThemeId: state.colorThemeId,
        fontThemeId: state.fontThemeId,
        designLanguage: state.designLanguage,
        activePresetId: state.activePresetId,
        effects: state.effects,
        grainEnabled: state.grainEnabled,
        grainOpacity: state.grainOpacity,
        grainSize: state.grainSize,
        grainAnimated: state.grainAnimated,
        backgroundPattern: state.backgroundPattern,
        backgroundPatternOpacity: state.backgroundPatternOpacity,
      }),
    }
  )
);

// === CURATED THEME COLLECTIONS ===
// Pre-defined collections for easy theme discovery

export const curatedThemeCollections = {
  professional: {
    name: 'Professional',
    description: 'Clean, minimal themes for work',
    presets: ['clean-light', 'clean-dark', 'nord-preset', 'midnight-preset'],
  },
  creative: {
    name: 'Creative',
    description: 'Vibrant, expressive themes',
    presets: ['material-light', 'material-dark', 'aurora-light', 'synthwave-preset'],
  },
  developer: {
    name: 'Developer',
    description: 'Editor-inspired themes',
    presets: ['dracula-preset', 'tokyo-night', 'monokai-preset', 'gruvbox-preset'],
  },
  glassmorphic: {
    name: 'Glass & Blur',
    description: 'Modern frosted glass effects',
    presets: ['glass-light', 'glass-dark', 'glass-ocean'],
  },
  nature: {
    name: 'Nature',
    description: 'Earth-inspired palettes',
    presets: ['forest-dark', 'aurora-forest', 'mint', 'sky-light'],
  },
  warm: {
    name: 'Warm Tones',
    description: 'Cozy, warm color schemes',
    presets: ['sunset-dark', 'peach-light', 'coral', 'rose-pine'],
  },
} as const;

export type ThemeCollection = keyof typeof curatedThemeCollections;
