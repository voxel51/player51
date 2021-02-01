/**
 * @module mediaplayer.js
 * @summary Defines an abstract base class that enforces child
 * players' available methods.
 *
 * @desc MediaPlayer.js is an abstract class that defines the features
 * child players should be able to support.
 *
 * Copyright 2017-2021, Voxel51, Inc.
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
import {
  ImageSequenceRenderer,
} from './renderers/imagesequencerenderer.js';

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
 * @param {object} options: additional player options
 *
 */
function MediaPlayer(type, media, overlay, options) {
  if (this.constructor === MediaPlayer) {
    throw new TypeError('Cannot instantiate abstract class.');
  }
  if (type === 'video') {
    this.renderer = new VideoRenderer(media, overlay, options);
  } else if (type === 'image') {
    this.renderer = new ImageRenderer(media, overlay, options);
  } else if (type == 'gallery') {
    this.renderer = new GalleryRenderer(media, overlay, options);
  } else if (type == 'imagesequence') {
    this.renderer = new ImageSequenceRenderer(media, overlay, options);
  } else {
    throw new Error('invalid media type: ' + type);
  }
  // Player prerender attributes
  this._boolForcedMax = false;
  this._boolForcedSize = false;
  this._forcedWidth = -1;
  this._forcedHeight = -1;
  this._boolThumbnailMode = false;
  this._thumbnailClickAction = undefined;
  this._boolHasPoster = false;
  this._boolNotFound = false;
  this._loadingPosterURL = '';
  this._notFoundPosterURL = '';
  this._boolHovering = false;
  MediaPlayer._installEventHandlers();
  if (!MediaPlayer._instances) {
    MediaPlayer._instances = [];
    MediaPlayer._focusedInstance = null;
  }
  MediaPlayer._instances.push(this);
}


/**
 * Destroy the player
 * @member destroy
 */
MediaPlayer.prototype.destroy = function() {
  MediaPlayer._instances = MediaPlayer._instances.filter(
      (player) => player !== this);
  if (MediaPlayer._focusedInstance === this) {
    MediaPlayer._focusedInstance = null;
  }
  this.renderer.destroy();
  delete this.renderer;
};


/**
 * Define abstract function setLoadingPoster to be implemented in subclasses
 *
 * @member setLoadingPoster
 * @abstract
 * @param {string} url Image to be shown while loading
 */
MediaPlayer.prototype.setLoadingPoster = function(url) {
  throw new Error('Method setLoadingPoster() must be implemented.');
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
* Update player options - only the options passed in
*
* @member updateOptions
* @param {object} options: new player options
*/
MediaPlayer.prototype.updateOptions = function(options) {
  Object.assign(this.renderer.options, options);
  this.renderer.processFrame();
};


/**
* Get player overlay options
*
* @member getOverlayOptions
* @return {object} copy of player overlay options
*/
MediaPlayer.prototype.getOverlayOptions = function() {
  return Object.assign({}, this.renderer.overlayOptions);
};


/**
* Update player overlay options - only the options passed in
*
* @member updateOverlayOptions
* @param {object} overlayOptions: new player overlay options
*/
MediaPlayer.prototype.updateOverlayOptions = function(overlayOptions) {
  Object.assign(this.renderer.overlayOptions, overlayOptions);
  this.renderer.eleOptCtlShowAttr.checked = overlayOptions.showAttrs;
  this.renderer.eleOptCtlShowConfidence.checked = overlayOptions.showConfidence;
  this.renderer.processFrame();
};


/**
 * Update the player's overlay
 *
 * @member updateOverlay
 * @param {overlayData} overlayData: new overlayData
 */
MediaPlayer.prototype.updateOverlay = function(overlayData) {
  this.renderer.updateOverlay(overlayData);
};


/**
 * Return the original size of the underlying content (image, video).
 *
 * @return {object|null} with keys `width` and `height`, or null if the content
 *   size cannot be determined or is not applicable (e.g. for galleries)
 */
MediaPlayer.prototype.getContentDimensions = function() {
  return this.renderer.getContentDimensions();
};


/**
 * Add a custom event handler.
 *
 * @param {string} eventType - the type of the event
 * @param {string} handler - the handler to call
 * @param {*} args - additional arguments to pass to the native
 *   addEventListener()
 */
MediaPlayer.prototype.addEventListener = function(eventType, handler, ...args) {
  this.renderer.eventTarget.addEventListener(eventType, handler, ...args);
};


/**
 * Remove a custom event handler.
 *
 * @param {string} eventType - the type of the event
 * @param {string} handler - the handler to remove
 * @param {*} args - additional arguments to pass to the native
 *   removeEventListener()
 */
MediaPlayer.prototype.removeEventListener = function(eventType, handler,
    ...args) {
  this.renderer &&
    this.renderer.eventTarget.removeEventListener(eventType, handler, ...args);
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
    /* eslint-disable-next-line no-console */
    console.log('Warning!  Both forceSize and forcedMax were called.');
    /* eslint-disable-next-line no-console */
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
    /* eslint-disable-next-line no-console */
    console.log('Warning!  Both forceSize and forcedMax were called.');
    /* eslint-disable-next-line no-console */
    console.log('Warning!  forceSize wins.');
  }
  this._boolForcedMax = true;
};


/**
 * Sets an image to be shown if requested media is not found
 *
 * @member setNotFoundPoster
 * @param {string} url of the image to be shown
 */
MediaPlayer.prototype.setNotFoundPoster = function(url) {
  this._boolNotFound = true;
  this._notFoundPosterURL = url;
};


/**
 * Wrapper for setting a poster image
 *
 * @member poster
 * @param {string} url Image to be shown while loading
 * @param {string} option loading/404
 */
MediaPlayer.prototype.poster = function(url, option='loading') {
  if (option === 'loading') {
    this.setLoadingPoster(url);
  } else if (option === '404') {
    this.setNotFoundPoster(url);
  } else {
    throw new Error('Invalid poster option.');
  }
};


/**
 * Setter for boolDrawTimestamp
 *
 * @member setBoolDrawTimeStamp
 * @param {boolean} value
 */
MediaPlayer.prototype.setBoolDrawTimeStamp = function(value) {
  this.boolDrawTimestamp = value;
};


/**
 * Setter for boolDrawFrameNumber
 *
 * @member setBoolDrawFrameNumber
 * @param {boolean} value
 */
MediaPlayer.prototype.setBoolDrawFrameNumber = function(value) {
  this.boolDrawFrameNumber = value;
};


/**
 * Update the zip reader library configuration
 *
 * @member setZipLibraryParameters
 * @param {string} path to worker scripts, relative to zip.js
 */
MediaPlayer.prototype.setZipLibraryParameters = function(path) {
  if (this.renderer && this.renderer.reader) {
    this.renderer.reader.workerScriptsPath = path;
  }
};


/**
 * Obtain (or release) global keyboard focus, causing all keyboard events to be
 * handled by this player
 * @param {boolean} grab Whether to obtain focus (default true)
 */
MediaPlayer.prototype.grabKeyboardFocus = function(grab=true) {
  MediaPlayer._focusedInstance = grab ? this : null;
};


/**
 * Handle global click events to determine which player, if any, has focus for
 * keyboard events
 * @param {Event} e
 */
MediaPlayer._handleGlobalClick = function(e) {
  for (const player of MediaPlayer._instances) {
    if (player.renderer.parent && player.renderer.parent.contains(e.target)) {
      MediaPlayer._focusedInstance = player;
      return;
    }
  }
  if (MediaPlayer._focusedInstance) {
    MediaPlayer._focusedInstance.renderer._handleFocusLost();
  }
  MediaPlayer._focusedInstance = null;
};


/**
 * Pass global keyboard events to the appropriate player if one has focus
 * @param {Event} e
 */
MediaPlayer._handleGlobalKeyboard = function(e) {
  if (MediaPlayer._focusedInstance) {
    if (MediaPlayer._focusedInstance.renderer._handleKeyboardEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
};

/**
 * Install a global event handler to handle player focus
 */
MediaPlayer._installEventHandlers = function() {
  if (!MediaPlayer._installedEventHandlers) {
    window.addEventListener('click', MediaPlayer._handleGlobalClick);
    window.addEventListener('keydown', MediaPlayer._handleGlobalKeyboard);
    MediaPlayer._installedEventHandlers = true;
  }
};
