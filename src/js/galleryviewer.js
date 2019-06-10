/**
 * @module galleryviewer.js
 * @summary Defines a client-side media player that can display a zip of
 * images and render metadata overlayed atop them.
 *
 * @desc GalleryViewer is a javascript based image gallery that can render
 * available annotation and markup overlayed on top of the images.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  MediaPlayer,
} from './mediaplayer.js';

// ES6 module export
export {
  GalleryViewer,
};


/**
 * GalleryViewer Class Definition
 *
 * INHERITS: MediaPlayer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in format gallery/<format>
 * ex. type: "gallery/jpg"
 * @param {string} overlay is data that should be overlayed on the images.
 */
function GalleryViewer(media, overlay) {
  MediaPlayer.call(this, 'gallery', media, overlay);
}
GalleryViewer.prototype = Object.create(MediaPlayer.prototype);
GalleryViewer.prototype.constructor = GalleryViewer;


/**
 * Poster is not for image galleries.
 *
 * @member poster
 * @param {string} url Image to be shown while loading.
 */
GalleryViewer.prototype.poster = function(url) {
  console.log('WARN: Poster not supposed to be called by GalleryViewer.');
};


/**
 * Loop is not for image galleries.
 *
 * @member loop
 */
GalleryViewer.prototype.loop = function() {
  console.log('WARN: Loop not supposed to be called by GalleryViewer.');
};


/**
 * Autoplay is not for image galleries.
 *
 * @member autoplay
 */
GalleryViewer.prototype.autoplay = function() {
  console.log('WARN: Autoplay not supposed to be called by GalleryViewer.');
};


/**
 * ResetToFragment is not for image galleries.
 *
 * @member resetToFragment
 */
GalleryViewer.prototype.resetToFragment = function() {
  console.log(
      'WARN: ResetToFragment not supposed to be called by GalleryViewer.');
};


/**
 * This changes the behaviour of the gallery viewer in the following ways.
 * 1. The caller can associate an action with clicking on an image.
 * 2. Annotations are drawn on mouse-over.
 * Caller probably wants to set the size of the images via forceSize()
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on an image.
 */
GalleryViewer.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this._thumbnailClickAction = action;
};
