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
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Layer boundaries from CLAUDE.md: domain <- state <- presentation (ui, scene, charts).
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
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
          ],
        },
      ],
    },
  },
  prettier,
])
