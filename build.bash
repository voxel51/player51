#!/usr/bin/env bash

# Build script for creating various versions of the Player51.
# Requires rollup to be installed.

cd "$(dirname "$0")"

if [ -z "$NODE_ENV" ]; then
  export NODE_ENV='prod'
fi

npx --no-install rollup -c rollup.js

mkdir -p build/css
npx --no-install postcss src/css/player51.css > build/css/player51.min.css
