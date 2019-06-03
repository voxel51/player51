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
  FrameAttributesOverlay,
  ObjectOverlay,
} from './overlay.js';
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
  MediaPlayer.call(this, 'image');

  this.media = media;
  this.frameOverlay = []; // will be used to store the labels

  this._isImageLoaded = false;
  this._overlayURL = overlay;
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


/**
 * Request resources from the server and then draw objects onto image
 *
 * @member annotate
 * @param {string} overlayPath is the path to the overlay JSON file.
 */
ImageViewer51.prototype.annotate = function(overlayPath) {
  if (this._boolThumbnailMode) {
    return;
  }

  if (!this._isRendered || !this._isSizePrepared) {
    console.log(
        'Player51 WARN: Tried to annotate, hasn\'t been rendered yet.'
    );
    return;
  }

  const self = this;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      const overlayData = JSON.parse(this.responseText);
      self.prepareOverlay(overlayData);
      self.draw();
    }
  };
  xmlhttp.open('GET', overlayPath, true);
  xmlhttp.send();
};


/**
 * Draws objects onto the canvas
 *
 * @member draw
 * @required overlay to be prepared.
 */
ImageViewer51.prototype.draw = function() {
  const context = this.renderer.setupCanvasContext();

  context.clearRect(
      0, 0, this.renderer.canvasWidth, this.renderer.canvasHeight);

  for (let len = this.frameOverlay.length, i = 0; i < len; i++) {
    const obj = this.frameOverlay[i];
    obj.draw(context, this.renderer.canvasWidth, this.renderer.canvasHeight);
  }
};


/**
 * Callback for asynchronous retrieval of a json file.
 *
 * The overlay is represented as a dictonary of objects in
 * eta.core.image.ImageLabels format
 * @member prepareOverlay
 * @param {json} rawjson is a dictonary of objects in correct format
 */
ImageViewer51.prototype.prepareOverlay = function(rawjson) {
  const context = this.renderer.setupCanvasContext();

  if (typeof(rawjson.objects) !== 'undefined') {
    this.prepareObjects(context, rawjson.objects.objects);
  }

  if (typeof(rawjson.attrs) !== 'undefined') {
    const o = new FrameAttributesOverlay(rawjson.attrs, this);
    o.setup(context, this.renderer.canvasWidth, this.renderer.canvasHeight);
    this.frameOverlay.push(o);
  }
};


/**
 * Helper function to create each object to be overlayed on top of the image.
 *
 * @param {canvasObject} context is the canvas to be drawn to.
 * @param {json} objects us a dictionary of objects to be drawn.
 */
ImageViewer51.prototype.prepareObjects = function(context, objects) {
  for (let len = objects.length, i = 0; i < len; i++) {
    const o = new ObjectOverlay(objects[i], this);
    o.setup(context, this.renderer.canvasWidth, this.renderer.canvasHeight);
    this.frameOverlay.push(o);
  }
};
