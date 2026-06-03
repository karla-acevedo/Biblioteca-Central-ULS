// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';        // ← línea nueva

export default defineConfig({
  output: 'server',                       // ← línea nueva
  adapter: node({
    mode: 'standalone',
  }),  // ← línea nueva
  vite: {
    plugins: [tailwindcss()],
  },
});