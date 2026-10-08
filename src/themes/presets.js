export const PRESETS = [
  { id: 'notion-blue-light', name: 'Notion Blue', series: 'Notion', mode: 'light', seeds: { bg: '#e9f3f7', accent: '#337ea9' } },
  { id: 'notion-green-light', name: 'Notion Green', series: 'Notion', mode: 'light', seeds: { bg: '#eef3ed', accent: '#448361' } },
  { id: 'notion-purple-light', name: 'Notion Purple', series: 'Notion', mode: 'light', seeds: { bg: '#f6f3f8', accent: '#9065b0' } },
  { id: 'notion-pink-light', name: 'Notion Pink', series: 'Notion', mode: 'light', seeds: { bg: '#f9f2f5', accent: '#c14c8a' } },
  { id: 'notion-yellow-light', name: 'Notion Yellow', series: 'Notion', mode: 'light', seeds: { bg: '#faf3dd', accent: '#cb912f' } },
  { id: 'notion-brown-light', name: 'Notion Brown', series: 'Notion', mode: 'light', seeds: { bg: '#f3eeee', accent: '#9f6b53' } },
  { id: 'notion-blue-dark', name: 'Notion Blue Dark', series: 'Notion', mode: 'dark', seeds: { bg: '#1f282d', accent: '#2e7cd1' } },
  { id: 'notion-green-dark', name: 'Notion Green Dark', series: 'Notion', mode: 'dark', seeds: { bg: '#242b26', accent: '#2d9964' } },
  { id: 'notion-purple-dark', name: 'Notion Purple Dark', series: 'Notion', mode: 'dark', seeds: { bg: '#2a2430', accent: '#8d5bc1' } },
  { id: 'notion-red-dark', name: 'Notion Red Dark', series: 'Notion', mode: 'dark', seeds: { bg: '#332523', accent: '#cd4945' } },

  { id: 'radix-sky-light', name: 'Radix Sky', series: 'Radix', mode: 'light', seeds: { bg: '#f9feff', accent: '#7ce2fe', sidebar: '#f1fafd' } },
  { id: 'radix-mint-light', name: 'Radix Mint', series: 'Radix', mode: 'light', seeds: { bg: '#f9fefd', accent: '#86ead4', sidebar: '#f2fbf9' } },
  { id: 'radix-amber-light', name: 'Radix Amber', series: 'Radix', mode: 'light', seeds: { bg: '#fefdfb', accent: '#ffc53d', sidebar: '#fefbe9' } },
  { id: 'radix-plum-light', name: 'Radix Plum', series: 'Radix', mode: 'light', seeds: { bg: '#fefcff', accent: '#ab4aba', sidebar: '#fdf7fd' } },
  { id: 'radix-indigo-dark', name: 'Radix Indigo Dark', series: 'Radix', mode: 'dark', seeds: { bg: '#11131f', accent: '#3e63dd', sidebar: '#141726' } },
  { id: 'radix-teal-dark', name: 'Radix Teal Dark', series: 'Radix', mode: 'dark', seeds: { bg: '#0d1514', accent: '#12a594', sidebar: '#111c1b' } },
  { id: 'radix-crimson-dark', name: 'Radix Crimson Dark', series: 'Radix', mode: 'dark', seeds: { bg: '#191114', accent: '#e93d82', sidebar: '#201318' } },

  { id: 'catppuccin-latte', name: 'Catppuccin Latte', series: 'Editor', mode: 'light', seeds: { bg: '#eff1f5', accent: '#8839ef', sidebar: '#e6e9ef' } },
  { id: 'nord-light', name: 'Nord Light', series: 'Editor', mode: 'light', seeds: { bg: '#eceff4', accent: '#88c0d0' } },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', series: 'Editor', mode: 'light', seeds: { bg: '#faf4ed', accent: '#d7827e', sidebar: '#fffaf3' } },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', series: 'Editor', mode: 'dark', seeds: { bg: '#1e1e2e', accent: '#cba6f7', sidebar: '#181825' } },
  { id: 'nord-dark', name: 'Nord Dark', series: 'Editor', mode: 'dark', seeds: { bg: '#2e3440', accent: '#88c0d0' } },
  { id: 'rose-pine-moon', name: 'Rosé Pine Moon', series: 'Editor', mode: 'dark', seeds: { bg: '#232136', accent: '#c4a7e7', sidebar: '#2a273f' } },
  { id: 'dracula', name: 'Dracula', series: 'Editor', mode: 'dark', seeds: { bg: '#282a36', accent: '#bd93f9' } },
];

export const DEFAULT_PRESET_ID = 'notion-blue-light';

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}
