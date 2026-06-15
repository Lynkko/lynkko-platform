import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index:  'src/index.ts',
    client: 'src/client.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'dexie'],
})
