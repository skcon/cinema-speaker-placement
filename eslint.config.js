import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Import patterns that point into a layer, by alias or by relative path. */
const layerImportPatterns = (name) => [
  `@/${name}`,
  `@/${name}/**`,
  `**/${name}`,
  `**/${name}/**`,
]

const presentationImportPatterns = ['ui', 'scene', 'charts'].flatMap(
  layerImportPatterns,
)

/**
 * Browser globals that src/domain must not touch: everything browser-only
 * (window, document, HTMLElement...) plus browser storage and navigator,
 * which Node also defines.
 */
const domGlobals = [
  ...Object.keys(globals.browser).filter(
    (name) => !(name in globals.builtin) && !(name in globals.node),
  ),
  'localStorage',
  'sessionStorage',
  'navigator',
]
/** State and presentation see only the domain's public interface (src/domain/index.ts). */
const domainInternalsPattern = {
  group: ['@/domain/*', '**/domain/*'],
  message:
    'Import from @/domain only: its index is the public interface (analyzeRoom and the config type).',
}

const domGlobalsMessage =
  'src/domain has no DOM or browser storage: let the state or presentation layer pass the value in.'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/domain/**'],
    languageOptions: { globals: globals.browser },
  },
  // shadcn/ui components come unmodified from `shadcn add`; some export
  // their cva variants next to the component.
  {
    files: ['src/ui/components/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // shadcn's chart wraps Recharts' loosely typed payloads (`any`); kept as
  // generated so a later `shadcn add chart` can replace it cleanly.
  {
    files: ['src/ui/components/chart.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  // Layer boundaries from CLAUDE.md: domain <- state <- presentation (ui, scene, charts).
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      // typescript-eslint turns off no-undef (tsc checks names, and the app
      // tsconfig includes the DOM lib), so DOM values and types are blocked
      // by name here.
      'no-restricted-globals': [
        'error',
        ...domGlobals.map((name) => ({ name, message: domGlobalsMessage })),
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: Object.fromEntries(
            domGlobals.map((name) => [name, { message: domGlobalsMessage }]),
          ),
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/**',
                'react-dom',
                'react-dom/**',
                'three',
                'three/**',
                '@react-three/**',
                'zustand',
                'zustand/**',
                'zundo',
                'zundo/**',
                '@tanstack/**',
                'recharts',
                'recharts/**',
              ],
              message:
                'src/domain is pure TypeScript: no React, DOM, Three.js, router or store libraries.',
            },
            {
              group: [
                ...layerImportPatterns('state'),
                ...presentationImportPatterns,
              ],
              message:
                'src/domain must not depend on the state or presentation layers.',
            },
          ],
        },
      ],
    },
  },
  // A frozen config schema (config-v1.ts, config-v2.ts...; see
  // src/domain/share-link.ts) keeps the rules of a released version, so it
  // copies everything it uses: importing live code would let later changes
  // reach links already shared.
  {
    files: ['src/domain/config-v[0-9]*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**', '!zod'],
              message:
                'A frozen config schema imports nothing but zod: copy what it uses, as it was at its release.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/state/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: presentationImportPatterns,
              message: 'src/state must not depend on the presentation layers.',
            },
            domainInternalsPattern,
          ],
        },
      ],
    },
  },
  {
    files: ['src/{ui,scene,charts}/**/*.{ts,tsx}', 'src/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [domainInternalsPattern] },
      ],
    },
  },
  prettier,
])
