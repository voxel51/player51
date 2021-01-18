/**
 * @module videoplayer.js
 * @summary Defines a client-side media player that can play videos and render
 * metadata overlayed atop them.
 *
 * @desc VideoPlayer is a javascript based video player that can also
 * render available annotations and markup overlayed on top of the
 * video.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */

import {
  MediaPlayer,
} from './mediaplayer.js';

export {
  VideoPlayer,
};


/**
 * VideoPlayer Class Definition
 *
 * INHERITS:  MediaPlayer
 * F-MIXINS:  None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format video/<format>
 * ex. type: "video/mp4"
 * @param {string} overlay is data that should be overlayed on the video.
 * Overlay can be empty (`null`), a string point to a single URL or
 * an object that is preloaded data.
 * @param {object} options: additional player options
 */
function VideoPlayer(media, overlay, options) {
  MediaPlayer.call(this, 'video', media, overlay, options);
  // Player View Attributes
  this.boolDrawFrameNumber = false;
  this.boolDrawTimestamp = false;
}
VideoPlayer.prototype = Object.create(MediaPlayer.prototype);
VideoPlayer.prototype.constructor = VideoPlayer;


/**
 * Set a poster frame URL to display while the video itself is loading
 *
 * @member setLoadingPoster
 * @param {string} url Image to be shown while loading.
 */
VideoPlayer.prototype.setLoadingPoster = function(url) {
  this._boolHasPoster = true;
  this._loadingPosterURL = url;
};


/**
 * Force the video to loop.
 *
 * @member loop
 * @param {bool} boolLoop
 */
VideoPlayer.prototype.loop = function(boolLoop = true) {
  this.renderer._boolLoop = boolLoop;
};


/**
 * Play the video, if it is not already playing.
 *
 * @member play
 */
VideoPlayer.prototype.play = function() {
  this.renderer._boolPlaying = true;
  this.renderer.updateFromDynamicState();
};


/**
 * Pause the video, if it is not already paused.
 *
 * @member pause
 */
VideoPlayer.prototype.pause = function() {
  this.renderer._boolPlaying = false;
  this.renderer.updateFromDynamicState();
};


/**
 * Returns true if the mouse is hovering over the player, and false, if not.
 *
 * @member isHovering
 *
 * @return {bool} if the mouse is hovering over the player
 */
VideoPlayer.prototype.isHovering = function() {
  return this._boolHovering;
};


/**
 * Force the video to autoplay when rendered.
 *
 * @member autoplay
 * @param {bool} boolAutoplay
 */
VideoPlayer.prototype.autoplay = function(boolAutoplay = true) {
  if (this.renderer._boolSingleFrame && boolAutoplay) {
    boolAutoplay = false;
    this.renderer._boolPlaying = true;
  }
  this.renderer._boolAutoplay = boolAutoplay;
  this.renderer.updateFromDynamicState();
};


/**
 * If the player has a media fragment, reset to the initial state:
 * - locks to the fragment
 * - sets the scrub head to the beginning of the fragment
 *
 * Maintains the playing state.
 *
 * @member resetToFragment
 * @return {bool} true if reset happens
 */
VideoPlayer.prototype.resetToFragment = function() {
  if (!this.renderer._hasMediaFragment || !this.renderer._isRendered) {
    return false;
  }
  this.renderer.eleVideo.currentTime = this.renderer._mfBeginT;
  this.renderer._lockToMF = true;

  this.renderer.updateFromDynamicState();
  return true;
};


/**
 * This changes the behaviour of the video player in the following ways.
 * 1. The caller can associate an action with clicking on the image.
 * 2. Video controls are never available.
 * 3. The video plays over mouse-over.
 * 4. The video is set to loop.
 * 5. Less information is visualized.
 * Caller probably wants to set the size of the video via forceSize()
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on the video.
 */
VideoPlayer.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this._thumbnailClickAction = action;
  this.loop(true);
};
