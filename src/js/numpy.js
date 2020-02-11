/**
 * @module numpy.js
 * @summary Utilities to parse serialized numpy arrays
 *
 * Copyright 2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */

export {
  deserialize,
};

const DATA_TYPES = {
  '|b1': Uint8Array,
  '|u1': Uint8Array,
};

/**
 * Parses a uint16 (unsigned 16-bit integer) at a specified position in a string
 *
 * @param {string} str input string
 * @param {number} index index of uint16
 * @return {number} parsed uint16
 */
function readUint16At(str, index) {
  return str.charCodeAt(index) + (str.charCodeAt(index + 1) << 8);
}

/**
 * Parses a uint32 (unsigned 32-bit integer) at a specified position in a string
 *
 * @param {string} str input string
 * @param {number} index index of uint32
 * @return {number} parsed uint32
 */
function readUint32At(str, index) {
  return str.charCodeAt(index) + (str.charCodeAt(index + 1) << 8) +
    (str.charCodeAt(index + 2) << 16) + (str.charCodeAt(index + 3) << 24);
}

/**
 * Unpacks a uint8 array into a boolean array
 *
 * @param {Uint8Array} data input data
 * @param {array} shape input data dimensions
 * @return {Uint8Array} unpacked data
 */
function unpackBits(data, shape) {
  const rawLength = shape.reduce((a, b) => a * b, 1);
  const unpackedData = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; i++) {
    // highest bit of data[0] -> unpackedData[0]
    // lowest bit of data[0]  -> unpackedData[7]
    unpackedData[i] = data[i >> 3] & (1 << (7 - (i % 8)));
  }
  return unpackedData;
}

/**
 * Parses a serialized numpy array
 *
 * @param {string} str raw input string
 * @return {object} output, with keys:
 *   shape {array}: dimensions of data
 *   data {TypedArray}: data
 */
function deserialize(str) {
  let isBooleanArray = false;
  let booleanArrayShape;
  if (str.slice(0, 4) === 'bool') {
    isBooleanArray = true;
    booleanArrayShape = [];
    const numDimensions = readUint32At(str, 4);
    for (let i = 0; i < numDimensions; i++) {
      booleanArrayShape.push(readUint32At(str, 8 + (4 * i)));
    }
    str = str.slice(8 + (4 * numDimensions));
  }
  if (str.slice(0, 6) !== '\x93NUMPY') {
    throw new Error('Invalid magic number');
  }
  const version = readUint16At(str, 6);
  if (version !== 1) {
    throw new Error(`Unsupported version: ${version}`);
  }
  const headerLength = readUint16At(str, 8);
  const bodyIndex = 10 + headerLength;
  const header = JSON.parse(
      str.slice(10, bodyIndex)
          .replace(/'/g, '"')
          .replace(/\(/g, '[')
          .replace(/\)/g, ']')
          .replace(/True|False/g, (s) => s.toLowerCase())
          .replace(/\s+/g, '')
          .replace(/,}/, '}')
          .replace(/,\]/, ']'),
  );
  const ArrayType = DATA_TYPES[header.descr];
  if (!ArrayType) {
    throw new Error(`Unsupported data type: "${header.descr}"`);
  }
  const rawData = Uint8Array.from(str.slice(bodyIndex), (s) => s.charCodeAt(0));
  if (isBooleanArray) {
    return {
      shape: booleanArrayShape,
      data: unpackBits(rawData, booleanArrayShape),
    };
  }

  const typedData = (ArrayType === Uint8Array) ? rawData :
      new ArrayType(rawData.buffer, rawData.byteOffset, rawData.byteLength);
  return {
    shape: header.shape,
    data: typedData,
  };
}
