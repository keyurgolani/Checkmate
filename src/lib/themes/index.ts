// Theme Engine - Main Export
// Unified theming system for CheckMate

// Types
export * from './types';

// === UNIFIED THEME STORE (NEW) ===
export { 
  useUnifiedThemeStore, 
  curatedThemeCollections,
  type UnifiedThemeState,
  type ThemeCollection,
} from './unified-theme-store';

// Color Themes
export { colorThemes, getLightThemes, getDarkThemes, getThemesByCategory } from './color-themes';

// Font Themes
export { fontThemes, getFontsByCategory, fontCategories } from './font-themes';

// Design Languages
export { 
  designLanguages, 
  defaultEffectSettings, 
  getDesignLanguage, 
  designLanguageIds 
} from './design-languages';

// Theme Presets
export {
  themePresets,
  getLightPresets,
  getDarkPresets,
  getPresetsByDesignLanguage,
} from './theme-presets';

// Utilities
export {
  hexToRgb,
  getLuminance,
  isLightTheme,
  generateThemeCssVariables,
  applyThemeToDocument,
  saveThemePreferences,
  loadThemePreferences,
  clearThemePreferences,
  type ThemePreferences,
} from './theme-utils';
