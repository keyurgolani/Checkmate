import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

// Port 9 (discard) has no listener, so a unit test that reaches for a backend
// fails fast instead of finding a developer's PocketBase.
const CLOSED_BACKEND_URL = 'http://127.0.0.1:9';

// Suites that need PocketBase. They run on the hermetic fixture.
const BACKEND_TESTS = [
  'src/test/integration.test.ts',
  'src/test/backend-verification.test.ts',
  'src/test/security/**/*.test.ts',
  '**/*.backend.test.ts',
];

const EXCLUDE = [...configDefaults.exclude, '.next/**', '.cache/**', '.claude/**', '.worktrees/**'];

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Property-based tests need the extra time.
    testTimeout: 30000,
    reporters: ['default', './src/test/reporters/no-skip.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '.next',
        '**/*.config.ts',
        '**/*.config.mjs',
        '**/types/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          exclude: [...EXCLUDE, ...BACKEND_TESTS],
          env: {
            POCKETBASE_URL: CLOSED_BACKEND_URL,
            NEXT_PUBLIC_POCKETBASE_URL: CLOSED_BACKEND_URL,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'backend',
          include: BACKEND_TESTS,
          exclude: EXCLUDE,
          globalSetup: ['./src/test/fixture/global-setup.ts'],
          setupFiles: ['./src/test/fixture/backend-setup.ts'],
          hookTimeout: 60000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
});
