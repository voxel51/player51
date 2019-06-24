/**
 * @module imageviewer.js
 * @summary Defines a client-side media player that can display images
 * and render metadata overlayed atop them.
 *
 * @desc ImageViewer is a javascript based image displayer that can also
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
  ImageViewer,
};


/**
 * ImageViewer Class Definition
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
function ImageViewer(media, overlay) {
  MediaPlayer.call(this, 'image', media, overlay);
}
ImageViewer.prototype = Object.create(MediaPlayer.prototype);
ImageViewer.prototype.constructor = ImageViewer;


/**
 * Poster is not for images.
 * Not supported
 *
 * @member poster
 * @param {string} url Image to be shown while loading.
 */
ImageViewer.prototype.poster = function(url) {
};


/**
 * Loop is not for images.
 * Not supported.
 *
 * @member loop
 */
ImageViewer.prototype.loop = function() {
};


/**
 * Autoplay is not for images.
 * Not supported.
 *
 * @member autoplay
 */
ImageViewer.prototype.autoplay = function() {
};


/**
 * ResetToFragment is not for images
 * Not supported.
 *
 * @member resetToFragment
 */
ImageViewer.prototype.resetToFragment = function() {
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
ImageViewer.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this._thumbnailClickAction = action;
};
