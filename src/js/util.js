/**
 * @module util.js
 * @summary Utilities for player51
 *
 * Copyright 2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */

/**
 * Shallow data-object comparison for equality
 * @param {Object} a - first object to compare
 * @param {Object} b - second object to compare
 * @return {boolean} true if ==
 */
export function compareData(a, b) {
  for (const p in a) {
    if (a.hasOwnProperty(p) !== b.hasOwnProperty(p)) {
      return false;
    } else if (a[p] != b[p]) {
      return false;
    }
  }
  for (const p in b) {
    if (!(p in a)) {
      return false;
    }
  }
  return true;
}


/**
 * Scales a number from one range to another.
 *
 * @param {number} n number to scale
 * @param {number} oldMin minumum of current range
 * @param {number} oldMax maximum of current range
 * @param {number} newMin minumum of range to scale to
 * @param {number} newMax maximum of range to scale to
 * @return {number} scaled value
 */
export function rescale(n, oldMin, oldMax, newMin, newMax) {
  const normalized = (n - oldMin) / (oldMax - oldMin);
  return (normalized * (newMax - newMin)) + newMin;
}

/**
 * Checks whether a point is contained in a rectangle.
 *
 * @param {number} x point X coordinate
 * @param {number} y point Y coordinate
 * @param {number} rectX rectangle's leftmost X coordinate
 * @param {number} rectY rectangle's topmost Y coordinate
 * @param {number} rectW rectangle's width
 * @param {number} rectH rectangle's height
 * @return {boolean}
 */
export function inRect(x, y, rectX, rectY, rectW, rectH) {
  return x >= rectX && x <= rectX + rectW &&
         y >= rectY && y <= rectY + rectH;
}


/**
 * Recursively map a function to all nodes in a tree
 * @param {Object} node - an object with children accessed by .childNodes
 * @param {Function} func - function that takes node as an argument
 */
export function recursiveMap(node, func) {
  node.childNodes.forEach((n) => recursiveMap(n, func));
  func(node);
}


/**
 * Get the Bbox dimensions for an array of text and their rendering sizes
 * @param {RenderingContext} context - the rendering context
 * @param {Array/String} text - array of strings split by line
 * @param {Number} textHeight - height of the font for the text
 * @param {Number} padding - amount of padding, num pixels
 * @return {Object} object with keys: width, height
 */
export function computeBBoxForTextOverlay(context, text, textHeight, padding) {
  const lines = getArrayByLine(text);
  const width = getMaxWidthByLine(context, lines, padding);
  const height = getMaxHeightForText(lines, textHeight, padding);
  return {width, height};
}

/**
 * Get the max height for an array of text lines
 * @param {Array} lines - array of strings split by line
 * @param {Number} textHeight - height of the font for the text
 * @param {Number} padding - amount of padding, num pixels
 * @return {Number} height
 */
export function getMaxHeightForText(lines, textHeight, padding) {
  return lines.length * (textHeight + padding) + padding;
}

/**
 * Get the max width of an array of text lines
 * @param {RenderingContext} context - the rendering context
 * @param {Array} lines - array of strings split by line
 * @param {Number} padding - amount of padding, num pixels
 * @return {Number} width
 */
export function getMaxWidthByLine(context, lines, padding) {
  let maxWidth = 0;
  for (const line of lines) {
    const lineWidth = context.measureText(line).width;
    if (lineWidth === 0) {
      /* eslint-disable-next-line no-console */
      console.log('PLAYER51 WARN: rendering context broken');
      return;
    }
    if (lineWidth > maxWidth) {
      maxWidth = lineWidth;
    }
  }
  return maxWidth + (2 * padding);
}

/**
 * Get text as an array of lines
 * @param {Array/String} text - array of strings split by line
 * @return {Array} width
 */
function getArrayByLine(text) {
  if (Array.isArray(text)) {
    return text;
  }
  return text.split('\n');
}
