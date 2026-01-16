import type { ThemePreset, DesignLanguage } from './types';
import { defaultEffectSettings } from './design-languages';

// Curated theme presets combining color themes, fonts, and design languages
export const themePresets: Record<string, ThemePreset> = {
  // ============ LIGHT MODE PRESETS ============
  
  // Clean & Professional
  'clean-light': {
    id: 'clean-light',
    name: 'Clean Light',
    colorThemeId: 'light',
    fontThemeId: 'inter',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      shadowStrength: 25,
    },
  },

  // Material Expressive Light
  'material-light': {
    id: 'material-light',
    name: 'Material Expressive',
    colorThemeId: 'lavender',
    fontThemeId: 'poppins',
    designLanguage: 'material-expressive',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 1.0,
      shadowStrength: 20,
      animationSpeed: 0.9,
      animationIntensity: 60,
    },
  },

  // Glassmorphism Light
  'glass-light': {
    id: 'glass-light',
    name: 'Frosted Glass',
    colorThemeId: 'mint',
    fontThemeId: 'plusJakarta',
    designLanguage: 'glassmorphism',
    effects: {
      ...defaultEffectSettings,
      glassOpacity: 40,
      glassBlur: 16,
      borderRadius: 1.25,
      grainOpacity: 5,
    },
  },

  // Chakra Light
  'chakra-light': {
    id: 'chakra-light',
    name: 'Chakra Clean',
    colorThemeId: 'light',
    fontThemeId: 'openSans',
    designLanguage: 'chakra',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.375,
      shadowStrength: 35,
      glowStrength: 45,
    },
  },

  // Neumorphism Light
  'neumo-light': {
    id: 'neumo-light',
    name: 'Soft UI',
    colorThemeId: 'light',
    fontThemeId: 'nunito',
    designLanguage: 'neumorphism',
    effects: {
      ...defaultEffectSettings,
      neumoIntensity: 70,
      neumoDistance: 10,
      borderRadius: 1.0,
      borderWidth: 0,
    },
  },

  // Brutalist Light
  'brutal-light': {
    id: 'brutal-light',
    name: 'Bold Brutalist',
    colorThemeId: 'coral',
    fontThemeId: 'oswald',
    designLanguage: 'brutalist',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0,
      borderWidth: 3,
      shadowStrength: 100,
      animationSpeed: 0.7,
    },
  },

  // Aurora Light
  'aurora-light': {
    id: 'aurora-light',
    name: 'Aurora Glow',
    colorThemeId: 'lavender',
    fontThemeId: 'quicksand',
    designLanguage: 'aurora',
    effects: {
      ...defaultEffectSettings,
      glowStrength: 80,
      glowSpread: 25,
      borderRadius: 1.5,
      grainOpacity: 3,
      animationIntensity: 70,
    },
  },

  // ============ DARK MODE PRESETS ============

  // Clean Dark
  'clean-dark': {
    id: 'clean-dark',
    name: 'Clean Dark',
    colorThemeId: 'dark',
    fontThemeId: 'inter',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      shadowStrength: 30,
    },
  },

  // Material Expressive Dark
  'material-dark': {
    id: 'material-dark',
    name: 'Material Night',
    colorThemeId: 'catppuccin',
    fontThemeId: 'poppins',
    designLanguage: 'material-expressive',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 1.0,
      shadowStrength: 25,
      animationSpeed: 0.9,
    },
  },

  // Glassmorphism Dark
  'glass-dark': {
    id: 'glass-dark',
    name: 'Dark Glass',
    colorThemeId: 'ocean',
    fontThemeId: 'plusJakarta',
    designLanguage: 'glassmorphism',
    effects: {
      ...defaultEffectSettings,
      glassOpacity: 30,
      glassBlur: 20,
      borderRadius: 1.25,
      grainOpacity: 8,
    },
  },

  // Nord Theme
  'nord-preset': {
    id: 'nord-preset',
    name: 'Nord',
    colorThemeId: 'nord',
    fontThemeId: 'firaCode',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.5,
      shadowStrength: 20,
    },
  },

  // Dracula Theme
  'dracula-preset': {
    id: 'dracula-preset',
    name: 'Dracula',
    colorThemeId: 'dracula',
    fontThemeId: 'jetBrainsMono',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.5,
      glowStrength: 50,
    },
  },

  // Tokyo Night
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    colorThemeId: 'tokyoNight',
    fontThemeId: 'spaceGrotesk',
    designLanguage: 'aurora',
    effects: {
      ...defaultEffectSettings,
      glowStrength: 60,
      glowSpread: 20,
      borderRadius: 0.75,
      grainOpacity: 2,
    },
  },

  // Synthwave
  'synthwave-preset': {
    id: 'synthwave-preset',
    name: 'Synthwave',
    colorThemeId: 'synthwave',
    fontThemeId: 'orbitron',
    designLanguage: 'aurora',
    effects: {
      ...defaultEffectSettings,
      glowStrength: 90,
      glowSpread: 30,
      borderRadius: 0.5,
      grainOpacity: 5,
      animationIntensity: 80,
    },
  },

  // Rosé Pine
  'rose-pine': {
    id: 'rose-pine',
    name: 'Rosé Pine',
    colorThemeId: 'rosePine',
    fontThemeId: 'comfortaa',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      shadowStrength: 25,
      glowStrength: 35,
    },
  },

  // Forest Dark
  'forest-dark': {
    id: 'forest-dark',
    name: 'Forest Night',
    colorThemeId: 'forest',
    fontThemeId: 'manrope',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      grainOpacity: 3,
    },
  },

  // Sunset Dark
  'sunset-dark': {
    id: 'sunset-dark',
    name: 'Sunset Glow',
    colorThemeId: 'sunset',
    fontThemeId: 'outfit',
    designLanguage: 'aurora',
    effects: {
      ...defaultEffectSettings,
      glowStrength: 70,
      glowSpread: 20,
      borderRadius: 1.0,
    },
  },

  // Neumorphism Dark
  'neumo-dark': {
    id: 'neumo-dark',
    name: 'Dark Soft UI',
    colorThemeId: 'dark',
    fontThemeId: 'nunito',
    designLanguage: 'neumorphism',
    effects: {
      ...defaultEffectSettings,
      neumoIntensity: 60,
      neumoDistance: 8,
      borderRadius: 1.0,
    },
  },

  // Brutalist Dark
  'brutal-dark': {
    id: 'brutal-dark',
    name: 'Dark Brutalist',
    colorThemeId: 'dark',
    fontThemeId: 'oswald',
    designLanguage: 'brutalist',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0,
      borderWidth: 3,
      shadowStrength: 100,
    },
  },

  // Midnight Preset
  'midnight-preset': {
    id: 'midnight-preset',
    name: 'Midnight Blue',
    colorThemeId: 'midnight',
    fontThemeId: 'inter',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      shadowStrength: 30,
      glowStrength: 40,
    },
  },

  // Monokai Preset
  'monokai-preset': {
    id: 'monokai-preset',
    name: 'Monokai Classic',
    colorThemeId: 'monokai',
    fontThemeId: 'firaCode',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.5,
      shadowStrength: 25,
    },
  },

  // Gruvbox Preset
  'gruvbox-preset': {
    id: 'gruvbox-preset',
    name: 'Gruvbox Retro',
    colorThemeId: 'gruvbox',
    fontThemeId: 'ibmPlexMono',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.5,
      shadowStrength: 20,
    },
  },

  // Peach Light Preset
  'peach-light': {
    id: 'peach-light',
    name: 'Peachy',
    colorThemeId: 'peach',
    fontThemeId: 'quicksand',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 1.0,
      shadowStrength: 25,
    },
  },

  // Sky Light Preset
  'sky-light': {
    id: 'sky-light',
    name: 'Clear Sky',
    colorThemeId: 'sky',
    fontThemeId: 'outfit',
    designLanguage: 'default',
    effects: {
      ...defaultEffectSettings,
      borderRadius: 0.75,
      shadowStrength: 25,
      glowStrength: 35,
    },
  },

  // Glass Ocean
  'glass-ocean': {
    id: 'glass-ocean',
    name: 'Ocean Glass',
    colorThemeId: 'ocean',
    fontThemeId: 'manrope',
    designLanguage: 'glassmorphism',
    effects: {
      ...defaultEffectSettings,
      glassOpacity: 35,
      glassBlur: 20,
      borderRadius: 1.5,
      grainOpacity: 5,
    },
  },

  // Aurora Forest
  'aurora-forest': {
    id: 'aurora-forest',
    name: 'Forest Aurora',
    colorThemeId: 'forest',
    fontThemeId: 'nunito',
    designLanguage: 'aurora',
    effects: {
      ...defaultEffectSettings,
      glowStrength: 65,
      glowSpread: 20,
      borderRadius: 1.0,
      grainOpacity: 4,
    },
  },
};

// Get presets by mode
export const getLightPresets = () =>
  Object.values(themePresets).filter(p => {
    const colorTheme = p.colorThemeId;
    return ['light', 'lavender', 'coral', 'mint'].includes(colorTheme);
  });

export const getDarkPresets = () =>
  Object.values(themePresets).filter(p => {
    const colorTheme = p.colorThemeId;
    return !['light', 'lavender', 'coral', 'mint'].includes(colorTheme);
  });

// Get presets by design language
export const getPresetsByDesignLanguage = (designLanguage: DesignLanguage) =>
  Object.values(themePresets).filter(p => p.designLanguage === designLanguage);
