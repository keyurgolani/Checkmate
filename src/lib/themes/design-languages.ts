import type { DesignLanguageConfig, EffectSettings } from './types';

export const defaultEffectSettings: EffectSettings = {
  glassOpacity: 80,
  glassBlur: 8,
  shadowStrength: 30,
  shadowSpread: 8,
  glowStrength: 40,
  glowSpread: 10,
  borderRadius: 0.75,
  borderWidth: 1,
  animationSpeed: 1.0,
  animationIntensity: 50,
  grainOpacity: 0,
  grainSize: 1.0,
  parallaxStrength: 0,
  neumoIntensity: 0,
  neumoDistance: 8,
};

export const designLanguages: Record<string, DesignLanguageConfig> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean, modern design with subtle shadows and rounded corners',
    defaultEffects: {
      glassOpacity: 90,
      glassBlur: 0,
      shadowStrength: 25,
      shadowSpread: 6,
      glowStrength: 30,
      glowSpread: 8,
      borderRadius: 0.75,
      borderWidth: 1,
      animationSpeed: 1.0,
      animationIntensity: 50,
      grainOpacity: 0,
      neumoIntensity: 0,
    },
  },

  'material-expressive': {
    id: 'material-expressive',
    name: 'Material Expressive',
    description: 'Google Material Design 3 with expressive colors and dynamic surfaces',
    defaultEffects: {
      glassOpacity: 95,
      glassBlur: 0,
      shadowStrength: 20,
      shadowSpread: 4,
      glowStrength: 25,
      glowSpread: 6,
      borderRadius: 1.0,
      borderWidth: 0,
      animationSpeed: 0.9,
      animationIntensity: 60,
      grainOpacity: 0,
      neumoIntensity: 0,
    },
    cssOverrides: `
      /* Material Expressive specific styles */
      [data-design="material-expressive"] {
        --shadow-elevation-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        --shadow-elevation-2: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        --shadow-elevation-3: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      }
      [data-design="material-expressive"] .card {
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      [data-design="material-expressive"] .card:hover {
        transform: translateY(-2px);
      }
    `,
  },

  glassmorphism: {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with blur and transparency',
    defaultEffects: {
      glassOpacity: 40,
      glassBlur: 16,
      shadowStrength: 15,
      shadowSpread: 20,
      glowStrength: 20,
      glowSpread: 15,
      borderRadius: 1.25,
      borderWidth: 1,
      animationSpeed: 1.1,
      animationIntensity: 40,
      grainOpacity: 5,
      neumoIntensity: 0,
    },
    cssOverrides: `
      /* Glassmorphism specific styles */
      [data-design="glassmorphism"] {
        --glass-bg: rgba(255, 255, 255, 0.1);
        --glass-border: rgba(255, 255, 255, 0.2);
      }
      [data-design="glassmorphism"] .card,
      [data-design="glassmorphism"] [data-slot="card"] {
        background: var(--glass-bg) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid var(--glass-border) !important;
      }
      .dark[data-design="glassmorphism"] {
        --glass-bg: rgba(0, 0, 0, 0.2);
        --glass-border: rgba(255, 255, 255, 0.1);
      }
    `,
  },

  chakra: {
    id: 'chakra',
    name: 'Chakra',
    description: 'Clean, accessible design inspired by Chakra UI',
    defaultEffects: {
      glassOpacity: 100,
      glassBlur: 0,
      shadowStrength: 35,
      shadowSpread: 10,
      glowStrength: 45,
      glowSpread: 12,
      borderRadius: 0.375,
      borderWidth: 1,
      animationSpeed: 0.85,
      animationIntensity: 55,
      grainOpacity: 0,
      neumoIntensity: 0,
    },
    cssOverrides: `
      /* Chakra specific styles */
      [data-design="chakra"] {
        --focus-ring-width: 3px;
        --focus-ring-offset: 2px;
      }
      [data-design="chakra"] button:focus-visible,
      [data-design="chakra"] [role="button"]:focus-visible {
        outline: var(--focus-ring-width) solid var(--ring);
        outline-offset: var(--focus-ring-offset);
      }
    `,
  },

  neumorphism: {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Soft UI with extruded and inset shadows',
    defaultEffects: {
      glassOpacity: 100,
      glassBlur: 0,
      shadowStrength: 0,
      shadowSpread: 0,
      glowStrength: 0,
      glowSpread: 0,
      borderRadius: 1.0,
      borderWidth: 0,
      animationSpeed: 1.0,
      animationIntensity: 30,
      grainOpacity: 0,
      neumoIntensity: 70,
      neumoDistance: 10,
    },
    cssOverrides: `
      /* Neumorphism specific styles */
      [data-design="neumorphism"] {
        --neumo-light: rgba(255, 255, 255, 0.8);
        --neumo-dark: rgba(0, 0, 0, 0.15);
        --neumo-distance: 10px;
        --neumo-blur: 20px;
      }
      [data-design="neumorphism"] .card,
      [data-design="neumorphism"] [data-slot="card"] {
        background: var(--background) !important;
        box-shadow: 
          var(--neumo-distance) var(--neumo-distance) var(--neumo-blur) var(--neumo-dark),
          calc(var(--neumo-distance) * -1) calc(var(--neumo-distance) * -1) var(--neumo-blur) var(--neumo-light) !important;
        border: none !important;
      }
      [data-design="neumorphism"] button,
      [data-design="neumorphism"] [role="button"] {
        box-shadow: 
          5px 5px 10px var(--neumo-dark),
          -5px -5px 10px var(--neumo-light) !important;
      }
      [data-design="neumorphism"] button:active,
      [data-design="neumorphism"] [role="button"]:active {
        box-shadow: 
          inset 5px 5px 10px var(--neumo-dark),
          inset -5px -5px 10px var(--neumo-light) !important;
      }
      .dark[data-design="neumorphism"] {
        --neumo-light: rgba(255, 255, 255, 0.05);
        --neumo-dark: rgba(0, 0, 0, 0.5);
      }
    `,
  },

  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Bold, raw design with hard edges and strong contrasts',
    defaultEffects: {
      glassOpacity: 100,
      glassBlur: 0,
      shadowStrength: 100,
      shadowSpread: 0,
      glowStrength: 0,
      glowSpread: 0,
      borderRadius: 0,
      borderWidth: 3,
      animationSpeed: 0.7,
      animationIntensity: 100,
      grainOpacity: 0,
      neumoIntensity: 0,
    },
    cssOverrides: `
      /* Brutalist specific styles - Forced !important for overrides */
      [data-design="brutalist"] {
        --brutal-offset: 4px;
        --brutal-border: 3px;
      }
      [data-design="brutalist"] .card,
      [data-design="brutalist"] [data-slot="card"] {
        border: var(--brutal-border) solid var(--foreground) !important;
        box-shadow: var(--brutal-offset) var(--brutal-offset) 0 var(--foreground) !important;
        border-radius: 0 !important;
      }
      [data-design="brutalist"] button,
      [data-design="brutalist"] [role="button"] {
        border: 2px solid currentColor !important;
        box-shadow: 3px 3px 0 currentColor !important;
        border-radius: 0 !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      [data-design="brutalist"] button:hover,
      [data-design="brutalist"] [role="button"]:hover {
        transform: translate(-2px, -2px);
        box-shadow: 5px 5px 0 currentColor !important;
      }
      [data-design="brutalist"] button:active,
      [data-design="brutalist"] [role="button"]:active {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 currentColor !important;
      }
    `,
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Ethereal design with gradient glows and soft animations',
    defaultEffects: {
      glassOpacity: 60,
      glassBlur: 12,
      shadowStrength: 20,
      shadowSpread: 15,
      glowStrength: 80,
      glowSpread: 25,
      borderRadius: 1.5,
      borderWidth: 1,
      animationSpeed: 1.3,
      animationIntensity: 70,
      grainOpacity: 3,
      neumoIntensity: 0,
    },
    cssOverrides: `
      /* Aurora specific styles */
      [data-design="aurora"] {
        --aurora-glow-1: var(--primary);
        --aurora-glow-2: var(--secondary);
      }
      [data-design="aurora"] .card,
      [data-design="aurora"] [data-slot="card"] {
        position: relative;
        overflow: hidden;
      }
      [data-design="aurora"] .card::before,
      [data-design="aurora"] [data-slot="card"]::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 150%;
        height: 150%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          transparent,
          var(--aurora-glow-1),
          transparent,
          var(--aurora-glow-2),
          transparent
        );
        animation: aurora-rotate 10s linear infinite;
        opacity: 0.15;
        z-index: -1;
        filter: blur(40px);
      }
      @keyframes aurora-rotate {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
      [data-design="aurora"] button:hover,
      [data-design="aurora"] [role="button"]:hover {
        box-shadow: 
          0 0 20px var(--aurora-glow-1),
          0 0 40px var(--aurora-glow-2);
      }
    `,
  },
};

// Get design language by ID
export const getDesignLanguage = (id: string): DesignLanguageConfig => 
  designLanguages[id] || designLanguages.default!;

// Get all design language IDs
export const designLanguageIds = Object.keys(designLanguages);
