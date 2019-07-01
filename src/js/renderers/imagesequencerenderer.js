/**
 * @module imagesequencerenderer.js
 * @summary Renders a psuedo video player into the parentElement.
 *
 * @desc ImageSequenceRenderer is a class that controls the creation and
 * viewing of imagesequence.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer,
} from '../renderer.js';

export {
  ImageSequenceRenderer,
};


/**
 * ImageSequenceRenderer Class Definition
 *
 * INHERITS: Renderer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format imagesequence/<format>
 * ex. type: "imagesequence/zip"
 * @param {string} overlay is data that should be overlayed on the psuedo video.
 * Overlay is a path to a file of eta.core.image.ImageSetLabels format.
 */
function ImageSequenceRenderer(media, overlay) {
  Renderer.call(this, media, overlay);
  // Data structures
  this.imageFiles = {};
  // Loading state attributes
  this._isImageInserted = false;
  // Initialization
  this.openContents();
}
ImageSequenceRenderer.prototype = Object.create(Renderer.prototype);
ImageSequenceRenderer.prototype.constructor = ImageSequenceRenderer;


/**
 * Initializes an image sequence player in parent
 *
 * @member initPlayer
 * @required setParentofMedia called beforehand
 */
ImageSequenceRenderer.prototype.initPlayer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivImage = document.createElement('div');
  this.eleDivImage.className = 'p51-contained-image';
  this.parent.appendChild(this.eleDivImage);
  this.initCanvas();
};


/**
 * This loads controls for imagesequence
 *
 * @member initPlayerControls
 * @required player to be set
 */
ImageSequenceRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
ImageSequenceRenderer.prototype.updateFromLoadingState = function() {
  /*
  if (this._isRendered) {
    if ((this._overlayData !== null) && (this._overlayURL !== null)) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
    console.log(this);
  }
  */
};


/**
 * Generate a string that represents the state.
 *
 * @member state
 * @return {dictionary} state
 */
ImageSequenceRenderer.prototype.state = function() {
  return `
ImageSequenceRenderer State Information:
isZipReady: ${this._isZipReady}
isRendered:   ${this._isRendered}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isReadyProcessFrames: ${this._isReadyProcessFrames}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isOverlayPrepared: ${this._isOverlayPrepared}
isPreparingOverlay: ${this._isPreparingOverlay}
`;
};


/**
 * Loads blob data into datastructures
 *
 * @member handleBlob
 * @param {blob} blob
 * @param {path} filename
 */
ImageSequenceRenderer.prototype.handleBlob = function(blob, filename) {
  console.log('WHAT UP!');
};
