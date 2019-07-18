#!/usr/bin/env bash

# Build script for creating various versions of the Player51.
# Requires rollup to be installed.

cd "$(dirname "$0")"

ROLLUP="./node_modules/.bin/rollup"
POSTCSS="./node_modules/.bin/postcss"

if [ -z "$NODE_ENV"]; then
  export NODE_ENV='prod'
fi

if [ ! -d "build" ]; then
    mkdir -p build
    mkdir -p build/iife
    mkdir -p build/cjs
    mkdir -p build/css
fi

${ROLLUP} -c rollup.iife.js
${ROLLUP} -c rollup.cjs.js

${POSTCSS} src/css/player51.css > build/css/player51.min.css
