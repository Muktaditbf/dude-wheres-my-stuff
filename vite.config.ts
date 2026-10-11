import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages serves the app from /<repo>/. Override with BASE_PATH=/ for other hosts.
const base = process.env.BASE_PATH ?? '/dude-wheres-my-stuff/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: "Dude, Where's My Stuff?",
        short_name: 'Where Stuff',
        description:
          'Tell it where you put your stuff. Ask it later. Get roasted. Private and offline.',
        theme_color: '#ffdf3d',
        background_color: '#fff3d6',
        display: 'standalone',
        start_url: './',
        scope: './',
        lang: 'en',
        categories: ['productivity', 'lifestyle', 'utilities'],
        shortcuts: [
          { name: 'Stash something', short_name: 'Stash it', url: './?mode=stash' },
          { name: 'Find something', short_name: 'Find it', url: './?mode=find' },
        ],
      },
      workbox: {
        // The web manifest is added by the plugin itself; listing it here too breaks precaching.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
