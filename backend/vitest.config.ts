import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/setupTests.ts'],
    include: ['**/*.test.{ts,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/setupTests.ts', '**/*.test.{ts,js}', 'dist/'],
    },
    // Suppress stderr output during tests
    silent: false,
    reporters: ['basic'],
    // Don't fail on unhandled errors during tests
    dangerouslyIgnoreUnhandledErrors: true,
  },
})
