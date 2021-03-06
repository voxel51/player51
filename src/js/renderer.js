/**
 * @module renderer.js
 * @summary Defines an abstract base class that enforces what child renderers
 * need to implement.
 *
 * @desc Renderer is an abstract class that defines the features child
 * renderers should be able to support.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */

import {
  ColorGenerator,
  FrameAttributesOverlay,
  FrameMaskOverlay,
  ObjectOverlay,
} from './overlay.js';
import {
  ICONS,
  rescale,
  recursiveMap,
} from './util.js';
import {
  ZipLibrary,
} from './zipreader/zip.js';

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
  this.frameZeroOffset = 1;
  this.reader = new ZipLibrary();
  this.reader.workerScriptsPath = '../src/js/zipreader/';
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
  this._actionOptions = {
    click: {name: 'Click', type: 'click', labelText: 'clicked'},
    hover: {name: 'Hover', type: 'mousemove', labelText: 'hovered'},
  };
  this.overlayOptions = {
    showFrameCount: false,
    labelsOnlyOnClick: false,
    attrsOnlyOnClick: false,
    showAttrs: true,
    attrRenderMode: 'value',
    attrRenderBox: true,
    action: this._actionOptions.click,
  };
  this._attrRenderModeOptions = [{
    name: 'Value',
    value: 'value',
  }, {
    name: 'Attribute: Value',
    value: 'attr-value',
  }];
  this._boolShowVideoOptions = false;
  this._focusIndex = -1;
  this.seekBarMax = 100;
  // Loading state attributes
  this._frameNumber = undefined;
  this._isReadyProcessFrames = false;
  this._isDataLoaded = false;
  this._hasOverlay = Boolean(overlay);
  this._overlayCanBePrepared = true;
  this._isOverlayPrepared = false;
  this._isPreparingOverlay = false;
  this._overlayData = null;
  this._overlayURL = null;
  this._boolBadZip = false;
  this._boolZipReady = false;
  this._timeouts = {};
  this._focusPos = {x: -1, y: -1};
  this.handleOverlay(overlay);
  this._mouseEventHandler = this._handleMouseEvent.bind(this);
}


/*
 * Destroy the renderer
 * @member destroy
 */
Renderer.prototype.destroy = function() {
  for (const child of this.parent.children) {
    this.parent.removeChild(child);
  }
};


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
 * Define base function resizeControls to be implemented in subclasses
 *
 * @member resizeControls
 */
Renderer.prototype.resizeControls = function() {
  if (!this.eleDivVideoControls) {
    return;
  }
  if (this._boolBorderBox) {
    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + 'px');
    this.eleDivVideoControls.style.height = (
      Math.min(60 + this.paddingBottomN, 0.1 * this.height +
        this.paddingBottomN) + 'px'
    );

    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = (this.paddingBottomN -
      2) + 'px';
    this.eleDivVideoControls.style.left = this.paddingLeft;
  } else {
    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + 'px');
    this.eleDivVideoControls.style.height = (
      Math.max(60, 0.075 * this.height) + 'px'
    );
    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = this.paddingBottom;
    this.eleDivVideoControls.style.left = this.paddingLeft;
  }
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
 * Define abstract function handleBlob to be implemented in subclasses
 * that load zip files
 *
 * @member handleBlob
 * @abstract
 */
Renderer.prototype.handleBlob = function() {
  throw new Error('Method handleBlob() must be implemented.');
};


/**
 * This function processes the overlayData
 *
 * @member handleOverlay
 * @param {string} overlay of overlay JSON
 */
Renderer.prototype.handleOverlay = function(overlay) {
  if (!overlay) {
    this._overlayURL = null;
    this._overlayCanBePrepared = false;
    this._isOverlayPrepared = true;
  } else if (typeof(overlay) === 'string') {
    this._overlayURL = overlay;
    this._overlayCanBePrepared = false;
    this.loadOverlay(overlay);
  } else if ((typeof(overlay) === 'object') &&
      Object.keys(overlay).length > 0) {
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
  if ((this._isOverlayPrepared) || (this._isPreparingOverlay) || !rawjson) {
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
        if (f && f.mask) {
          this._prepareOverlay_auxMask(context, f.mask, frameKey);
        }
        if (f && f.objects && f.objects.objects) {
          this._prepareOverlay_auxFormat1Objects(context, f.objects.objects);
        }
        if (f && f.attrs) {
          this._prepareOverlay_auxAttributes(context, f.attrs, frameKey);
        }
      }
    }
  }

  if (typeof(rawjson.mask_index) !== 'undefined') {
    this.frameMaskIndex = rawjson.mask_index.index;
  }

  // Attributes and masks for images
  if (typeof(rawjson.mask) !== 'undefined') {
    const context = this.setupCanvasContext();
    this._prepareOverlay_auxMask(context, rawjson.mask);
  }
  if (typeof(rawjson.attrs) !== 'undefined') {
    const context = this.setupCanvasContext();
    this._prepareOverlay_auxAttributes(context, rawjson.attrs);
  }

  this._reBindMouseHandler();

  this._isOverlayPrepared = true;
  this._isPreparingOverlay = false;
  this.updateFromLoadingState();
  this.updateFromDynamicState();
};


Renderer.prototype._reBindMouseHandler = function() {
  for (const action of Object.values(this._actionOptions)) {
    this.eleCanvas.removeEventListener(
        action.type, this._mouseEventHandler);
  }
  this.eleCanvas.addEventListener(
      this.overlayOptions.action.type, this._mouseEventHandler);
};

/**
 * Helper function to parse attributes of an overlay and add it to the overlay
 * representation.
 *
 * @param {context} context
 * @param {array} attributes is an Array of attributes
 * @param {key} frameKey the frame number of the attributes (defaults to current
 *   frame)
 */
Renderer.prototype._prepareOverlay_auxAttributes = function(context,
    attributes, frameKey = null) {
  const o = new FrameAttributesOverlay(attributes, this);
  o.setup(context, this.canvasWidth, this.canvasHeight);
  if (frameKey) {
    this._prepareOverlay_auxCheckAdd(o, parseInt(frameKey));
  } else {
    // @todo remove this when video attrs are supported
    // In the meantime, this allows video labels with video attrs to load
    if (typeof this._frameNumber !== 'undefined') {
      this._prepareOverlay_auxCheckAdd(o, this._frameNumber);
    }
  }
};

/**
 * Helper function to parse attributes of an overlay and add it to the overlay
 * representation.
 *
 * @param {context} context
 * @param {string} mask a base64-encoded mask
 * @param {key} frameKey the frame number of the mask (defaults to current
 *   frame)
 */
Renderer.prototype._prepareOverlay_auxMask = function(context,
    mask, frameKey = null) {
  const o = new FrameMaskOverlay(mask, this);
  o.setup(context, this.canvasWidth, this.canvasHeight);
  if (frameKey) {
    this._prepareOverlay_auxCheckAdd(o, parseInt(frameKey));
  } else {
    this._prepareOverlay_auxCheckAdd(o, this._frameNumber);
  }
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
    o.setup(context, this.canvasWidth, this.canvasHeight);
    if (frameFlag) {
      this._prepareOverlay_auxCheckAdd(o, this._frameNumber);
    } else {
      this._prepareOverlay_auxCheckAdd(o);
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
  this.clearCanvas();
  const context = this.setupCanvasContext();
  this.customDraw(context);
  if (this._isOverlayPrepared) {
    if (this._frameNumber in this.frameOverlay) {
      // Hover Focus setting
      if (this.overlayOptions.action === this._actionOptions.hover) {
        this.setFocus(this._findOverlayAt(this._focusPos));
      }
      const fm = this.frameOverlay[this._frameNumber];
      const len = fm.length;
      // draw items without focus first, if settings allow
      if (this._renderRest()) {
        for (let i = 0; i < len; i++) {
          if (!this.isFocus(fm[i])) {
            fm[i].draw(context, this.canvasWidth, this.canvasHeight);
          }
        }
      }
      for (let i = 0; i < len; i++) {
        if (this.isFocus(fm[i])) {
          fm[i].draw(context, this.canvasWidth, this.canvasHeight);
        }
      }
    }
  }
};

Renderer.prototype.clearCanvas = function() {
  this.eleCanvas.getContext('2d').clearRect(
      0, 0, this.canvasWidth, this.canvasHeight);
};

Renderer.prototype._renderRest = function() {
  if (this.overlayOptions.labelsOnlyOnClick) {
    return !this._focusedObject;
  }
  return true;
};


Renderer.prototype._findOverlayAt = function({x, y}) {
  const objects = this.frameOverlay[this._frameNumber];
  if (!objects) {
    return;
  }
  for (let i = objects.length - 1; i >= 0; i--) {
    const object = objects[i];
    if (object.containsPoint(x, y)) {
      return object;
    }
  }
};


Renderer.prototype.isFocus = function(overlayObj) {
  return this._focusedObject === overlayObj ||
    overlayObj.index === this._focusIndex;
};

Renderer.prototype.setFocus = function(overlayObj, position=undefined) {
  if (position) {
    this._focusPos = position;
  }
  if (this._focusedObject !== overlayObj) {
    this._focusedObject = overlayObj;
    if (overlayObj === undefined) {
      this._focusedObject = undefined;
      this._focusIndex = -1;
    } else {
      this._focusIndex = overlayObj.index !== undefined ? overlayObj.index : -1;
    }
    return true;
  }
  return false;
};


Renderer.prototype._handleMouseEvent = function(e) {
  const rect = e.target.getBoundingClientRect();
  // calculate relative to top left of canvas
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  // rescale to canvas width/height
  x = Math.round(rescale(x, 0, rect.width, 0, this.eleCanvas.width));
  y = Math.round(rescale(y, 0, rect.height, 0, this.eleCanvas.height));

  const overlayObj = this._findOverlayAt({x, y});
  if (e.type.toLowerCase() === 'click' &&
      overlayObj &&
      overlayObj.constructor === ObjectOverlay &&
      overlayObj.index === undefined) {
    // disallow clicking on objects without IDs
    return;
  }

  if (this.setFocus(overlayObj, {x, y})) {
    this.processFrame();
  }
};


/**
 * Handle a keyboard event
 * @param {Event} e
 * @return {boolean} true if the event was handled and should not be propagated
 */
Renderer.prototype._handleKeyboardEvent = function(e) {
  // esc: hide settings
  if (e.keyCode === 27 && this._boolShowVideoOptions) {
    this._boolShowVideoOptions = false;
    this._repositionOptionsPanel();
    this.updateFromDynamicState();
    return true;
  }
  // s: toggle settings
  if (e.key === 's') {
    this._boolShowVideoOptions = !this._boolShowVideoOptions;
    this._repositionOptionsPanel();
    this.updateFromDynamicState();
    return true;
  }
};


/**
 * Called when the player loses focus
 */
Renderer.prototype._handleFocusLost = function() {
  this._boolShowVideoOptions = false;
  this._boolShowControls = false;
  this.updateFromDynamicState();
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
 * Check image extension
 *
 * @member checkImageExtension
 * @param {string} extension
 * @return {bool}
 */
Renderer.prototype.checkImageExtension = function(extension) {
  const validImageTypes = ['png', 'jpg', 'gif', 'jpeg', 'bmp'];
  return validImageTypes.includes(extension.toLowerCase());
};


/**
 * Checks for MACOSX from mac created zips.
 *
 * @member checkMACOSX
 * @param {path} filename
 * @return {bool}
 */
Renderer.prototype.checkMACOSX = function(filename) {
  const elements = filename.split('/');
  return elements.includes('__MACOSX');
};


/**
 * Opens up media and stores filenames in imageFiles by
 * index (psuedo frameNumber)
 *
 * @member openContents
 * @required media.src needs to be a zip file
 */
Renderer.prototype.openContents = function() {
  const zipPath = this.media.src;
  const self = this;
  this._boolZipReady = false;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      const zipBlob = this.response;
      self.readBlob(zipBlob);
    } else if (this.status === 404) {
      self._boolBadZip = true;
      self.updateFromLoadingState();
    }
  };
  xmlhttp.responseType = 'blob';
  xmlhttp.open('GET', zipPath, true);
  xmlhttp.send();
};


/**
 * Reads the zip blob into files
 *
 * @member readBlob
 * @param {blob} blob
 */
Renderer.prototype.readBlob = function(blob) {
  const self = this;
  this.reader.createReader(new this.reader.BlobReader(blob), function(reader) {
    reader.getEntries(function(entries) {
      entries.forEach(function(item) {
        const filename = item.filename;
        const extension = self.getFileExtension(filename);
        if (self.checkImageExtension(extension) &&
        !self.checkMACOSX(filename)) {
          item.getData(new self.reader.BlobWriter(), function(content) {
            self.handleBlob(content, filename);
          });
        }
      });
    }, function(error) {
      /* eslint-disable-next-line no-console */
      console.log(error);
    });
  }, function(error) {
    /* eslint-disable-next-line no-console */
    console.log(error);
  });
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
        'WARN: trying to set up canvas context but player not rendered');
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
  if (this.eleOptionsButton) {
    this.initPlayerOptionsControls();
  }
};


Renderer.prototype.initPlayerControlHTML = function(parent, sequence=true) {
  this.eleDivVideoControls = document.createElement('div');
  this.eleDivVideoControls.className = 'p51-video-controls';
  if (sequence) {
    this.initPlayerControlsPlayButtonHTML(this.eleDivVideoControls);
    this.initPlayerControlsSeekBarHTML(this.eleDivVideoControls);
  }
  this.initPlayerControlOptionsButtonHTML(this.eleDivVideoControls);
  this.initTimeStampHTML(this.eleDivVideoControls);
  parent.appendChild(this.eleDivVideoControls);
  this.initPlayerOptionsPanelHTML(parent);
};

Renderer.prototype.initPlayerControlsPlayButtonHTML = function(parent) {
  this.elePlayPauseButton = document.createElement('img');
  this.elePlayPauseButton.className = 'p51-clickable';
  this.elePlayPauseButton.style.gridArea = '2 / 2 / 2 / 2';
  this.updatePlayButton(false);
  parent.appendChild(this.elePlayPauseButton);
};

Renderer.prototype.initPlayerControlsSeekBarHTML = function(parent) {
  this.eleSeekBar = document.createElement('input');
  this.eleSeekBar.setAttribute('type', 'range');
  this.eleSeekBar.setAttribute('value', '0');
  this.eleSeekBar.setAttribute('min', '0');
  this.eleSeekBar.setAttribute('max', this.seekBarMax.toString());
  this.eleSeekBar.className = 'p51-seek-bar';
  this.eleSeekBar.style.gridArea = '1 / 2 / 1 / 6';
  parent.appendChild(this.eleSeekBar);
};

Renderer.prototype.initTimeStampHTML = function(parent) {
  this.eleTimeStamp = document.createElement('div');
  this.eleTimeStamp.className = 'p51-time';
  this.eleTimeStamp.style.gridArea = '2 / 3 / 2 / 3';
  parent.appendChild(this.eleTimeStamp);
};

Renderer.prototype.initPlayerControlOptionsButtonHTML = function(parent) {
  this.eleOptionsButton = document.createElement('img');
  this.eleOptionsButton.className = 'p51-clickable';
  this.eleOptionsButton.src = ICONS.options;
  this.eleOptionsButton.title = 'Settings (s)';
  this.eleOptionsButton.style.gridArea = '2 / 5 / 2 / 5';
  parent.appendChild(this.eleOptionsButton);
};

Renderer.prototype.initPlayerOptionsPanelHTML = function(parent) {
  this.eleDivVideoOpts = document.createElement('div');
  this.eleDivVideoOpts.className = 'p51-video-options-panel';
  this.eleDivVideoOpts.innerHTML = '<b>DISPLAY OPTIONS</b>';

  const makeSectionHeader = function(text) {
    const header = document.createElement('b');
    header.className = 'p51-section-header';
    header.innerText = text;
    return header;
  };

  const makeWrapper = function(children) {
    const wrapper = document.createElement('div');
    wrapper.className = 'p51-video-opt-input';
    for (const child of children) {
      wrapper.appendChild(child);
    }
    return wrapper;
  };

  const makeCheckboxRow = function(text, checked) {
    const label = document.createElement('label');
    label.className = 'p51-label';
    label.innerHTML = text;

    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.checked = checked;
    const span = document.createElement('span');
    span.className = 'p51-checkbox';
    label.appendChild(checkbox);
    label.appendChild(span);

    return label;
  };

  // Checkbox to show frames instead of time
  const eleOptCtlFrameCountRow = makeCheckboxRow(
      'Show frame number', this.overlayOptions.showFrameCount);
  this.eleOptCtlShowFrameCount =
      eleOptCtlFrameCountRow.querySelector('input[type=checkbox]');
  this.eleOptCtlShowFrameCountWrapper = makeWrapper([
    eleOptCtlFrameCountRow,
  ]);


  // Checkbox for show label on click only
  const eleOptCtlShowLabelRow = makeCheckboxRow(
      'Only show clicked object', this.overlayOptions.labelsOnlyOnClick);
  this.eleOptCtlShowLabel =
      eleOptCtlShowLabelRow.querySelector('input[type=checkbox]');
  this.eleOptCtlShowLabelWrapper = makeWrapper([
    eleOptCtlShowLabelRow,
  ]);

  // Selection for action type
  this.eleActionCtlOptForm = document.createElement('form');
  this.eleActionCtlOptForm.className = 'p51-video-opt-input';
  const actionFormTitle = document.createElement('div');
  actionFormTitle.appendChild(makeSectionHeader('Object selection mode'));
  this.eleActionCtlOptForm.appendChild(actionFormTitle);
  this.eleActionCtlOptForm.appendChild(document.createElement('div'));
  for (const obj of Object.values(this._actionOptions)) {
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = 'selectActionOpt';
    radio.value = obj.type;
    radio.checked = this.overlayOptions.action.type === obj.type;
    const label = document.createElement('label');
    label.innerHTML = obj.name;
    label.className = 'p51-label';
    label.appendChild(radio);
    const span = document.createElement('span');
    span.className = 'p51-radio';
    label.appendChild(span);
    this.eleActionCtlOptForm.appendChild(label);
  }

  // Checkbox for show attrs
  const eleOptCtlShowAttrRow = makeCheckboxRow(
      'Show attributes', this.overlayOptions.showAttrs);
  this.eleOptCtlShowAttr =
      eleOptCtlShowAttrRow.querySelector('input[type=checkbox]');
  this.eleOptCtlShowAttrWrapper = makeWrapper([
    eleOptCtlShowAttrRow,
  ]);

  // Checkbox for show attrs on click only
  const eleOptCtlShowAttrClickRow = makeCheckboxRow(
      'Only show clicked attributes', this.overlayOptions.attrsOnlyOnClick);
  this.eleOptCtlShowAttrClick =
      eleOptCtlShowAttrClickRow.querySelector('input[type=checkbox]');
  this.eleOptCtlShowAttrClickWrapper = makeWrapper([
    eleOptCtlShowAttrClickRow,
  ]);

  // Checkbox for rendering background for attr text
  const eleOptCtlAttrBoxRow = makeCheckboxRow(
      'Show attribute background', this.overlayOptions.attrRenderBox);
  this.eleOptCtlShowAttrBox =
      eleOptCtlAttrBoxRow.querySelector('input[type=checkbox]');
  this.eleOptCtlAttrBoxWrapper = makeWrapper([
    eleOptCtlAttrBoxRow,
  ]);

  // Radio for how to show attrs
  this.eleOptCtlAttrOptForm = document.createElement('form');
  this.eleOptCtlAttrOptForm.className = 'p51-video-opt-input';
  const formTitle = document.createElement('div');
  formTitle.appendChild(makeSectionHeader('Object attribute mode'));
  this.eleOptCtlAttrOptForm.appendChild(formTitle);
  this.eleOptCtlAttrOptForm.appendChild(document.createElement('div'));
  for (const item of this._attrRenderModeOptions) {
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = 'attrRenderOpt';
    radio.value = item.value;
    radio.checked = this.overlayOptions.attrRenderMode === item.value;
    const label = document.createElement('label');
    label.innerHTML = item.name;
    label.className = 'p51-label';
    label.appendChild(radio);
    const span = document.createElement('span');
    span.className = 'p51-radio';
    label.appendChild(span);
    this.eleOptCtlAttrOptForm.appendChild(label);
  }

  if (this.hasFrameNumbers()) {
    this.eleDivVideoOpts.appendChild(this.eleOptCtlShowFrameCountWrapper);
  }
  this.eleDivVideoOpts.appendChild(this.eleActionCtlOptForm);
  this.eleDivVideoOpts.appendChild(this.eleOptCtlShowLabelWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptCtlShowAttrWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptCtlShowAttrClickWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptCtlAttrBoxWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptCtlAttrOptForm);

  this.attrOptsElements = [
    this.eleOptCtlAttrOptForm,
    this.eleOptCtlAttrBoxWrapper,
    this.eleOptCtlShowAttrClickWrapper,
  ];

  parent.appendChild(this.eleDivVideoOpts);
};

Renderer.prototype._repositionOptionsPanel = function() {
  // account for control bar height and any padding
  this.eleDivVideoOpts.style.bottom = this.eleDivVideoControls.clientHeight +
    parseInt(this.paddingBottom) + 4 + 'px';
  this.eleDivVideoOpts.style.right =
    parseInt(this.paddingRight) + 'px';
};


Renderer.prototype.initPlayerOptionsControls = function() {
  this.eleOptionsButton.addEventListener('click', (e) => {
    this._boolShowVideoOptions = !this._boolShowVideoOptions;
    this._repositionOptionsPanel();
    this.updateFromDynamicState();
  });

  this.eleOptCtlShowFrameCount.addEventListener('change', () => {
    this.overlayOptions.showFrameCount = this.eleOptCtlShowFrameCount.checked;
    this.processFrame();
  });

  this.eleOptCtlShowLabel.addEventListener('change', () => {
    this.overlayOptions.labelsOnlyOnClick =
        this.eleOptCtlShowLabel.checked;
    this.processFrame();
    this.updateFromDynamicState();
  });

  this.eleOptCtlShowAttr.addEventListener('change', () => {
    this.overlayOptions.showAttrs = this.eleOptCtlShowAttr.checked;
    this.processFrame();
    this.updateFromDynamicState();
    this._repositionOptionsPanel(this.eleOptionsButton);
  });

  this.eleOptCtlShowAttrClick.addEventListener('change', () => {
    this.overlayOptions.attrsOnlyOnClick =
        this.eleOptCtlShowAttrClick.checked;
    this.processFrame();
    this.updateFromDynamicState();
  });

  this.eleOptCtlShowAttrBox.addEventListener('change', () => {
    this.overlayOptions.attrRenderBox =
        this.eleOptCtlShowAttrBox.checked;
    this.processFrame();
    this.updateFromDynamicState();
  });

  for (const radio of this.eleOptCtlAttrOptForm) {
    radio.addEventListener('change', () => {
      if (radio.value !== this.overlayOptions.attrRenderMode) {
        this.overlayOptions.attrRenderMode = radio.value;
        this._alterOptionsLabelText();
        this.processFrame();
        this.updateFromDynamicState();
      }
    });
  }

  for (const radio of this.eleActionCtlOptForm) {
    radio.addEventListener('change', () => {
      if (radio.value !== this.overlayOptions.action.type) {
        this.overlayOptions.action = this._getActionByKey('type', radio.value);
        this._alterOptionsLabelText();
        this._reBindMouseHandler();
        this.processFrame();
        this.updateFromDynamicState();
      }
    });
  }
};

Renderer.prototype._alterOptionsLabelText = function() {
  const getTextNode = (nodes) => {
    for (const node of nodes) {
      if (node.nodeName === '#text') {
        return node;
      }
    }
  };
  let textNode = getTextNode(
      this.eleOptCtlShowAttrClickWrapper.querySelector('label').childNodes);
  textNode.textContent =
    `Only show ${this.overlayOptions.action.labelText} attributes`;

  textNode = getTextNode(
      this.eleOptCtlShowLabelWrapper.querySelector('label').childNodes);
  textNode.textContent =
    `Only show ${this.overlayOptions.action.labelText} object`;
};

Renderer.prototype._getActionByKey = function(key, val) {
  return Object.values(this._actionOptions).find(
      (e) => Object.entries(e).find(
          ([k, v]) => key === k && val === v));
};


/**
 * This function returns if the mouseEvent target is inside any of the player
 * controls
 *
 * @param {MouseEvent} e - mouseEvent from eventHandler
 * @return {Boolean} if contained
 */
Renderer.prototype.checkMouseOnControls = function(e) {
  if (this.eleDivVideoControls && this.eleDivVideoControls.contains(e.target)) {
    return true;
  } else if (this.eleDivVideoOpts && this.eleDivVideoOpts.contains(e.target)) {
    return true;
  }
  return false;
};

/**
 * This function is to be called by child classes in updateFromDynamicState
 * to properly show or hide all configured controls
 *
 * @member updateControlsDisplayState
 * @required the viewer must be rendered.
 */
Renderer.prototype.updateControlsDisplayState = function() {
  if (!this.eleDivVideoControls) {
    return;
  }
  if (this._boolShowControls) {
    this.eleDivVideoControls.style.opacity = '0.9';
  } else {
    this.eleDivVideoControls.style.opacity = '0.0';
    if (this.player._boolThumbnailMode) {
      this.eleDivVideoControls.remove();
    }
  }
  this._updateOptionsDisplayState();
};

Renderer.prototype._updateOptionsDisplayState = function() {
  if (!this.eleDivVideoOpts) {
    return;
  }
  if (this._boolShowVideoOptions && this._boolShowControls) {
    this.eleDivVideoOpts.style.opacity = '0.9';
    this.eleDivVideoOpts.classList.remove('p51-display-none');
  } else {
    this.eleDivVideoOpts.style.opacity = '0.0';
    this.eleDivVideoOpts.classList.add('p51-display-none');
    if (this.player._boolThumbnailMode) {
      this.eleDivVideoOpts.remove();
    }
  }
  this._setAttributeControlsDisplay();
};

Renderer.prototype._setAttributeControlsDisplay = function() {
  let func = (node) => {
    node.hidden = false;
  };
  if (!this.overlayOptions.showAttrs) {
    this.attrOptsElements.forEach((e) => e.className = '');
    func = (node) => {
      node.hidden = true;
    };
  } else {
    this.attrOptsElements.forEach((e) => e.className = 'p51-video-opt-input');
  }
  this.attrOptsElements.forEach((e) => recursiveMap(e, func));
};

Renderer.prototype.hasFrameNumbers = function() {
  return this._hasOverlay;
};

Renderer.prototype.updatePlayButton = function(playing) {
  if (this.elePlayPauseButton) {
    if (playing) {
      this.elePlayPauseButton.src = ICONS.pause;
      this.elePlayPauseButton.title = 'Pause (space)';
    } else {
      this.elePlayPauseButton.src = ICONS.play;
      this.elePlayPauseButton.title = 'Play (space)';
    }
  }
};

Renderer.prototype.updateTimeStamp = function(timeStr) {
  if (!this.eleTimeStamp) {
    return;
  }
  this.eleTimeStamp.innerHTML = timeStr;
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
 * This function updates the size and padding based on parent
 *
 * @member updateSizeAndPaddingByParent
 * @required the viewer must be rendered.
 */
Renderer.prototype.updateSizeAndPaddingByParent = function() {
  this.checkPlayer();
  this.checkParentandMedia();
  this.determineMediaDimensions();
  this.eleCanvas.setAttribute('width', this.mediaWidth);
  this.eleCanvas.setAttribute('height', this.mediaHeight);
  this.canvasWidth = this.mediaWidth;
  this.canvasHeight = this.mediaHeight;
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
        'WARN: Player51 trying to update size, but it is not rendered.');
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


/**
 * Set a named timeout, cancelling any existing timeout of the same name.
 * @param {string} name The name of the timeout
 * @param {function} callback The function to call after the time has passed
 * @param {number} delay The time to wait
 */
Renderer.prototype.setTimeout = function(name, callback, delay) {
  this.clearTimeout(name);
  this._timeouts[name] = setTimeout(callback, delay);
};

/**
 * Clear a named timeout if it exists.
 * @param {string} name The name of the timeout
 */
Renderer.prototype.clearTimeout = function(name) {
  if (name in this._timeouts) {
    clearTimeout(this._timeouts[name]);
    delete this._timeouts[name];
  }
};
