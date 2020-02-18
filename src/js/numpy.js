/**
 * @module numpy.js
 * @summary Utilities to parse serialized numpy arrays
 *
 * Copyright 2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */

import pako from './pako_inflate.js';

export {
  deserialize,
};

const DATA_TYPES = {
  '|b1': Uint8Array,
  '|u1': Uint8Array,
};

/**
 * Parses a uint16 (unsigned 16-bit integer) at a specified position in a
 * Uint8Array
 *
 * @param {Uint8Array} array input array
 * @param {number} index index of uint16
 * @return {number} parsed uint16
 */
function readUint16At(array, index) {
  return array[index] + (array[index + 1] << 8);
}

/**
 * Parses a string at a specified position in a Uint8Array
 *
 * @param {Uint8Array} array input array
 * @param {number} start index where string starts (inclusive)
 * @param {number} end index where string ends (exclusive)
 * @return {string}
 */
function readStringAt(array, start, end) {
  return Array.from(array.slice(start, end))
      .map((c) => String.fromCharCode(c)).join('');
}

/**
 * Parses a saved numpy array
 *
 * @param {Uint8Array} array raw input array
 * @return {object} output, with keys:
 *   shape {array}: dimensions of data
 *   data {TypedArray}: data
 */
function parse(array) {
  if (readStringAt(array, 0, 6) !== '\x93NUMPY') {
    throw new Error('Invalid magic number');
  }
  const version = readUint16At(array, 6);
  if (version !== 1) {
    throw new Error(`Unsupported version: ${version}`);
  }
  const headerLength = readUint16At(array, 8);
  const bodyIndex = 10 + headerLength;
  const header = JSON.parse(
      readStringAt(array, 10, bodyIndex)
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
  const rawData = array.slice(bodyIndex);
  const typedData = (ArrayType === Uint8Array) ? rawData :
      new ArrayType(rawData.buffer, rawData.byteOffset, rawData.byteLength);
  return {
    shape: header.shape,
    data: typedData,
  };
}

/**
 * Deserializes and parses a saved numpy array
 *
 * @param {string} str input string (zlib-compressed and base64-encoded)
 * @return {object} output, with keys:
 *   shape {array}: dimensions of data
 *   data {TypedArray}: data
 */
function deserialize(str) {
  return parse(pako.inflate(atob(str)));
}
