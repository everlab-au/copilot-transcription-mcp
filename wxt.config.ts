import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: 'dist',
  manifest: {
    manifest_version: 3,
    // permissions: ['tabs', 'storage', 'sidePanel', 'activeTab', 'scripting'],
  },
});
