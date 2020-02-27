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
  // < = little-endian, > = big-endian, | = host architecture
  // we assume hosts are little-endian (like x86) so big-endian types are only
  // supported for 8-bit integers, where endianness doesn't matter
  '|b1': Uint8Array,
  '<b1': Uint8Array,
  '>b1': Uint8Array,
  '|u1': Uint8Array,
  '<u1': Uint8Array,
  '>u1': Uint8Array,
  '|i1': Int8Array,
  '<i1': Int8Array,
  '>i1': Int8Array,

  '|u2': Uint16Array,
  '<u2': Uint16Array,
  '|i2': Int16Array,
  '<i2': Int16Array,

  '|u4': Uint32Array,
  '<u4': Uint32Array,
  '|i4': Int32Array,
  '<i4': Int32Array,

  '|u8': convert64to32Array(Uint32Array),
  '<u8': convert64to32Array(Uint32Array),
  '|i8': convert64to32Array(Int32Array),
  '<i8': convert64to32Array(Int32Array),
};


/**
 * Polyfill to convert a 64-bit integer array to a 32-bit integer array. This
 * assumes that no element actually requires more than 32 bits to store, which
 * should be a safe assumption for our purposes.
 *
 * @param {function} TargetArrayType the TypedArray subclass to produce (either
 *   Int32Array or Uint32Array)
 * @return {function} wrapper around the TargetArrayType constructor
 */
function convert64to32Array(TargetArrayType) {
  // we only need the 3-argument constructor to be implemented. For details:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
  const makeArray = function(buffer, byteOffset, length) {
    // view buffer as 32-bit type and copy the 4 lowest bytes out of every 8
    // bytes into a new array (assumes little-endian)
    const source = new TargetArrayType(buffer, byteOffset, length * 2);
    const target = new TargetArrayType(source.length);
    for (let i = 0; i < target.length; i++) {
      target[i] = source[i * 2];
    }
    return target;
  };
  // needed by parse()
  makeArray.BYTES_PER_ELEMENT = 8;
  return makeArray;
}

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
      new ArrayType(rawData.buffer, rawData.byteOffset,
          rawData.byteLength / ArrayType.BYTES_PER_ELEMENT);
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
