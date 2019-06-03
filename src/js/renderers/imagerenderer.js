/**
 * @module imagerenderer.js
 * @summary Renders an image into the parentElement, handles the overlay and
 * produces the end output.
 *
 * @desc ImageRenderer is a class that controls the creation and viewing of
 * imageviewer51.
 *
 * Copyright 2019-2020, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer51,
} from '../renderer51.js';

// ES6 module export
export {
  ImageRenderer,
};


/**
 * ImageRenderer Class Definition
 *
 * INHERITS: Renderer51
 * F-MIXINS: None
 @constructor
 */
function ImageRenderer() {
  Renderer51.call(this);
}
ImageRenderer.prototype = Object.create(Renderer51.prototype);
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
 * This loads controls for imageviewer51
 *
 * @member initPlayerControls
 * @required player to be set
 */
ImageRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();
  const self = this;

  // Update size
  this.eleImage.addEventListener('load', function() {
    self.player._isImageLoaded = true;
    self.updateSizeAndPadding();
    self.player.annotate(self.player._overlayURL);
  });

  this.parent.addEventListener('mouseenter', function() {
    if (self.player._boolThumbnailMode) {
      self.player._boolThumbnailMode = false;
      if (self.player._overlayURL) {
        // Handle null overlays
        self.player.annotate(self.player._overlayURL);
      }
      self.player._boolThumbnailMode = true;
    }
  });

  this.parent.addEventListener('mouseleave', function() {
    if (self.player._boolThumbnailMode) {
      self.setupCanvasContext().clearRect(0, 0, self
          .canvasWidth, self.canvasHeight);
    }
  });
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
