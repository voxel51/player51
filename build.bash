# Build script for creating various versions of the Player51.
# Requires rollup to be installed.

ROLLUP="./node_modules/.bin/rollup"
if [ -z "$NODE_ENV"]; then
  export NODE_ENV='prod'
fi

if [ ! -d "build" ]; then
    mkdir -p build
    mkdir -p build/iife
    mkdir -p build/cjs
fi

${ROLLUP} -c rollup.iife.js
#rollup src/js/player51.js --file build/cjs/player51.js --format cjs 
