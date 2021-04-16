/**
 * @module imagerenderer.js
 * @summary Renders an image into the parentElement, handles the overlay and
 * produces the end output.
 *
 * @desc ImageRenderer is a class that controls the creation and viewing of
 * imageviewer.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import { Renderer } from "../renderer.js";

export { ImageRenderer };

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
 * @param {object} options: additional player options
 */
function ImageRenderer(media, overlay, options) {
  Renderer.call(this, media, overlay, options);
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
ImageRenderer.prototype.initPlayer = function () {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivImage = document.createElement("div");
  this.eleDivImage.className = "p51-contained-image";
  this.eleImage = document.createElement("img");
  this.eleImage.className = "p51-contained-image";
  this.eleImage.setAttribute("src", this.media.src);
  this.eleImage.setAttribute("type", this.media.type);
  this.eleImage.setAttribute("loading", "lazy");
  this.eleDivImage.appendChild(this.eleImage);
  this.parent.appendChild(this.eleDivImage);
  this.initPlayerControlHTML(this.parent, false);
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
ImageRenderer.prototype.initPlayerControls = function () {
  this.checkPlayer();
  const self = this;

  // Update size
  this.eleImage.addEventListener("load", function () {
    self.updateSizeAndPadding();
    self.updateFromLoadingState();
    self.setupCanvasContext();
    self._isDataLoaded = true;
    self.updateFromLoadingState();
    self.dispatchEvent("load");
  });

  this.eleImage.addEventListener("error", function () {
    if (self.player._boolNotFound) {
      const tmpImage = document.createElement("img");
      tmpImage.setAttribute("loading", "lazy");
      tmpImage.className = "p51-contained-image";
      tmpImage.setAttribute("src", self.player._notFoundPosterURL);
      self.parent.appendChild(tmpImage);
    }
    self.eleImage.remove();
    self.dispatchEvent("error");
  });

  const hideControls = function () {
    if (self._boolShowVideoOptions) {
      return;
    }
    self._boolShowControls = false;
    self.updateFromDynamicState();
  };

  this.parent.addEventListener("mouseenter", function () {
    self.dispatchEvent("mouseenter");
    self.player._boolHovering = true;
    if (!self._isDataLoaded) {
      return;
    }
    if (!self.player._boolThumbnailMode) {
      self._boolShowControls = true;
      self.setTimeout("hideControls", hideControls, 2.5 * 1000);
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener("mousemove", function (e) {
    if (!self.player._boolThumbnailMode) {
      if (self.checkMouseOnControls(e)) {
        self.clearTimeout("hideControls");
      } else {
        self._boolShowControls = true;
        self.setTimeout("hideControls", hideControls, 2.5 * 1000);
      }
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener("mouseleave", function () {
    self.dispatchEvent("mouseleave");
    self.player._boolHovering = false;
    self._boolDisableShowControls = false;
    if (!self._isDataLoaded) {
      return;
    }
    if (!self.player._boolThumbnailMode) {
      hideControls();
      self.clearTimeout("hideControls");
    }
    self.updateFromDynamicState();
  });
};

/**
 * This determines the dimensions of the media
 *
 * @member determineMediaDimensions
 * @required initPlayer() to be called
 */
ImageRenderer.prototype.determineMediaDimensions = function () {
  this.mediaHeight = this.mediaElement.height;
  this.mediaWidth = this.mediaElement.width;
};

/**
 * Return the original size of the underlying image
 *
 * @return {object|null} with keys `width` and `height`, or null if the content
 *   size cannot be determined
 */
ImageRenderer.prototype.getContentDimensions = function () {
  if (!this.mediaElement) {
    return null;
  }
  return {
    width: this.mediaElement.naturalWidth,
    height: this.mediaElement.naturalHeight,
  };
};

/**
 * This function is a controller
 * The dynamic state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromDynamicState
 */
ImageRenderer.prototype.updateFromDynamicState = function () {
  if (!this._isRendered || !this._isSizePrepared) {
    return;
  }

  this.updateControlsDisplayState();
};

/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
ImageRenderer.prototype.updateFromLoadingState = function () {
  if (this._isRendered && this._isSizePrepared) {
    if (this._isDataLoaded) {
      this._isReadyProcessFrames = true;
    }
    // If we had to download the overlay data and it is ready
    if (this._overlayData !== null && this._overlayURL !== null) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay();
  }

  if (this._isOverlayPrepared) {
    this.processFrame();
  }
};

/**
 * Generate a string that represents the state.
 *
 * @member state
 * @return {dictionary} state
 */
ImageRenderer.prototype.state = function () {
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
ImageRenderer.prototype.customDraw = function (context) {};

ImageRenderer.prototype.hasFrameNumbers = function () {
  return false;
};
