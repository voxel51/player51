/**
 * @module imageviewer.js
 * @summary Defines a client-side media player that can display images
 * and render metadata overlayed atop them.
 *
 * @desc ImageViewer is a javascript based image displayer that can also
 * render available annotations and markup overlayed on top of the
 * image.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import { MediaPlayer } from "./mediaplayer.js";

export { ImageViewer };

/**
 * ImageViewer Class Definition
 *
 * INHERITS:  MediaPlayer
 * F-MIXINS:  None
 * @constructor
 * @param {object} src URL to media
 * @param {string} sample is data that should be overlayed on the image.
 * @param {object} options: additional player options
 */
function ImageViewer(src, sample, options) {
  MediaPlayer.call(this, "image", src, sample, options);
}
ImageViewer.prototype = Object.create(MediaPlayer.prototype);
ImageViewer.prototype.constructor = ImageViewer;

/**
 * SetLoadingPoster is not for images.
 * Not supported.
 *
 * @member setLoadingPoster
 * @param {string} url Image to be shown when loading.
 */
ImageViewer.prototype.setLoadingPoster = function (url) {};

/**
 * Loop is not for images.
 * Not supported.
 *
 * @member loop
 */
ImageViewer.prototype.loop = function () {};

/**
 * Autoplay is not for images.
 * Not supported.
 *
 * @member autoplay
 */
ImageViewer.prototype.autoplay = function () {};

/**
 * ResetToFragment is not for images
 * Not supported.
 *
 * @member resetToFragment
 */
ImageViewer.prototype.resetToFragment = function () {};
