# Player51

Copyright 2017-2018, Voxel51, Inc.

Player51 is a client-side video player based on javascript that can render metadata overlays.

Jason Corso, jason@voxel51.com

# Building Process

Player51 implements ES6 modules.  However, we do support older browsers through iife and CommonJS via [rollup.js](https://rollupjs.org).

## Installation and Setup

You need Node and npm installed in order to run the build process with rollup.js.

Installation on a Mac is easy with Homebrew
```
brew update
brew install node
npm install --global rollup
```

Installation on Linux/Ubuntu is easy with apt
```
sudo apt install node npm
npm install --global rollup
```

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

