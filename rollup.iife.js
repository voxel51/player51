import eslint from 'rollup-plugin-eslint-bundle';
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify';

export default {
  input: 'src/js/player51.js',
  output: {
    file: 'build/iife/player51.min.js',
    format: 'iife',
    name: 'Player51',
  },
  plugins: [
    resolve(),
    commonjs(),
    eslint({
      exclude: [
        'node_modules/**',
        'src/css/**',
      ]
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      exclude: 'node_modules/**',
      ENV: JSON.stringify(process.env.NODE_ENV || 'dev'),
    }),
    (process.env.NODE_ENV === 'prod' && uglify()),
  ],
};
