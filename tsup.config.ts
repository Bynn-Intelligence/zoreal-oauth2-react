import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // React Server Components: every export here is client-side by nature (hooks,
  // DOM, WebCrypto), so the whole bundle carries the directive and a Next.js
  // App Router integrator does not need their own client boundary file.
  banner: { js: "'use client';" },
});
