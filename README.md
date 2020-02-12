# Player51

Copyright 2017-2020, Voxel51, Inc.

Player51 is a client-side media player based on javascript that can render metadata overlays.

Jason Corso, jason@voxel51.com

Kevin Qi, kevin@voxel51.com

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

We use rollup, babel, uglify and eslint packages for packaging Player51 javascript, and postcss and cssnano for handling the css files.

```
npm install --save-dev rollup
npm install --save-dev rollup-plugin-babel@latest
npm install --save-dev rollup-plugin-node-resolve
npm install --save-dev rollup-plugin-eslint-bundle
npm install --save-dev rollup-plugin-commonjs
npm install --save-dev rollup-plugin-uglify
npm install --save-dev rollup-plugin-replace
npm install --save-dev eslint-plugin-react
npm install --save-dev @babel/core @babel/preset-env
npm install --save-dev postcss-cli
npm install --save-dev cssnano
```

You may need to set your `$NODE_PATH` to include the appropriate node install locations, especially if you add the `--global` option to the commands above.  With homebrew on mac this is `export NODE_PATH=/usr/local/lib/node_modules:/usr/local/lib/node_modules/npm/node_modules`.  However, without the `--global` option, the node_modules are stored locally.


## Building

A `build.bash` script is included that executes the various scripts necessary for making the Player51 usable in various forms, such as iife and CommonJS.

```
cd /path/to/player51
bash build.bash
```

This creates a folder `build` with the following contents.
- cjs -- CommonJS build
- css -- Minified CSS
- iife -- Standard JS immediate execution build.

Note that the `build.bash` script sets a variable `NODE_ENV` to `prod` which forces the minimification of the code.  If you do not want to minify the code, then you should change that to `dev`.


## Reference

Some background information on rollup.
- <https://code.lengstorf.com/learn-rollup-js/>


# Usage Notes

The container div must be set to `position: relative`.


# Examples and Testing

The test server requires a Python installation.


## Get the test data

In order to automatically download and unzip the test-data, you need to install [ETA](https://github.com/voxel51/eta).  Otherwise, you can download the file below and unzip it to a directory `player51/test/data`.

Automatic Data Download and Extraction:
```
cd /path/to/player51/test
python download_data.py
```

Example Test Data Google File ID: `1kdwJ3ZG8TURzUxNK-H9c909SnhE7YlYD` and [link](https://drive.google.com/a/voxel51.com/file/d/1kdwJ3ZG8TURzUxNK-H9c909SnhE7YlYD/view?usp=sharing)

## Tests

1. Direct ES6 Module in browser with one video playing.

File: `simple.html`

Start a simple webserver.

```
cd /path/to/player51
python test/httpdtester.py
```

Then point your browser at <http://0.0.0.0:8000/test/simple.html>


## React Test

To set up Player51 for a React test, you need a new Node.js (6+) and npm (5.2+) installed.  This test is performed outside of this source tree because of dependency conflicts.  The code below copies over the necessary files.

```
cd /path/to/player51
npx create-react-app /tmp/react-player51
cp test/react-example-App.js /tmp/react-player51/src/App.js
cp src/js/player51.js /tmp/react-player51/src/player51.js
cp src/css/player51.css /tmp/react-player51/src/player51.css
cp -r test/data /tmp/react-player51/src/.
python3 -m http.server

cd /tmp/react-player51
npm start
```

Note that the python web-server is also started to serve the mp4 to the react
client.  (TODO: figure out how to do this from react/npm.)

Then you can point your browser to `http://localhost:3000`.
