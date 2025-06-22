import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  // Main library bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: [
      'fast-json-patch',
      'firebase',
      'idb',
      'lodash',
      'uuid',
      'zod'
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      })
    ]
  },
  // Plugins bundle
  {
    input: 'src/plugins/index.ts',
    output: [
      {
        file: 'dist/plugins/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/plugins/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: [
      'fast-json-patch',
      'firebase',
      'idb',
      'lodash',
      'uuid',
      'zod',
      '../index'
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      })
    ]
  },
  // DevTools bundle
  {
    input: 'src/devtools/index.ts',
    output: [
      {
        file: 'dist/devtools/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/devtools/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: [
      '../index'
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      })
    ]
  }
]; 