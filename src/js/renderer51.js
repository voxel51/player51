/**
 * @module renderer51.js
 * @summary Defines an abstract base class that enforces what child renderers
 * need to implement.
 *
 * @desc Renderer51 is an abstract class that defines the features child
 * renderers should be able to support.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  ColorGenerator,
} from './overlay.js';

// ES6 module export
export {
  Renderer51,
};


/**
 * Renderer51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @abstract
 */
function Renderer51() {
  this.player = undefined;
  this.parent = undefined;
  this.media = undefined;
  // View attributes
  this.width = -1;
  this.height = -1;
  this.paddingLeft = 0;
  this.paddingRight = 0;
  this.paddingTop = 0;
  this.paddingBottom = 0;
  this._boolBorderBox = false; // is the container a border-box?
  this.metadataOverlayBGColor = 'hsla(210, 20%, 10%, 0.8)';
  this.colorGenerator = new ColorGenerator();
  // Rendering options
  this._boolBorderBox = false;

  if (this.constructor === Renderer51) {
    throw new TypeError('Cannot instantiate abstract class.');
  }
}


/**
 * Implementation required
 */


/**
 * Define abstract function initPlayer to be implemented in subclasses
 *
 * @member initPlayer
 * @abstract
 */
Renderer51.prototype.initPlayer = function() {
  throw new Error('Method initPlayer() must be implemented.');
};


/**
 * Define abstract function initPlayerControls to be implemented in subclasses
 *
 * @member initPlayerControls
 * @abstract
 */
Renderer51.prototype.initPlayerControls = function() {
  throw new Error('Method initPlayerControls() must be implemented.');
};


/**
 * Define abstract function determineMediaDimensions to be implemented in
 * subclasses
 *
 * @member determineMediaDimensions
 * @abstract
 */
Renderer51.prototype.determineMediaDimensions = function() {
  throw new Error('Method determineMediaDimensions() must be implemented.');
};


/**
 * Define abstract function resizeControls to be implemented in subclasses
 *
 * @member resizeControls
 * @abstract
 */
Renderer51.prototype.resizeControls = function() {
  throw new Error('Method resizeControls() must be implemented.');
};


/**
* Implementation optional
*/


/**

 * This function checks if player is set
 *
 * @member checkPlayer
 */
Renderer51.prototype.checkPlayer = function() {
  if (typeof this.player === 'undefined') {
    throw new TypeError('Player not set.');
  }
};


/**
 * This function sets the player
 *
 * @member setPlayer
 * @param {player} player
 */
Renderer51.prototype.setPlayer = function(player) {
  this.player = player;
};


/**
 * This function checks if parent and media are set
 *
 * @member checkParentandMedia
 */
Renderer51.prototype.checkParentandMedia = function() {
  if (typeof this.parent === 'undefined') {
    throw new TypeError('Parent not set.');
  }

  if (typeof this.media === 'undefined') {
    throw new TypeError('Media not set.');
  }
};


/**
 * This function sets the parent of the media to be loaded.
 *
 * @member setParentandMedia
 * @param {domElement} parentElement String Id of the parentElement or actual
 * Div object.
 * @param {media} media is the media to be rendered
 */
Renderer51.prototype.setParentandMedia = function(parentElement, media) {
  if (typeof parentElement === 'string') {
    this.parent = document.getElementById(parentElement);
  } else {
    this.parent = parentElement;
  }

  this.media = media;
};


/**
 * This function checks if parent is borderBox
 *
 * @member checkBorderBox
 */
Renderer51.prototype.checkBorderBox = function() {
  const cBS = window.getComputedStyle(this.parent, null).getPropertyValue(
      'box-sizing');
  if (cBS === 'border-box') {
    this._boolBorderBox = true;
  }
};


/**
 * This function loads a canvas in parent
 *
 * @member initCanvas
 * @required setParentandMedia called beforehand
 */
Renderer51.prototype.initCanvas = function() {
  this.checkParentandMedia();
  this.eleDivCanvas = document.createElement('div');
  this.eleDivCanvas.className = 'p51-contained-canvas';
  this.eleCanvas = document.createElement('canvas');
  this.eleCanvas.className = 'p51-contained-canvas';
  this.eleDivCanvas.appendChild(this.eleCanvas);
  this.parent.appendChild(this.eleDivCanvas);
};


/**
 * Set up the canvas context for default styles.
 *
 * @member setupCanvasContext
 * @required the viewer needs to be rendered
 * @return {canvas} context
 */
Renderer51.prototype.setupCanvasContext = function() {
  this.checkPlayer();
  if (!this.player._isRendered) {
    console.log(
        'WARN: trying to set up canvas context but player not rendered'
    );
    return;
  }
  const canvasContext = this.eleCanvas.getContext('2d');
  canvasContext.strokeStyle = '#fff';
  canvasContext.fillStyle = '#fff';
  canvasContext.lineWidth = 3;
  canvasContext.font = '14px sans-serif';
  // easier for setting offsets
  canvasContext.textBaseline = 'bottom';
  return canvasContext;
};


/**
 * This function loads shared UI controls
 *
 * @member initSharedControls
 * @required player to be set
 */
Renderer51.prototype.initSharedControls = function() {
  this.checkPlayer();
  if (typeof this.player._thumbnailClickAction !== 'undefined') {
    this.parent.addEventListener('click', this.player._thumbnailClickAction);
  }
};


/**
 * This function updates the size and padding based on the configuration
 *
 * @member updateSizeAndPadding
 * @required the viewer must be rendered.
 */
Renderer51.prototype.updateSizeAndPadding = function() {
  this.checkPlayer();
  this.checkParentandMedia();
  this.handleWidthAndHeight();
  this.resizeCanvas();
  this.player._isSizePrepared = true;
};


/**
 * This method is a helper function that computes necessary padding and
 * width/height and sets the media element.
 *
 * @member handleWidthAndHeight
 * @required the viewer must be rendered.
 */
Renderer51.prototype.handleWidthAndHeight = function() {
  if (!this.player._isRendered) {
    console.log(
        'WARN: Player51 trying to update size, but it is not rendered.'
    );
    return;
  }

  this.determineMediaDimensions();

  this.paddingLeft = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-left');
  this.paddingRight = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-right');
  this.paddingTop = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-top');
  this.paddingBottom = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-bottom');
  this.paddingLeftN = parseInt(this.paddingLeft.substr(0, this.paddingLeft
      .length - 2));
  this.paddingRightN = parseInt(this.paddingRight.substr(0, this
      .paddingRight.length - 2));
  this.paddingTopN = parseInt(this.paddingTop.substr(0, this.paddingTop
      .length - 2));
  this.paddingBottomN = parseInt(this.paddingBottom.substr(0, this
      .paddingBottom.length - 2));


  // Preservation is based on maintaining the height of the parent.
  // Try to maintain height of container first.  If fails, then set width.
  // Fails means that the width of the video is too wide for the container.
  this.height = this.parent.offsetHeight - this.paddingTopN - this
      .paddingBottomN;
  this.width = this.height * this.mediaWidth / this.mediaHeight;

  if (this.width > this.parent.offsetWidth - this.paddingLeftN - this
      .paddingRightN) {
    this.width = this.parent.offsetWidth - this.paddingLeftN - this
        .paddingRightN;
    this.height = this.width * this.mediaHeight / this.mediaWidth;
  }

  // if the caller wants to maximize to native pixel resolution
  if (this.player._boolForcedMax) {
    this.width = this.mediaWidth;
    this.height = this.mediaHeight;

    if (this.width >= 1440) {
      this.width = 1280;
      this.height = 720;
    }
  }

  // height priority in sizing is a forced size.
  if (this.player._boolForcedSize) {
    this.width = this.player._forcedWidth;
    this.height = this.player._forcedHeight;
  }

  // Set width and height
  this.mediaElement.setAttribute('width', this.width);
  this.mediaElement.setAttribute('height', this.height);
};


/**
 * This method is a helper function that aligns canvas dimensions
 * with image dimensions.
 *
 * @member resizeCanvas
 * @required the viewer must be rendered
 */
Renderer51.prototype.resizeCanvas = function() {
  // NOTE:: Legacy
  // Current functionality is to set a fixed size canvas so that we can
  // guarantee of consistent L&F for the overlays.
  // But, the right way to do this is probably define an abstraction to the
  // canvas size and then make the canvas the closest match to the actual
  // display size so that we do not kill so much member in creating the video
  // player.
  // this.eleCanvas.setAttribute("width", this.width);
  // this.eleCanvas.setAttribute("height", this.height);
  // this.canvasWidth = this.width;
  // this.canvasHeight = this.height;

  const canvasWidth = 1280;
  const canvasHeight = canvasWidth * this.mediaHeight / this.mediaWidth;
  this.eleCanvas.setAttribute('width', canvasWidth);
  this.eleCanvas.setAttribute('height', canvasHeight);
  this.canvasWidth = canvasWidth;
  this.canvasHeight = canvasHeight;
  this.canvasMultiplier = canvasWidth / this.width;

  this.parent.setAttribute('width', this.width);
  this.parent.setAttribute('height', this.height);

  if (this._boolBorderBox) {
    const widthstr =
      `${this.width + this.paddingLeftN + this.paddingRightN}px`;
    const heightstr =
      `${this.height + this.paddingTopN + this.paddingBottomN}px`;

    this.parent.style.width = widthstr;
    this.parent.style.height = heightstr;

    this.mediaDiv.style.width = widthstr;
    this.mediaDiv.style.height = heightstr;
    this.mediaDiv.style.paddingLeft = this.paddingLeft;
    this.mediaDiv.style.paddingRight = this.paddingRight;
    this.mediaDiv.style.paddingTop = this.paddingTop;
    this.mediaDiv.style.paddingBottom = this.paddingBottom;

    this.mediaElement.style.width = widthstr;
    this.mediaElement.style.height = heightstr;
    this.mediaElement.style.paddingLeft = this.paddingLeft;
    this.mediaElement.style.paddingRight = this.paddingRight;
    this.mediaElement.style.paddingTop = this.paddingTop;
    this.mediaElement.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = widthstr;
    this.eleDivCanvas.style.height = heightstr;
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = widthstr;
    this.eleCanvas.style.height = heightstr;
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;
  } else {
    this.parent.style.width = (this.width + 'px');
    this.parent.style.height = (this.height + 'px');

    this.mediaDiv.style.width = (this.width + 'px');
    this.mediaDiv.style.height = (this.height + 'px');
    this.mediaDiv.style.paddingLeft = this.paddingLeft;
    this.mediaDiv.style.paddingRight = this.paddingRight;
    this.mediaDiv.style.paddingTop = this.paddingTop;
    this.mediaDiv.style.paddingBottom = this.paddingBottom;

    this.mediaElement.style.width = (this.width + 'px');
    this.mediaElement.style.height = (this.height + 'px');
    this.mediaElement.style.paddingLeft = this.paddingLeft;
    this.mediaElement.style.paddingRight = this.paddingRight;
    this.mediaElement.style.paddingTop = this.paddingTop;
    this.mediaElement.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = (this.width + 'px');
    this.eleDivCanvas.style.height = (this.height + 'px');
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = (this.width + 'px');
    this.eleCanvas.style.height = (this.height + 'px');
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;
  }

  this.resizeControls();
};
