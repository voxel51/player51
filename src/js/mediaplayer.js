/**
 * @module mediaplayer.js
 * @summary Defines an abstract base class that enforces child
 * players' available methods.
 *
 * @desc MediaPlayer.js is an abstract class that defines the features
 * child players should be able to support.
 *
 * Copyright 2019-2020, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */


import {
  ColorGenerator,
} from './overlay.js';
import {
  Renderer51,
} from './renderer51.js';

// ES6 module export
export {
  MediaPlayer,
};


/**
 * MediaPlayer Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @abstract
 *
 */
function MediaPlayer() {
  // Base variables
  this.colorGenerator = new ColorGenerator();
  this.renderer = new Renderer51();
  // Player state attributes
  this._isRendered = false;
  this._isSizePrepared = false;
  // Player prerender attributes
  this._boolForcedMax = false;
  this._boolForcedSize = false;
  this._forcedWidth = -1; // set via `forceSize()`
  this._forcedHeight = -1; // set via `forceSize()`
  this._boolThumbnailMode = false;
  this._thumbnailClickAction = undefined;
  this._boolHasPoster = false; // set via `poster()`
  this._posterURL = ''; // set via `poster()`


  if (this.constructor === MediaPlayer) {
    throw new TypeError('Cannot instantiate abstract class.');
  }
}

/**
 * Implementation required
 */


/**
 * Define abstract function poster to be implemented in subclasses
 *
 * @member poster
 * @abstract
 * @param {string} url Image to be shown while loading
 */
MediaPlayer.prototype.poster = function(url) {
  throw new Error('Method poster() must be implemented.');
};


/**
 * Define abstract function loop to be implemented in subclasses
 *
 * @member loop
 * @abstract
 */
MediaPlayer.prototype.loop = function() {
  throw new Error('Method loop() must be implemented.');
};


/**
 * Define abstract function autoplay to be implemented in subclasses
 *
 * @member autoplay
 * @abstract
 */
MediaPlayer.prototype.autoplay = function() {
  throw new Error('Method autoplay() must be implemented.');
};


/**
 * Define abstract function resetToFragment to be implemented in subclasses
 *
 * @member resetToFragment
 * @abstract
 */
MediaPlayer.prototype.resetToFragment = function() {
  throw new Error('Method resetToFragment() must be implemented.');
};


/**
 * Define abstract function thumbnailMode to be implemented in subclasses
 *
 * @member thumbnailMode
 * @abstract
 * @param {function} action (optional) a callback function to associate with
 * a click event.
 */
MediaPlayer.prototype.thumbnailMode = function(action) {
  throw new Error('Method thumbnailMode() must be implemented.');
};


/**
 * Define abstract function render to be implemented in subclasses
 *
 * @member render
 * @abstract
 */
MediaPlayer.prototype.render = function() {
  throw new Error('Method render() must be implemented.');
};


/**
 * Define abstract function staticRender to be implemented in subclasses
 *
 * @member staticRender
 * @abstract
 */
MediaPlayer.prototype.staticRender = function() {
  throw new Error('Method staticRender() must be implemented.');
};


/**
 * Define abstract function dynamicRender to be implemented in subclasses
 *
 * @member dynamicRender
 * @required staticRender() has to be called beforehand
 * @abstract
 */
MediaPlayer.prototype.dynamicRender = function() {
  throw new Error('Method dynamicRender() must be implemented.');
};


/**
 * Implementation optional
 */


/**
 * Forces a manual size to the video or image and canvas.
 *
 * @member forceSize
 * @required  Must be called before render; will not work dynamically.
 * Will not actually be effected until render is called
 * (and the loadedmetadata handler happens)
 * @param {int} width
 * @param {int} height
 */
MediaPlayer.prototype.forceSize = function(width, height) {
  if (this._boolForcedMax) {
    console.log('Warning!  Both forceSize and forcedMax were called.');
    console.log('Warning!  forceSize wins.');
  }
  this._boolForcedSize = true;
  this._forcedWidth = width;
  this._forcedHeight = height;
};


/**
 * Forces the media to max and native video resolution up to 720p
 *
 * @member forceMax
 * @required Must be called before render; will not work dynamically.
 * Will not actually be effected until render is called
 * (and the loadedmetadata handler happens)
 */
MediaPlayer.prototype.forceMax = function() {
  if (this._boolForcedSize) {
    console.log('Warning!  Both forceSize and forcedMax were called.');
    console.log('Warning!  forceSize wins.');
  }
  this._boolForcedMax = true;
};


/**
 * Used by overlay rendering code.
 *
 * @member checkFontHeight
 * @param {int} h is font height
 * @return {int} h is the current height
 */
MediaPlayer.prototype.checkFontHeight = function(h) {
  if (h == 0) {
    console.log('PLAYER51 WARN: fontheight 0');
    return 10;
  }
  return h;
};
