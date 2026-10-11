import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Every app icon is generated from the one logo SVG at build time.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.15,
      resizeOptions: { background: '#ffdf3d' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.15,
      resizeOptions: { background: '#ffdf3d' },
    },
  },
  images: ['public/logo.svg'],
});
