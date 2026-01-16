import type { ColorTheme, EffectSettings, FontTheme } from './types';
import { getDesignLanguage } from './design-languages';

// Convert hex to RGB string
export const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}`
    : '0, 0, 0';
};

// Calculate relative luminance (0 = black, 1 = white)
export const getLuminance = (color: string): number => {
  // Handle oklch colors
  if (color.startsWith('oklch')) {
    const match = color.match(/oklch\(([0-9.]+)/);
    return match ? parseFloat(match[1]!) : 0.5;
  }
  
  // Handle hex colors
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!result) return 0.5;

  const r = parseInt(result[1]!, 16) / 255;
  const g = parseInt(result[2]!, 16) / 255;
  const b = parseInt(result[3]!, 16) / 255;

  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
};

// Check if theme is light mode
export const isLightTheme = (theme: ColorTheme): boolean => {
  return theme.mode === 'light';
};

// Generate CSS variables from theme
export const generateThemeCssVariables = (
  colorTheme: ColorTheme,
  fontTheme: FontTheme,
  effects: EffectSettings
): Record<string, string> => {
  const cssVars: Record<string, string> = {};

  // Color variables (convert camelCase to kebab-case)
  Object.entries(colorTheme.colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    cssVars[`--${cssKey}`] = value;
  });

  // Font variables
  cssVars['--font-sans'] = fontTheme.fontFamily;
  cssVars['--font-heading'] = fontTheme.fontFamily;

  // Effect variables
  cssVars['--radius'] = `${effects.borderRadius}rem`;
  cssVars['--glass-opacity'] = (effects.glassOpacity / 100).toString();
  cssVars['--glass-blur'] = `${effects.glassBlur}px`;
  cssVars['--shadow-strength'] = (effects.shadowStrength / 100).toString();
  cssVars['--shadow-spread'] = `${effects.shadowSpread}px`;
  cssVars['--glow-strength'] = (effects.glowStrength / 100).toString();
  cssVars['--glow-spread'] = `${effects.glowSpread}px`;
  cssVars['--border-width'] = `${effects.borderWidth}px`;
  cssVars['--animation-speed'] = effects.animationSpeed.toString();
  cssVars['--animation-intensity'] = (effects.animationIntensity / 100).toString();
  cssVars['--grain-opacity'] = (effects.grainOpacity / 100).toString();
  cssVars['--grain-size'] = effects.grainSize.toString();
  cssVars['--parallax-strength'] = (effects.parallaxStrength / 100).toString();
  cssVars['--neumo-intensity'] = (effects.neumoIntensity / 100).toString();
  cssVars['--neumo-distance'] = `${effects.neumoDistance}px`;

  // Animation durations based on speed
  const speed = effects.animationSpeed || 1;
  cssVars['--duration-fast'] = `${0.15 / speed}s`;
  cssVars['--duration-normal'] = `${0.3 / speed}s`;
  cssVars['--duration-slow'] = `${0.5 / speed}s`;

  // Dynamic glass effects
  const glassRgb = hexToRgb(colorTheme.colors.glassColor);
  const glassBorderRgb = hexToRgb(colorTheme.colors.glassBorderColor);
  cssVars['--glass-bg'] = `rgba(${glassRgb}, ${effects.glassOpacity / 100})`;
  const borderOpacity = 0.05 + effects.glassOpacity / 200;
  cssVars['--glass-border'] = `rgba(${glassBorderRgb}, ${borderOpacity})`;

  // Dynamic shadow
  const shadowRgb = hexToRgb(colorTheme.colors.shadowColor);
  const shadowOpacity = effects.shadowStrength / 100;
  cssVars['--glass-shadow'] = `0 ${effects.shadowSpread}px ${effects.shadowSpread * 2}px 0 rgba(${shadowRgb}, ${shadowOpacity})`;
  cssVars['--shadow'] = `rgba(${shadowRgb}, ${shadowOpacity})`;

  // Dynamic glows
  const isLight = isLightTheme(colorTheme);
  const baseGlowOpacity = isLight ? 0.15 : 0.08;
  const maxGlowBoost = isLight ? 0.35 : 0.25;
  const glowOpacity = baseGlowOpacity + (effects.glowStrength / 100) * maxGlowBoost;

  const glowRgb = hexToRgb(colorTheme.colors.glowColor);
  cssVars['--glow-primary'] = `rgba(${glowRgb}, ${glowOpacity})`;
  cssVars['--glow-color-rgb'] = glowRgb;

  return cssVars;
};

// Apply theme to document
export const applyThemeToDocument = (
  colorTheme: ColorTheme,
  fontTheme: FontTheme,
  effects: EffectSettings,
  designLanguage: string
) => {
  const root = document.documentElement;
  const cssVars = generateThemeCssVariables(colorTheme, fontTheme, effects);

  // Apply CSS variables
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Set theme mode attribute
  root.setAttribute('data-theme-mode', colorTheme.mode);
  
  // Set design language attribute
  root.setAttribute('data-design', designLanguage);

  // Set class for dark/light mode (for Tailwind)
  if (colorTheme.mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  // Apply CSS overrides if they exist
  const designConfig = getDesignLanguage(designLanguage);
  
  // Create or update style element for overrides
  let styleEl = document.getElementById('theme-overrides');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-overrides';
    document.head.appendChild(styleEl);
  }
  
  // Set content definition
  styleEl.textContent = designConfig.cssOverrides || '';
};

// Storage keys
const STORAGE_KEY = 'checkmate-theme-preferences';

export interface ThemePreferences {
  colorThemeId: string;
  fontThemeId: string;
  designLanguage: string;
  effects: EffectSettings;
}

// Save theme preferences to localStorage
export const saveThemePreferences = (prefs: ThemePreferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save theme preferences:', e);
  }
};

// Load theme preferences from localStorage
export const loadThemePreferences = (): ThemePreferences | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load theme preferences:', e);
  }
  return null;
};

// Clear theme preferences
export const clearThemePreferences = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear theme preferences:', e);
  }
};
