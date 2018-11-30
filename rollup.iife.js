import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/js/player51.js',
  output: {
    file: 'build/iife/player51.min.js',
    format: 'iife',
    name: 'Player51',
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
