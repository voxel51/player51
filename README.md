# Player51

Copyright 2017-2018, Voxel51, Inc.

Player51 is a client-side video player based on javascript that can render metadata overlays.

Jason Corso, jason@voxel51.com

# Building Process

Player51 implements ES6 modules.  However, we do support older browsers through iife and CommonJS via [rollup.js](https://rollupjs.org).

## Installation and Setup

### Node and NPM
You need Node and npm installed in order to run the build process with rollup.js.

Installation on a Mac is easy with Homebrew
```
brew update
brew install node
```

Installation on Linux/Ubuntu is easy with apt
```
sudo apt install node npm
```

### Packages

We use rollup, babel, uglify and eslint packages for packaging Player51.  

```
npm install --save-dev rollup
npm install --save-dev rollup-plugin-babel@latest
npm install --save-dev rollup-plugin-node-resolve
npm install --save-dev rollup-plugin-eslint-bundle
npm install --save-dev rollup-plugin-commonjs
npm install --save-dev eslint-plugin-react
npm install --save-dev @babel/core @babel/preset-env
```

You may need to set your `$NODE_PATH` to include the appropriate node install locations, especially if you add the `--global` option to the commands above.  With homebrew on mac this is `export NODE_PATH=/usr/local/lib/node_modules:/usr/local/lib/node_modules/npm/node_modules`.  However, without the `--global` option, the node_modules are stored locally.

## Building

A `build.bash` script is included that executes the various scripts necessary for making the Player51 usable in various forms, such as iife and CommonJS.

```
cd /path/to/player51
bash build.bash
```

This creates a folder `build` with the following contents.  XXX

## Reference

Some background information on rollup.
- <https://code.lengstorf.com/learn-rollup-js/>

# Examples and Testing

Assume you have a running python installation.

## Get the test data

In order to automatically download and unzip the test-data, you need to install [ETA](https://github.com/voxel51/eta).  Otherwise, you can download the file below and unzip it to a directory `player51/test/player51-test-data`.

Automatic Data Download and Extraction:
```
cd /path/to/player51/test
python download_data.py
```

Example Test Data Google File ID: `1kdwJ3ZG8TURzUxNK-H9c909SnhE7YlYD` and [link](https://drive.google.com/a/voxel51.com/file/d/1kdwJ3ZG8TURzUxNK-H9c909SnhE7YlYD/view?usp=sharing)

## Tests

1. Direct ES6 Module in browser with one video playing.

File: `simple.html`

Start a simple web-server.

```
cd /path/to/player51
python3 -m http.server
```

Then point your browser at <http://0.0.0.0:8000/test/simple.html> (note that Google Chrome will not support scrubbing in this simple web-server setting).

