/**
 * @module mediaplayer.js
 * @summary Defines an abstract base class that enforces child
 * players' available methods.
 *
 * @desc MediaPlayer.js is an abstract class that defines the features
 * child players should be able to support.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */


import {
  VideoRenderer,
} from './renderers/videorenderer.js';
import {
  ImageRenderer,
} from './renderers/imagerenderer.js';
import {
  GalleryRenderer,
} from './renderers/galleryrenderer.js';

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
 * @param {string} type is the media content type
 * @param {object} media
 * @param {string} overlay is a URL to the overlay JSON
 * @param {int} fps is frames per second
 *
 */
function MediaPlayer(type, media, overlay, fps) {
  if (this.constructor === MediaPlayer) {
    throw new TypeError('Cannot instantiate abstract class.');
  }

  if (type === 'video') {
    this.renderer = new VideoRenderer(media, overlay, fps);
  } else if (type === 'image') {
    this.renderer = new ImageRenderer(media, overlay);
  } else if (type == 'gallery') {
    this.renderer = new GalleryRenderer(media, overlay);
  } else {
    throw new Error('Renderer not initialized.');
  }
  // Player prerender attributes
  this._boolForcedMax = false;
  this._boolForcedSize = false;
  this._forcedWidth = -1;
  this._forcedHeight = -1;
  this._boolThumbnailMode = false;
  this._thumbnailClickAction = undefined;
  this._boolHasPoster = false;
  this._posterURL = '';
}


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
* Render a new viewer for this media within the DOM element provided
*
* @member render
* @param {domElement} parentElement String id of the parentElement or
* actual Div object.
*/
MediaPlayer.prototype.render = function(parentElement) {
  this.staticRender(parentElement);
  this.dynamicRender();
};


/**
* Render the media and context without any functionality
*
* @member staticRender
* @param {domElement} parentElement String id of parentElement or actual
* Div object
*/
MediaPlayer.prototype.staticRender = function(parentElement) {
  this.renderer.setParentofMedia(parentElement);
  this.renderer.initPlayer();
  this.renderer._isRendered = true;
};


/**
* Render the UI controls and dynamic functionality
*
* @member dynamicRender
* @required staticRender() has to be called beforehand
*/
MediaPlayer.prototype.dynamicRender = function() {
  this.renderer.setPlayer(this);
  this.renderer.initSharedControls();
  this.renderer.initPlayerControls();
};


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
