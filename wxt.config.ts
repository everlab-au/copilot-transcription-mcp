import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: "dist",
  manifest: {
    manifest_version: 3,
    permissions: ["tabCapture", "offscreen", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    background: {
      service_worker: "src/entrypoints/background.ts",
      type: "module",
      persistent: true,
    },
    action: {
      default_icon: "icon/16.png",
    },
  },
});
