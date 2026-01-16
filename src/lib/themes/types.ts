// Theme Types and Interfaces

export type ThemeCategory = 
  | 'minimal' 
  | 'vibrant' 
  | 'futuristic' 
  | 'design-system';

export type DesignLanguage = 
  | 'default'
  | 'material-expressive'
  | 'glassmorphism'
  | 'chakra'
  | 'neumorphism'
  | 'brutalist'
  | 'aurora';

export type FontCategory = 
  | 'professional' 
  | 'clean' 
  | 'fun' 
  | 'cool' 
  | 'quirky' 
  | 'minimal';

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  mode: 'light' | 'dark';
  colors: {
    // Background colors
    background: string;
    foreground: string;
    
    // Card colors
    card: string;
    cardForeground: string;
    
    // Popover colors
    popover: string;
    popoverForeground: string;
    
    // Primary colors
    primary: string;
    primaryForeground: string;
    
    // Secondary colors
    secondary: string;
    secondaryForeground: string;
    
    // Muted colors
    muted: string;
    mutedForeground: string;
    
    // Accent colors
    accent: string;
    accentForeground: string;
    
    // Destructive colors
    destructive: string;
    destructiveForeground: string;
    
    // UI elements
    border: string;
    input: string;
    ring: string;
    
    // Chart colors
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
    
    // Sidebar colors
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
    
    // Effect base colors
    glassColor: string;
    glassBorderColor: string;
    shadowColor: string;
    glowColor: string;
  };
}

export interface FontTheme {
  id: string;
  name: string;
  fontFamily: string;
  category: FontCategory;
  googleFontUrl?: string;
}

export interface EffectSettings {
  // Glass effects
  glassOpacity: number;      // 0-100
  glassBlur: number;         // 0-20 (px)
  
  // Shadow effects
  shadowStrength: number;    // 0-100
  shadowSpread: number;      // 0-50 (px)
  
  // Glow effects
  glowStrength: number;      // 0-100
  glowSpread: number;        // 0-30 (px)
  
  // Border effects
  borderRadius: number;      // 0-2 (rem)
  borderWidth: number;       // 0-4 (px)
  
  // Animation settings
  animationSpeed: number;    // 0.5-2.0 (multiplier)
  animationIntensity: number; // 0-100
  
  // Grain/texture
  grainOpacity: number;      // 0-100
  grainSize: number;         // 0.5-2.0 (multiplier)
  
  // Parallax/3D effects
  parallaxStrength: number;  // 0-100
  
  // Neumorphism specific
  neumoIntensity: number;    // 0-100
  neumoDistance: number;     // 0-20 (px)
}

export interface DesignLanguageConfig {
  id: DesignLanguage;
  name: string;
  description: string;
  defaultEffects: Partial<EffectSettings>;
  cssOverrides?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colorThemeId: string;
  fontThemeId: string;
  designLanguage: DesignLanguage;
  effects: Partial<EffectSettings>;
}
