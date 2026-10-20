import type { FontTheme } from './types';

export const fontThemes: Record<string, FontTheme> = {
  // ============ PROFESSIONAL FONTS ============
  inter: {
    id: 'inter',
    name: 'Inter',
    fontFamily: '"Inter", system-ui, sans-serif',
    category: 'professional',
  },
  plusJakarta: {
    id: 'plusJakarta',
    name: 'Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    category: 'professional',
  },
  outfit: {
    id: 'outfit',
    name: 'Outfit',
    fontFamily: '"Outfit", system-ui, sans-serif',
    category: 'professional',
  },
  manrope: {
    id: 'manrope',
    name: 'Manrope',
    fontFamily: '"Manrope", system-ui, sans-serif',
    category: 'professional',
  },
  poppins: {
    id: 'poppins',
    name: 'Poppins',
    fontFamily: '"Poppins", system-ui, sans-serif',
    category: 'professional',
    googleFontUrl: '/fonts/poppins/poppins.css',
  },
  montserrat: {
    id: 'montserrat',
    name: 'Montserrat',
    fontFamily: '"Montserrat", system-ui, sans-serif',
    category: 'professional',
    googleFontUrl: '/fonts/montserrat/montserrat.css',
  },

  // ============ CLEAN FONTS ============
  lato: {
    id: 'lato',
    name: 'Lato',
    fontFamily: '"Lato", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: '/fonts/lato/lato.css',
  },
  openSans: {
    id: 'openSans',
    name: 'Open Sans',
    fontFamily: '"Open Sans", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: '/fonts/openSans/openSans.css',
  },
  raleway: {
    id: 'raleway',
    name: 'Raleway',
    fontFamily: '"Raleway", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: '/fonts/raleway/raleway.css',
  },
  nunito: {
    id: 'nunito',
    name: 'Nunito',
    fontFamily: '"Nunito", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: '/fonts/nunito/nunito.css',
  },
  sourceSans: {
    id: 'sourceSans',
    name: 'Source Sans 3',
    fontFamily: '"Source Sans 3", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: '/fonts/sourceSans/sourceSans.css',
  },

  // ============ FUN FONTS ============
  quicksand: {
    id: 'quicksand',
    name: 'Quicksand',
    fontFamily: '"Quicksand", system-ui, sans-serif',
    category: 'fun',
    googleFontUrl: '/fonts/quicksand/quicksand.css',
  },
  comfortaa: {
    id: 'comfortaa',
    name: 'Comfortaa',
    fontFamily: '"Comfortaa", cursive',
    category: 'fun',
    googleFontUrl: '/fonts/comfortaa/comfortaa.css',
  },
  fredoka: {
    id: 'fredoka',
    name: 'Fredoka',
    fontFamily: '"Fredoka", system-ui, sans-serif',
    category: 'fun',
    googleFontUrl: '/fonts/fredoka/fredoka.css',
  },
  baloo2: {
    id: 'baloo2',
    name: 'Baloo 2',
    fontFamily: '"Baloo 2", cursive',
    category: 'fun',
    googleFontUrl: '/fonts/baloo2/baloo2.css',
  },

  // ============ COOL FONTS ============
  righteous: {
    id: 'righteous',
    name: 'Righteous',
    fontFamily: '"Righteous", cursive',
    category: 'cool',
    googleFontUrl: '/fonts/righteous/righteous.css',
  },
  oswald: {
    id: 'oswald',
    name: 'Oswald',
    fontFamily: '"Oswald", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: '/fonts/oswald/oswald.css',
  },
  orbitron: {
    id: 'orbitron',
    name: 'Orbitron',
    fontFamily: '"Orbitron", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: '/fonts/orbitron/orbitron.css',
  },
  exo2: {
    id: 'exo2',
    name: 'Exo 2',
    fontFamily: '"Exo 2", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: '/fonts/exo2/exo2.css',
  },

  // ============ QUIRKY FONTS ============
  spaceGrotesk: {
    id: 'spaceGrotesk',
    name: 'Space Grotesk',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: '/fonts/spaceGrotesk/spaceGrotesk.css',
  },
  spaceMono: {
    id: 'spaceMono',
    name: 'Space Mono',
    fontFamily: '"Space Mono", monospace',
    category: 'quirky',
    googleFontUrl: '/fonts/spaceMono/spaceMono.css',
  },
  workSans: {
    id: 'workSans',
    name: 'Work Sans',
    fontFamily: '"Work Sans", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: '/fonts/workSans/workSans.css',
  },
  archivo: {
    id: 'archivo',
    name: 'Archivo',
    fontFamily: '"Archivo", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: '/fonts/archivo/archivo.css',
  },

  // ============ MINIMAL/MONOSPACE FONTS ============
  firaCode: {
    id: 'firaCode',
    name: 'Fira Code',
    fontFamily: '"Fira Code", monospace',
    category: 'minimal',
    googleFontUrl: '/fonts/firaCode/firaCode.css',
  },
  jetBrainsMono: {
    id: 'jetBrainsMono',
    name: 'JetBrains Mono',
    fontFamily: '"JetBrains Mono", monospace',
    category: 'minimal',
    googleFontUrl: '/fonts/jetBrainsMono/jetBrainsMono.css',
  },
  ibmPlexMono: {
    id: 'ibmPlexMono',
    name: 'IBM Plex Mono',
    fontFamily: '"IBM Plex Mono", monospace',
    category: 'minimal',
    googleFontUrl: '/fonts/ibmPlexMono/ibmPlexMono.css',
  },
  robotoMono: {
    id: 'robotoMono',
    name: 'Roboto Mono',
    fontFamily: '"Roboto Mono", monospace',
    category: 'minimal',
    googleFontUrl: '/fonts/robotoMono/robotoMono.css',
  },

  // ============ SYSTEM FONT ============
  system: {
    id: 'system',
    name: 'System Default',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'professional',
  },
};

// Helper to get fonts by category
export const getFontsByCategory = (category: string) =>
  Object.values(fontThemes).filter(f => f.category === category);

// Get all font categories
export const fontCategories = ['professional', 'clean', 'fun', 'cool', 'quirky', 'minimal'] as const;
