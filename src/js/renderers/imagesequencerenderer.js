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
 * @param {int} fps is the frame-rate of the media.
 */
function ImageSequenceRenderer(media, overlay, fps) {
  Renderer.call(this, media, overlay);
  this._frameNumber = 1;
  this._boolShowControls = false;
  this._boolPlaying = false;
  // Data structures
  this.imageFiles = {};
  this._currentImageURL = null;
  // Loading state attributes
  this._isFrameInserted = false;
  // Content Attributes
  this.frameRate = fps;
  this.frameDuration = 1.0 / this.frameRate;
  this._totalNumberOfFrames = 0;
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
  this.eleImage = document.createElement('img');
  this.eleImage.className = 'p51-contained-image';
  this.eleDivImage.appendChild(this.eleImage);
  this.parent.appendChild(this.eleDivImage);

  // Video controls
  this.eleDivVideoControls = document.createElement('div');
  this.eleDivVideoControls.className = 'p51-video-controls controls-auto-size';
  this.elePlayPauseButton = document.createElement('button');
  this.elePlayPauseButton.setAttribute('type', 'button');
  this.elePlayPauseButton.className = 'p51-play-pause';
  this.elePlayPauseButton.innerHTML = 'Play';
  this.eleSeekBar = document.createElement('input');
  this.eleSeekBar.setAttribute('type', 'range');
  this.eleSeekBar.setAttribute('value', '0');
  this.eleSeekBar.className = 'p51-seek-bar';
  this.eleDivVideoControls.appendChild(this.elePlayPauseButton);
  this.eleDivVideoControls.appendChild(this.eleSeekBar);
  this.parent.appendChild(this.eleDivVideoControls);
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
  const self = this;


  this.elePlayPauseButton.addEventListener('click', function() {
    if (self._boolPlaying !== true) {
      self._boolPlaying = true;
      self.timerCallback();
    } else {
      self._boolPlaying = false;
    }
    self.updateFromDynamicState();
  });


  this.parent.addEventListener('mouseenter', function() {
    if (!self._isFrameInserted) {
      return;
    }
    self._boolShowControls = true;
    self.updateFromDynamicState();
  });

  this.parent.addEventListener('mouseleave', function() {
    if (!self._isFrameInserted) {
      return;
    }
    self._boolShowControls = false;
    self.updateFromDynamicState();
  });
};


/**
 * This function is a controller
 * The dynamic state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromDynamicState
 */
ImageSequenceRenderer.prototype.updateFromDynamicState = function() {
  if (!this._isRendered || !this._isZipReady) {
    return;
  }

  if (this._boolPlaying) {
    this.elePlayPauseButton.innerHTML = 'Pause';
    // Update slider value
    const value = (this._frameNumber / this._totalNumberOfFrames) * 100;
    this.eleSeekBar.value = value;
  } else {
    this.elePlayPauseButton.innerHTML = 'Play';
  }

  if (this._boolShowControls) {
    this.eleDivVideoControls.style.opacity = '0.9';
  } else {
    this.eleDivVideoControls.style.opacity = '0.0';
  }
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
ImageSequenceRenderer.prototype.updateFromLoadingState = function() {
  if (this._isRendered && !this._isZipReady) {
    if (this._boolBadZip && this.player._boolNotFound) {
      this.eleImage.setAttribute('src', this.player._notFoundPosterURL);
    } else if (!this._boolBadZip && this.player._boolHasPoster) {
      this.eleImage.setAttribute('src', this.player._loadingPosterURL);
    }
  }

  if (this._isRendered && this._isZipReady) {
    // Able to load first frame
    if (!this._isFrameInserted) {
      this.insertFrame(this._frameNumber);
    }
    const newLength = Object.keys(this.imageFiles).length;
    if (this._totalNumberOfFrames !== newLength) {
      this._totalNumberOfFrames = newLength;
    }
  }

  // Overlay controller
  if (this._isRendered && this._isSizePrepared) {
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
 * This function is a controller.
 * This function updates the player state when the current frame has been
 * changed which happens when the imageseqeunce is played or the user manually
 * srubs.
 *
 * @member updateStateFromTimeChange
 */
ImageSequenceRenderer.prototype.updateStateFromTimeChange = function() {
  if (this._frameNumber === this._totalNumberOfFrames) {
    this._boolPlaying = false;
  }
  this.updateFromDynamicState();
  this.insertFrame(this._frameNumber);
  this.processFrame();
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
frame number: ${this._frameNumber}
isFrameInserted: ${this._isFrameInserted}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isZipReady: ${this._isZipReady}
isRendered:   ${this._isRendered}
isSizePrepared:  ${this._isSizePrepared}
isDataLoaded:  ${this._isDataLoaded}
overlayCanBePrepared: ${this._overlayCanBePrepared}
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
ImageSequenceRenderer.prototype.customDraw = function(context) {
};


/**
 * Loads blob data into datastructures
 *
 * @member handleBlob
 * @param {blob} blob
 * @param {path} filename
 */
ImageSequenceRenderer.prototype.handleBlob = function(blob, filename) {
  const key = parseInt(filename.replace(/[^0-9]/g, ''));
  this.imageFiles[key] = blob;
  if (key === 1) {
    this._isZipReady = true;
    this.updateFromLoadingState();
  }
};


/**
 * This function updates the size of the canvas to match the image
 * Overrides method in renderer.js
 *
 * @member updateSizeAndPadding
 */
ImageSequenceRenderer.prototype.updateSizeAndPadding = function() {
  this.eleCanvas.setAttribute('width', this.eleImage.width);
  this.eleCanvas.setAttribute('height', this.eleImage.height);
  this.canvasWidth = this.eleImage.width;
  this.canvasHeight = this.eleImage.height;
  this._isSizePrepared = true;
};


/**
 * Insert frame into player
 *
 * @member insertFrame
 * @param {int} frameNumber
 */
ImageSequenceRenderer.prototype.insertFrame = function(frameNumber) {
  this.clearState();
  if (this.imageFiles.hasOwnProperty(frameNumber)) {
    const fileBlob = this.imageFiles[frameNumber];
    const tmpURL = URL.createObjectURL(fileBlob);
    this._currentImageURL = tmpURL;
    this.eleImage.setAttribute('src', this._currentImageURL);
    const self = this;
    this.eleImage.addEventListener('load', function() {
      self._isDataLoaded = true;
      if (!self._isSizePrepared) {
        self.updateSizeAndPadding();
      }
      self.updateFromLoadingState();
    });
    this._isFrameInserted = true;
  }
};


/**
 * This function clears state and serves as memory cleanup
 *
 * @member clearState
 */
ImageSequenceRenderer.prototype.clearState = function() {
  URL.revokeObjectURL(this._currentImageURL);
  // Clear canvas
  const context = this.setupCanvasContext();
  context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
};


/**
 * This is called when playing the image sequence. It iterates through the
 * frames while drawing overlays.
 *
 * @member timerCallback
 */
ImageSequenceRenderer.prototype.timerCallback = function() {
  if (!this._boolPlaying) {
    return;
  }
  this._frameNumber++;
  this.updateStateFromTimeChange();
  const self = this;
  setTimeout(function() {
    self.timerCallback();
  }, this.frameDuration * 1000);
};
