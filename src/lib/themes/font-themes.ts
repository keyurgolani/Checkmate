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
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  },
  montserrat: {
    id: 'montserrat',
    name: 'Montserrat',
    fontFamily: '"Montserrat", system-ui, sans-serif',
    category: 'professional',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
  },

  // ============ CLEAN FONTS ============
  lato: {
    id: 'lato',
    name: 'Lato',
    fontFamily: '"Lato", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
  },
  openSans: {
    id: 'openSans',
    name: 'Open Sans',
    fontFamily: '"Open Sans", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap',
  },
  raleway: {
    id: 'raleway',
    name: 'Raleway',
    fontFamily: '"Raleway", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap',
  },
  nunito: {
    id: 'nunito',
    name: 'Nunito',
    fontFamily: '"Nunito", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
  },
  sourceSans: {
    id: 'sourceSans',
    name: 'Source Sans 3',
    fontFamily: '"Source Sans 3", system-ui, sans-serif',
    category: 'clean',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
  },

  // ============ FUN FONTS ============
  quicksand: {
    id: 'quicksand',
    name: 'Quicksand',
    fontFamily: '"Quicksand", system-ui, sans-serif',
    category: 'fun',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',
  },
  comfortaa: {
    id: 'comfortaa',
    name: 'Comfortaa',
    fontFamily: '"Comfortaa", cursive',
    category: 'fun',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap',
  },
  fredoka: {
    id: 'fredoka',
    name: 'Fredoka',
    fontFamily: '"Fredoka", system-ui, sans-serif',
    category: 'fun',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=swap',
  },
  baloo2: {
    id: 'baloo2',
    name: 'Baloo 2',
    fontFamily: '"Baloo 2", cursive',
    category: 'fun',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&display=swap',
  },

  // ============ COOL FONTS ============
  righteous: {
    id: 'righteous',
    name: 'Righteous',
    fontFamily: '"Righteous", cursive',
    category: 'cool',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
  },
  oswald: {
    id: 'oswald',
    name: 'Oswald',
    fontFamily: '"Oswald", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap',
  },
  orbitron: {
    id: 'orbitron',
    name: 'Orbitron',
    fontFamily: '"Orbitron", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap',
  },
  exo2: {
    id: 'exo2',
    name: 'Exo 2',
    fontFamily: '"Exo 2", system-ui, sans-serif',
    category: 'cool',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap',
  },

  // ============ QUIRKY FONTS ============
  spaceGrotesk: {
    id: 'spaceGrotesk',
    name: 'Space Grotesk',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  },
  spaceMono: {
    id: 'spaceMono',
    name: 'Space Mono',
    fontFamily: '"Space Mono", monospace',
    category: 'quirky',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
  },
  workSans: {
    id: 'workSans',
    name: 'Work Sans',
    fontFamily: '"Work Sans", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap',
  },
  archivo: {
    id: 'archivo',
    name: 'Archivo',
    fontFamily: '"Archivo", system-ui, sans-serif',
    category: 'quirky',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&display=swap',
  },

  // ============ MINIMAL/MONOSPACE FONTS ============
  firaCode: {
    id: 'firaCode',
    name: 'Fira Code',
    fontFamily: '"Fira Code", monospace',
    category: 'minimal',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap',
  },
  jetBrainsMono: {
    id: 'jetBrainsMono',
    name: 'JetBrains Mono',
    fontFamily: '"JetBrains Mono", monospace',
    category: 'minimal',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap',
  },
  ibmPlexMono: {
    id: 'ibmPlexMono',
    name: 'IBM Plex Mono',
    fontFamily: '"IBM Plex Mono", monospace',
    category: 'minimal',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap',
  },
  robotoMono: {
    id: 'robotoMono',
    name: 'Roboto Mono',
    fontFamily: '"Roboto Mono", monospace',
    category: 'minimal',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600;700&display=swap',
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
