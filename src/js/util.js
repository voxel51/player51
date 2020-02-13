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
