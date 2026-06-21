import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['react', 'react-dom', 'tailwindcss'],
    banner: { js: '"use client";' },
  },
  {
    entry: { tailwind: 'src/tailwind.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom', 'tailwindcss'],
  },
])
