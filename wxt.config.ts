import { defineConfig } from 'wxt';

export default defineConfig({
  // Output to `dist/` instead of WXT's default `.output/` so the build
  // folder isn't hidden in macOS file dialogs (`.`-prefixed entries are
  // hidden by default in the Load-unpacked picker).
  outDir: 'dist',
  manifest: {
    name: 'RPC',
    short_name: 'RPC',
    description: 'Responsive preview & check — any URL, every viewport.',
    permissions: [
      'storage',
      'scripting',
      'tabs',
      'downloads',
      'activeTab',
      'declarativeNetRequest',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Open Res Point Check',
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '128': 'icon/128.png',
    },
    web_accessible_resources: [
      {
        resources: ['fonts/*', 'bezels/*', 'icon/*', 'icon.svg'],
        matches: ['<all_urls>'],
      },
    ],
  },
  modules: [],
});
