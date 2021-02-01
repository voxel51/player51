/**
 * @module galleryviewer.js
 * @summary Defines a client-side media player that can display a zip of
 * images and render metadata overlayed atop them.
 *
 * @desc GalleryViewer is a javascript based image gallery that can render
 * available annotation and markup overlayed on top of the images.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  MediaPlayer,
} from './mediaplayer.js';

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
 * @param {object} options: additional player options
 */
function GalleryViewer(media, overlay, options) {
  MediaPlayer.call(this, 'gallery', media, overlay, options);
}
GalleryViewer.prototype = Object.create(MediaPlayer.prototype);
GalleryViewer.prototype.constructor = GalleryViewer;


/**
 * Set a poster frame URL to display while the gallery itself is loading
 *
 * @member setLoadingPoster
 * @param {string} url Image to be shown while loading.
 */
GalleryViewer.prototype.setLoadingPoster = function(url) {
  this._boolHasPoster = true;
  this._loadingPosterURL = url;
};


/**
 * Loop is not for image galleries.
 * Not supported.
 *
 * @member loop
 */
GalleryViewer.prototype.loop = function() {
};


/**
 * Autoplay is not for image galleries.
 * Not supported.
 *
 * @member autoplay
 */
GalleryViewer.prototype.autoplay = function() {
};


/**
 * ResetToFragment is not for image galleries.
 * Not supported.
 *
 * @member resetToFragment
 */
GalleryViewer.prototype.resetToFragment = function() {
};


/**
 * ThumbnailMode is not for image galleries.
 * Not supported.
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on an image.
 */
GalleryViewer.prototype.thumbnailMode = function(action) {
};
