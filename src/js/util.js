/**
 * @module util.js
 * @summary Utilities for player51
 *
 * Copyright 2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */


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
