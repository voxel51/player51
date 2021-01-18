/**
 * @module imagesequence.js
 * @summary Defines a client-side media player that can load a zip of images
 * and play throught like a video while rendering overlayed metadata.
 *
 * @desc ImageSequence is a javascript based image player that can take a
 * sequence of images and render annotations and markup overlayed on top while
 * playing through like a video.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
*/

import {
  MediaPlayer,
} from './mediaplayer.js';

export {
  ImageSequence,
};


/**
 * ImageSequence Class Definition
 *
 * INHERITS: MediaPlayer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format imagesequence/<format>
 * ex. type: "imagesequence/zip"
 * @param {string} overlay is data that should be overlayed on the psuedo video.
 * Overlay is a path to a file of eta.core.image.ImageSetLabels format.
 * @param {int} fps is the frame-rate of the media.
 */
function ImageSequence(media, overlay, fps) {
  MediaPlayer.call(this, 'imagesequence', media, overlay, fps);
}
ImageSequence.prototype = Object.create(MediaPlayer.prototype);
ImageSequence.prototype.constructor = ImageSequence;


/**
 * Set a poster frame UR to display while the image sequence is loading
 *
 * @member setLoadingPoster
 * @param {string} url Image to be shown while loading.
 */
ImageSequence.prototype.setLoadingPoster = function(url) {
  this._boolHasPoster = true;
  this._loadingPosterURL = url;
};


/**
 * Loop is not for image sequences.
 * Not supported.
 *
 * @member loop
 */
ImageSequence.prototype.loop = function() {
};


/**
 * Autoplay is not for image sequences.
 * Not supported.
 *
 * @member autoplay
 */
ImageSequence.prototype.autoplay = function() {
};


/**
 * ResetToFragment is not for image sequences.
 * Not supported.
 *
 * @member resetToFragment
 */
ImageSequence.prototype.resetToFragment = function() {
};


/**
 * ThumbnailMode is not for image sequences.
 * Not supported.
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on an image.
 */
ImageSequence.prototype.thumbnailMode = function(action) {
};
