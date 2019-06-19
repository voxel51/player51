/**
 * @module imagerenderer.js
 * @summary Renders an image into the parentElement, handles the overlay and
 * produces the end output.
 *
 * @desc ImageRenderer is a class that controls the creation and viewing of
 * imageviewer.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer,
} from '../renderer.js';

// ES6 module export
export {
  ImageRenderer,
};


/**
 * ImageRenderer Class Definition
 *
 * INHERITS: Renderer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format image/<format>
 * ex. type: "image/jpg"
 * @param {string} overlay is data that should be overlayed on the image.
 * Overlay is a path to a file of eta.core.image.ImageLabels format.
 */
function ImageRenderer(media, overlay) {
  Renderer.call(this, media, overlay);
  this._frameNumber = 1;
}
ImageRenderer.prototype = Object.create(Renderer.prototype);
ImageRenderer.prototype.constructor = ImageRenderer;


/**
 * Initializes an image and canvas in parent
 *
 * @member initPlayer
 * @required setParentandMedia called beforehand
 */
ImageRenderer.prototype.initPlayer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivImage = document.createElement('div');
  this.eleDivImage.className = 'p51-contained-image';
  this.eleImage = document.createElement('img');
  this.eleImage.className = 'p51-contained-image';
  this.eleImage.setAttribute('src', this.media.src);
  this.eleImage.setAttribute('type', this.media.type);
  this.eleDivImage.appendChild(this.eleImage);
  this.parent.appendChild(this.eleDivImage);
  this.mediaElement = this.eleImage;
  this.mediaDiv = this.eleDivImage;
  this.initCanvas();
};


/**
 * This loads controls for imageviewer
 *
 * @member initPlayerControls
 * @required player to be set
 */
ImageRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();
  const self = this;

  // Update size
  this.eleImage.addEventListener('load', function() {
    self.updateSizeAndPadding();
    self.updateFromLoadingState();
    self.setupCanvasContext();
    self._isDataLoaded = true;
    self.updateFromLoadingState();
    if (!self.player._boolThumbnailMode) {
      self.processFrame();
    }
  });

  this.parent.addEventListener('mouseenter', function() {
    if (!self._isDataLoaded) {
      return;
    }
    if (self.player._boolThumbnailMode) {
      self.updateFromDynamicState();
    }
  });

  this.parent.addEventListener('mouseleave', function() {
    if (self.player._boolThumbnailMode) {
      self.setupCanvasContext().clearRect(0, 0, self
          .canvasWidth, self.canvasHeight);
    }
  });

  this.updateFromLoadingState();
};


/**
 * This determines the dimensions of the media
 *
 * @member determineMediaDimensions
 * @required initPlayer() to be called
 */
ImageRenderer.prototype.determineMediaDimensions = function() {
  this.mediaHeight = this.mediaElement.height;
  this.mediaWidth = this.mediaElement.width;
};


/**
 * Resizes controls
 *
 * @member resizeControls
 * @required initPlayer() to be called
 */
ImageRenderer.prototype.resizeControls = function() {
};


/**
 * This function is a controller
 * The dynamic state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromDynamicState
 */
ImageRenderer.prototype.updateFromDynamicState = function() {
  if ((!this._isRendered) || (!this._isSizePrepared)) {
    return;
  }
  if (this.player._boolThumbnailMode) {
    this.processFrame();
  }
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
ImageRenderer.prototype.updateFromLoadingState = function() {
  if ((this._isRendered) && (this._isSizePrepared)) {
    if (this._isDataLoaded) {
      this._isReadyProcessFrames = true;
    }
    // If we had to download the overlay data and it is ready
    if ((this._overlayData !== null) && (this._overlayURL !== null)) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
  }
};


/**
 * This function is a controller
 * Not for ImageViewer51
 *
 * @member updateStateFromTimeChange
 */
ImageRenderer.prototype.updateStateFromTimeChange = function() {
  console.log('WARN: updateStateFromTimeChange() not for imageviewer51');
};


/**
 * Generate a string that represents the state.
 *
 * @member state
 * @return {dictionary} state
 */
ImageRenderer.prototype.state = function() {
  return `
ImageViewer State Information:
frame number: ${this._frameNumber}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isRendered:   ${this._isRendered}
isSizePrepared:  ${this._isSizePrepared}
isDataLoaded:  ${this._isDataLoaded}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isOverlayPrepared: ${this._isOverlayPrepared}
isPreparingOverlay: ${this._isPreparingOverlay}
`;
};


/**
 * Draws custom case objects onto a frame.
 * @member customDraw
 * @param {context} context
 */
ImageRenderer.prototype.customDraw = function(context) {
};
