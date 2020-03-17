/**
 * @module imagesequencerenderer.js
 * @summary Renders a psuedo video player into the parentElement.
 *
 * @desc ImageSequenceRenderer is a class that controls the creation and
 * viewing of imagesequence.
 *
 * Copyright 2017-2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
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
  this._boolPlayingBeforeSeek = false;
  this._boolManualSeek = true;
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
  this.initPlayerControlHTML(this.parent);
  this.mediaElement = this.eleImage;
  this.mediaDiv = this.eleDivImage;
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
    self._boolPlaying = !self._boolPlaying;
    self.updateFromDynamicState();
    if (self._boolPlaying) {
      self.timerCallback();
    }
  });

  this.eleSeekBar.addEventListener('mousedown', function() {
    self._boolPlayingBeforeSeek = self._boolPlaying;
    self._boolPlaying = false;
  });

  this.eleSeekBar.addEventListener('mouseup', function() {
    self._boolPlaying = self._boolPlayingBeforeSeek;
    self._boolPlayingBeforeSeek = false;
  });

  this.eleSeekBar.addEventListener('change', function() {
    // Calculate new frame
    self._frameNumber = Math.round((self.eleSeekBar.valueAsNumber / 100) *
      self._totalNumberOfFrames);
    if (!self._boolPlaying) {
      self.updateStateFromTimeChange();
    }
    self.timerCallback();
  });

  /**
   * helper to toggle control visibility
   * @param {bool} showControls new visibility of controls
   */
  function handleShowControls(showControls) {
    if (!self._isFrameInserted) {
      return;
    }
    self._boolShowControls = showControls;
    self.updateFromDynamicState();
  }

  this.parent.addEventListener('mouseenter', function() {
    handleShowControls(true);
    self.setTimeout('hideControls', () => handleShowControls(false),
        2.5 * 1000);
  });

  this.parent.addEventListener('mousemove', function(e) {
    handleShowControls(true);
    if (!self.eleDivVideoControls.contains(e.target)) {
      self.setTimeout('hideControls', () => handleShowControls(false),
          2.5 * 1000);
    } else {
      self.clearTimeout('hideControls');
    }
  });

  this.parent.addEventListener('mouseleave', function() {
    handleShowControls(false);
    self.clearTimeout('hideControls');
  });

  this.eleImage.addEventListener('load', function() {
    self._isDataLoaded = true;
    if (!self._isSizePrepared && self._isFrameInserted) {
      self.updateSizeAndPaddingByParent();
    }
    self.updateFromLoadingState();
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
  if (!this._isRendered || !this._boolZipReady) {
    return;
  }

  if (this._boolPlaying) {
    // Update slider value
    const value = (this._frameNumber / this._totalNumberOfFrames) * 100;
    this.eleSeekBar.value = value;
  } else {
    if (this._frameNumber === this._totalNumberOfFrames) {
      // Reset
      this._frameNumber = 1;
    }
  }
  this.updatePlayButton(this._boolPlaying);
  this.updateControlsDisplayState();
};


/**
 * This determines the dimensions of the media
 *
 * @member determineMediaDimensions
 * @required initPlayer() to be called
 */
ImageSequenceRenderer.prototype.determineMediaDimensions = function() {
  this.mediaHeight = this.mediaElement.height;
  this.mediaWidth = this.mediaElement.width;
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
ImageSequenceRenderer.prototype.updateFromLoadingState = function() {
  if (this._isRendered && !this._boolZipReady) {
    if (this._boolBadZip && this.player._boolNotFound) {
      this.eleImage.setAttribute('src', this.player._notFoundPosterURL);
    } else if (!this._boolBadZip && this.player._boolHasPoster) {
      this.eleImage.setAttribute('src', this.player._loadingPosterURL);
    }
  }

  if (this._isRendered && this._boolZipReady) {
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

  if (this._overlayCanBePrepared && this._isFrameInserted) {
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
 * Resizes controls
 *
 * @member resizeControls
 * @required initPlayer() to be called
 */
ImageSequenceRenderer.prototype.resizeControls = function() {
  if (this.width>1400) {
    this.eleDivVideoControls.className = 'p51-video-controls vbig';
  } else if (this.width>1200) {
    this.eleDivVideoControls.className = 'p51-video-controls big';
  } else if (this.width>800) {
    this.eleDivVideoControls.className = 'p51-video-controls med';
  } else if (this.width>600) {
    this.eleDivVideoControls.className = 'p51-video-controls small';
  } else {
    this.eleDivVideoControls.className = 'p51-video-controls vsmall';
  }
  Renderer.prototype.resizeControls.call(this);
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
boolZipReady: ${this._boolZipReady}
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
    this._boolZipReady = true;
    this.updateFromLoadingState();
  }
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
    this._isFrameInserted = true;
    this.eleImage.setAttribute('src', this._currentImageURL);
  }
};


/**
 * This function clears state and serves as memory cleanup
 *
 * @member clearState
 */
ImageSequenceRenderer.prototype.clearState = function() {
  URL.revokeObjectURL(this._currentImageURL);
  this.clearCanvas();
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
  requestAnimationFrame(this.timerCallback.bind(this));
};
