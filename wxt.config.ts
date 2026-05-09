import { defineConfig } from 'wxt';

export default defineConfig({
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
    },
    web_accessible_resources: [
      {
        resources: ['fonts/*', 'bezels/*'],
        matches: ['<all_urls>'],
      },
    ],
  },
  modules: [],
});
