import eslint from 'rollup-plugin-eslint-bundle';
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/js/player51.js',
  output: {
    file: 'build/iife/player51.min.js',
    format: 'iife',
    name: 'Player51',
  },
  plugins: [
    eslint({
      exclude: [
        'node_modules/**',
        'src/css/**',
      ]
    }),
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
