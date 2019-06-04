/**
 * @module imageviewer51.js
 * @summary Defines a client-side media player that can display images
 * and render metadata overlayed atop them.
 *
 * @desc ImageViewer51 is a javascript based image displayer that can also
 * render available annotations and markup overlayed on top of the
 * image.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  MediaPlayer,
} from './mediaplayer.js';

// ES6 module export
export {
  ImageViewer51,
};


/**
 * ImageViewer51 Class Definition
 *
 * INHERITS:  MediaPlayer
 * F-MIXINS:  None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format image/<format>
 * ex. type: "image/jpg"
 * @param {string} overlay is data that should be overlayed on the image.
 * Overlay is a path to a file of eta.core.image.ImageLabels format.
 */
function ImageViewer51(media, overlay) {
  MediaPlayer.call(this, 'image', media, overlay);
}
ImageViewer51.prototype = Object.create(MediaPlayer.prototype);
ImageViewer51.prototype.constructor = ImageViewer51;


/**
 * Poster is not for images.
 *
 * @member poster
 * @param {string} url Image to be shown while loading.
 */
ImageViewer51.prototype.poster = function(url) {
  console.log('WARN: Poster not supposed to be called by imageviewer51.');
};


/**
 * Loop is not for images.
 *
 * @member loop
 */
ImageViewer51.prototype.loop = function() {
  console.log('WARN: Loop not supposed to be called by imageviewer51.');
};


/**
 * Autoplay is not for images.
 *
 * @member autoplay
 */
ImageViewer51.prototype.autoplay = function() {
  console.log('WARN: Autoplay not supposed to be called by imageviewer51.');
};


/**
 * ResetToFragment is not for images
 *
 * @member resetToFragment
 */
ImageViewer51.prototype.resetToFragment = function() {
  console.log(
      'WARN: ResetToFragment not supposed to be called by imageviewer51.');
};


/**
 * This changes the behaviour of the image viewer in the following ways.
 * 1. The caller can associate an action with clicking on the image.
 * 2. Annotations are drawn on mouse-over.
 * Caller probably wants to set the size of the image via forceSize()
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on the image.
 */
ImageViewer51.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this._thumbnailClickAction = action;
};
