/**
 * @module renderer.js
 * @summary Defines an abstract base class that enforces what child renderers
 * need to implement.
 *
 * @desc Renderer is an abstract class that defines the features child
 * renderers should be able to support.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  ColorGenerator,
  FrameAttributesOverlay,
  ObjectOverlay,
} from './overlay.js';

// ES6 module export
export {
  Renderer,
};


/**
 * Renderer Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @abstract
 * @param {object} media
 * @param {string} overlay is the URL to overlay JSON
 */
function Renderer(media, overlay) {
  if (this.constructor === Renderer) {
    throw new TypeError('Cannot instantiate abstract class.');
  }
  // Data structures
  this.player = undefined;
  this.parent = undefined;
  this.media = media;
  this.frameOverlay = {};
  // Player state attributes
  this._isRendered = false;
  this._isSizePrepared = false;
  // View attributes
  this.width = -1;
  this.height = -1;
  this.paddingLeft = 0;
  this.paddingRight = 0;
  this.paddingTop = 0;
  this.paddingBottom = 0;
  this.metadataOverlayBGColor = 'hsla(210, 20%, 10%, 0.8)';
  this.colorGenerator = new ColorGenerator();
  // Rendering options
  this._boolBorderBox = false;
  // Loading state attributes
  this._frameNumber = undefined;
  this._isReadyProcessFrames = false;
  this._isDataLoaded = false;
  this._overlayCanBePrepared = true;
  this._isOverlayPrepared = false;
  this._isPreparingOverlay = false;
  this._overlayData = null;
  this._overlayURL = null;
  this.handleOverlay(overlay);
}


/**
 * Define abstract function initPlayer to be implemented in subclasses
 *
 * @member initPlayer
 * @abstract
 */
Renderer.prototype.initPlayer = function() {
  throw new Error('Method initPlayer() must be implemented.');
};


/**
 * Define abstract function initPlayerControls to be implemented in subclasses
 *
 * @member initPlayerControls
 * @abstract
 */
Renderer.prototype.initPlayerControls = function() {
  throw new Error('Method initPlayerControls() must be implemented.');
};


/**
 * Define abstract function determineMediaDimensions to be implemented in
 * subclasses
 *
 * @member determineMediaDimensions
 * @abstract
 */
Renderer.prototype.determineMediaDimensions = function() {
  throw new Error('Method determineMediaDimensions() must be implemented.');
};


/**
 * Define abstract function resizeControls to be implemented in subclasses
 *
 * @member resizeControls
 * @abstract
 */
Renderer.prototype.resizeControls = function() {
  throw new Error('Method resizeControls() must be implemented.');
};


/**
 * Define abstract function updateFromDynamicState to be implemented in
 * subclasses
 *
 * @member updateFromDynamicState
 * @abstract
 */
Renderer.prototype.updateFromDynamicState = function() {
  throw new Error('Method updateFromDynamicState() must be implemented.');
};


/**
 * Define abstract function updateFromLoadingState to be implemented in
 * subclasses
 *
 * @member updateFromLoadingState
 * @abstract
 */
Renderer.prototype.updateFromLoadingState = function() {
  throw new Error('Method updateFromLoadingState() must be implemented.');
};


/**
 * Define abstract function updateStateFromTimeChange to be implemented in
 * subclasses
 *
 * @member updateStateFromTimeChange
 * @abstract
 */
Renderer.prototype.updateStateFromTimeChange = function() {
  throw new Error('Method updateStateFromTimeChange() must be implemented.');
};


/**
 * Define abstract function state to be implemented in subclasses
 *
 * @member state
 * @abstract
 */
Renderer.prototype.state = function() {
  throw new Error('Method state() must be implemented.');
};


/**
 * Define abstract function customDraw to be implemented in subclasses
 *
 * @member customDraw
 * @abstract
 */
Renderer.prototype.customDraw = function() {
  throw new Error('Method customDraw() must be implemented.');
};


/**
 * This function processes the overlayData
 *
 * @member handleOverlay
 * @param {string} overlay of overlay JSON
 */
Renderer.prototype.handleOverlay = function(overlay) {
  if ((overlay === null) || (typeof(overlay) === 'undefined')) {
    this._overlayURL = null;
    this._overlayCanBePrepared = false;
  } else if (typeof(overlay) === 'string') {
    this._overlayURL = overlay;
    this._overlayCanBePrepared = false;
    this.loadOverlay(overlay);
  } else if ((typeof(overlay) === 'object') && (overlay != null) && Object
      .keys(overlay).length >
    0) {
    this._overlayURL = null;
    this._overlayData = overlay;
  }
};


/**
 * This function loads in the JSON file asynchronously.
 *
 * @member loadOverlay
 * @param {string} overlayPath
 */
Renderer.prototype.loadOverlay = function(overlayPath) {
  const self = this;
  this._isOverlayPrepared = false;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      self._overlayData = JSON.parse(this.responseText);
      self.updateFromLoadingState();
    }
  };
  xmlhttp.open('GET', overlayPath, true);
  xmlhttp.send();
};


/**
 * This function processes the overlay code and creates frame objects to be
 * drawn onto the screen.
 * Supports 2 formats, object and frame based.
 *
 * @member prepareOverlay
 * @param {json} rawjson
 */
Renderer.prototype.prepareOverlay = function(rawjson) {
  if ((this._isOverlayPrepared) || (this._isPreparingOverlay)) {
    return;
  }
  this._isPreparingOverlay = true;

  // Format 1
  if (typeof (rawjson.objects) !== 'undefined') {
    const context = this.setupCanvasContext();
    this._prepareOverlay_auxFormat1Objects(context, rawjson.objects);
  }

  // Format 2
  if (typeof(rawjson.frames) !== 'undefined') {
    const context = this.setupCanvasContext();
    const frameKeys = Object.keys(rawjson.frames);
    for (const frameKeyI in frameKeys) {
      if (frameKeyI) {
        const frameKey = frameKeys[frameKeyI];
        const f = rawjson.frames[frameKey];
        if (typeof(f.objects) !== 'undefined') {
          this._prepareOverlay_auxFormat1Objects(context, f.objects
              .objects);
        }
        if (typeof(f.attrs) !== 'undefined') {
          const o = new FrameAttributesOverlay(f.attrs, this);
          o.setup(
              context, this.canvasWidth, this.canvasHeight);
          this._prepareOverlay_auxCheckAdd(o, parseInt(frameKey));
        }
      }
    }
  }

  // Attributes for images
  if (typeof(rawjson.attrs) !== 'undefined') {
    const context = this.setupCanvasContext();
    const o = new FrameAttributesOverlay(rawjson.attrs, this);
    o.setup(context, this.canvasWidth, this.canvasHeight);
    this.frameOverlay[this._frameNumber].push(o);
  }

  this._isOverlayPrepared = true;
  this._isPreparingOverlay = false;
  this.updateFromLoadingState();
};


/**
 * Helper function to parse one of the objects in the Format 1 of the overlay
 * and add it the overlay representation.
 *
 * @param {context} context
 * @param {array} objects is an Array of Objects with each entry an
 * object in Format 1 above.
 * @param {bool} frameFlag forces frameNumber to be frameNumber property
 */
Renderer.prototype._prepareOverlay_auxFormat1Objects = function(context,
    objects, frameFlag = false) {
  if (typeof(objects) === 'undefined') {
    return;
  }
  if (typeof(objects.length) === 'undefined') {
    objects = objects.objects;
  }
  for (let len = objects.length, i = 0; i < len; i++) {
    const o = new ObjectOverlay(objects[i], this);
    if (typeof(this.canvasWidth) === 'undefined') {
      const checkCanvasWidth = setInterval(() => {
        if (this.canvasWidth) {
          clearInterval(checkCanvasWidth);
          o.setup(context, this.canvasWidth, this
              .canvasHeight);
          if (frameFlag) {
            this._prepareOverlay_auxCheckAdd(o, this._frameNumber);
          } else {
            this._prepareOverlay_auxCheckAdd(o);
          }
        }
      }, 1000);
    } else {
      o.setup(context, this.canvasWidth, this.canvasHeight);
      if (frameFlag) {
        this._prepareOverlay_auxCheckAdd(o, this._frameNumber);
      } else {
        this._prepareOverlay_auxCheckAdd(o);
      }
    }
  }
};


/**
 * Add the overlay to the set.
 *
 * @arguments
 * @param {overlay} o the Overlay instance
 * @param {int} fn optional is the frame numnber
 * (if not provided, then the overlay o needs a frameNumber propery.
 */
Renderer.prototype._prepareOverlay_auxCheckAdd = function(o, fn = -1) {
  if (fn == -1) {
    fn = o.frame_number;
  }
  if (typeof(fn) === 'undefined') {
    fn = this._frameNumber;
  }
  if (fn in this.frameOverlay) {
    const thelist = this.frameOverlay[fn];
    thelist.push(o);
    this.frameOverlay[fn] = thelist;
  } else {
    // this the first time we are seeing the frame
    const newlist = [o];
    this.frameOverlay[fn] = newlist;
  }
};


/**
 * Handles the rendering of a specific frame, noting that rendering has two
 * different meanings in Player51.  The Player51.render function is used to
 * actually create the Player51 and inject it into the DOM.  This
 * Player51.processFrame function is responsible for drawing when a new video
 * frame has been drawn by the underlying player.
 *
 * @todo need to use double-buffering instead of rendering direct to the
 * canvas to avoid flickering.
 * @member processFrame
 */
Renderer.prototype.processFrame = function() {
  if (!this._isReadyProcessFrames) {
    return;
  }

  const context = this.setupCanvasContext();
  this.customDraw(context);
  if (this._isOverlayPrepared) {
    if (this._frameNumber in this.frameOverlay) {
      const fm = this.frameOverlay[this._frameNumber];
      for (let len = fm.length, i = 0; i < len; i++) {
        fm[i].draw(
            context, this.canvasWidth, this.canvasHeight);
      }
    }
  }
  return;
};


/**
 * Used by overlay rendering code.
 *
 * @member checkFontHeight
 * @param {int} h is font height
 * @return {int} h is the current height
 */
Renderer.prototype.checkFontHeight = function(h) {
  if (h == 0) {
    /* eslint-disable-next-line no-console */
    console.log('PLAYER51 WARN: fontheight 0');
    return 10;
  }
  return h;
};


/**
 * Return media extension
 *
 * @member getExtension
 * @return {string} extension
 */
Renderer.prototype.getExtension = function() {
  const tmp = this.media.type.split('/');
  return tmp.slice(-1)[0];
};

/**
 * Return media extension of a file path
 *
 * @memeber getFileExtension
 * @param {path} path
 * @return {string} extension
 */
Renderer.prototype.getFileExtension = function(path) {
  const tmp = path.split('.');
  return tmp.slice(-1)[0];
};


/**
 * This function checks if player is set
 *
 * @member checkPlayer
 */
Renderer.prototype.checkPlayer = function() {
  if (typeof(this.player) === 'undefined') {
    throw new TypeError('Player not set.');
  }
};


/**
 * This function sets the player
 *
 * @member setPlayer
 * @param {player} player
 */
Renderer.prototype.setPlayer = function(player) {
  this.player = player;
};


/**
 * This function checks if parent and media are set
 *
 * @member checkParentandMedia
 */
Renderer.prototype.checkParentandMedia = function() {
  if (typeof(this.parent) === 'undefined') {
    throw new TypeError('Parent not set.');
  }

  if (typeof(this.media) === 'undefined') {
    throw new TypeError('Media not set.');
  }
};


/**
 * This function sets the parent of the media to be loaded.
 *
 * @member setParentofMedia
 * @param {domElement} parentElement String Id of the parentElement or actual
 * Div object.
 */
Renderer.prototype.setParentofMedia = function(parentElement) {
  if (typeof(parentElement) === 'string') {
    this.parent = document.getElementById(parentElement);
  } else {
    this.parent = parentElement;
  }
};


/**
 * This function checks if parent is borderBox
 *
 * @member checkBorderBox
 */
Renderer.prototype.checkBorderBox = function() {
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
Renderer.prototype.initCanvas = function() {
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
Renderer.prototype.setupCanvasContext = function() {
  this.checkPlayer();
  if (!this._isRendered) {
    /* eslint-disable-next-line no-console */
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
Renderer.prototype.initSharedControls = function() {
  this.checkPlayer();
  if (typeof(this.player._thumbnailClickAction) !== 'undefined') {
    this.parent.addEventListener('click', this.player._thumbnailClickAction);
  }
};


/**
 * This function updates the size and padding based on the configuration
 *
 * @member updateSizeAndPadding
 * @required the viewer must be rendered.
 */
Renderer.prototype.updateSizeAndPadding = function() {
  this.checkPlayer();
  this.checkParentandMedia();
  this.handleWidthAndHeight();
  this.resizeCanvas();
  this._isSizePrepared = true;
};


/**
 * This method is a helper function that computes necessary padding and
 * width/height and sets the media element.
 *
 * @member handleWidthAndHeight
 * @required the viewer must be rendered.
 */
Renderer.prototype.handleWidthAndHeight = function() {
  if (!this._isRendered) {
    /* eslint-disable-next-line no-console */
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
Renderer.prototype.resizeCanvas = function() {
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
