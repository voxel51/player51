/**
 * @module overlay.js
 * @summary Defines a series of helper classes that render the overlays on top
 * of either the video or image player.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */


// ES6 module export
export {
  ColorGenerator,
  Overlay,
  FrameAttributesOverlay,
  ObjectOverlay,
};


/**
 * A Class to encapsulate the creation of suitable colors for drawing the
 * overlays and maintaining their identity over the entire video.
 */
function ColorGenerator() {
  // member will store all colors created
  this.colors = {};

  // standard colors
  this.white = '#ffffff';
  this.black = '#000000';

  this._colorSet = undefined;
  this._colorS = '70%';
  this._colorL = '40%';
  this._colorA = '0.875';
}


/**
 * Provide a color based on an index.
 *
 * @member color
 * @param {int} index
 * @return {color} color
 */
ColorGenerator.prototype.color = function(index) {
  if (!(index in this.colors)) {
    this.colors[index] = this.generateNewColor();
  }
  return this.colors[index];
};


/**
 * Generates the entire dictionary of colors.
 *
 * @member _generateColorSet
 * @private
 * @param {int} n
 */
ColorGenerator.prototype._generateColorSet = function(n = 36) {
  const delta = 360 / n;
  this._colorSet = new Array(n);
  for (let i = 0; i < n; i++) {
    this._colorSet[i] = (
      `hsla(${i * delta}, ${this._colorS}, ${this._colorL}, ${this._colorA})`
    );
  }
};


/**
 * Called to generate a random bounding box color to use in rendering.
 *
 * @member generateNewColor
 * @return {color} color
 */
ColorGenerator.prototype.generateNewColor = function() {
  if (typeof(this._colorSet) === 'undefined') {
    this._generateColorSet();
  }
  return this._colorSet[Math.floor(Math.random() * this._colorSet
      .length)];
};


// Instantiate one colorGenerator for global use
const colorGenerator = new ColorGenerator();


/**
 * A Class defining the generic interface for how to render overlays on the
 * video.
 *
 * Each sub-class must overload the setup and the draw functions.
 */
function Overlay() {}
Overlay.prototype.draw = function(context, canvasWidth, canvasHeight) {
  console.log('ERROR: draw called on abstract type');
};
Overlay.prototype.setup = function(context, canvasWidth, canvasHeight) {
  console.log('ERROR: setup called on abstract type');
};


/**
 * A Class for rendering an FrameAttributesOverlay on the Video
 *
 * @param {array} d is an array with the following structure
 *    [
 *      "name": "name of the attribute",
 *      "value": "value for the attribute",
 *      "confidence": confidence of the attribute
 *    ]
 * @param {renderer} renderer
 *
 */
function FrameAttributesOverlay(d, renderer) {
  Overlay.call(this);
  this.renderer = renderer;

  this.attrs = d.attrs;
  this.attrText =
    null; // will store a list of strings (one for each object in d.attrs)

  this.attrFontHeight = null;
  this.maxAttrTextWidth = -1;

  // Location and Size to draw these
  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;
  this.textPadder = null;
}
FrameAttributesOverlay.prototype = Object.create(Overlay.prototype);
FrameAttributesOverlay.prototype.constructor = FrameAttributesOverlay;


/**
 * Second half of constructor that should be called after the object exists.
 *
 * @method setup
 * @constructor
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
FrameAttributesOverlay.prototype.setup = function(context, canvasWidth,
    canvasHeight) {
  if (typeof(this.attrs) !== undefined) {
    this._parseAttrs();
  }

  this.attrFontHeight = Math.min(20, 0.09 * canvasHeight);
  this.attrFontHeight = this.renderer.checkFontHeight(this.attrFontHeight);
  // this is *0.4 instead of / 2 because it looks better
  this.textPadder = 10;

  this.x = this.textPadder;
  this.y = this.textPadder;

  // this.w is set up by the _setupWidths function
  this.h = this.attrText.length * (this.attrFontHeight + this
      .textPadder) + this.textPadder;

  if (typeof(context) === 'undefined') {
    return;
  }
  this._setupWidths(context, canvasWidth, canvasHeight);
};


/**
 * Private method to parse the attributes objects provided at creation and set
 * them up as renderable strings for the overlay.
 *
 * @method _parseAttrs
 */
FrameAttributesOverlay.prototype._parseAttrs = function() {
  if (this.attrText === null) {
    this.attrText = new Array(this.attrs.length);
  }

  for (let len = this.attrs.length, a = 0; a < len; a++) {
    const at = `${this.attrs[a].name}: ${this.attrs[a].value}`;
    this.attrText[a] = at.replace(new RegExp('_', 'g'), ' ');
  }
};


FrameAttributesOverlay.prototype._setupWidths = function(context, canvasWidth,
    canvasHeight) {
  context.font = `${this.attrFontHeight}px sans-serif`;
  let mw = 0;
  for (let a = 0; a < this.attrText.length; a++) {
    const aw = context.measureText(this.attrText[a]).width;
    if (aw == 0) {
      console.log('PLAYER51 WARN: rendering context broken');
      return;
    }
    if (aw > mw) {
      mw = aw;
    }
  }
  this.maxAttrTextWidth = mw;
  this.w = this.maxAttrTextWidth + 2 * this.textPadder;
};


/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
FrameAttributesOverlay.prototype.draw = function(context, canvasWidth,
    canvasHeight) {
  if (typeof(context) === 'undefined') {
    return;
  }

  if (this.w === null) {
    this._setupWidths(context, canvasWidth, canvasHeight);
    // If something went wrong in trying to estimate the sizes of things, then
    // we still cannot draw.
    if (this.w <= 0) {
      console.log(
          'PLAYER51 WARN: FAO draw before setup; invalid canvas');
      return;
    }
  }

  if (!this.renderer.player._boolThumbnailMode) {
    context.fillStyle = this.renderer.metadataOverlayBGColor;
    context.fillRect(this.x, this.y, this.w, this.h);

    context.font = `${this.attrFontHeight}px sans-serif`;
    context.fillStyle = colorGenerator.white;

    // Rendering y is at the baseline of the text.  Handle this by padding
    // one row (attrFontHeight and textPadder)
    for (let a = 0; a < this.attrText.length; a++) {
      context.fillText(this.attrText[a],
          this.x + this.textPadder,
          this.y + (a + 1) * (this.attrFontHeight + this
              .textPadder));
    }
  }
};


/**
 * A Class for rendering an Overlay on the Video
 *
 * @param {dictionary} d is a dictionary with the following structure
 *       "label": "the class/label/name of thing to show",
 *       "index": "a unique index for the object",
 *       "frame_number": 100, // the integer frame number for this object
 *       "Optional, may only be present for certain players."
 *       "bounding_box": {
 *         "top_left": {
 *           "x": 0.1, // floating number in relative 0:1 coordinates
 *           "y": 0.1, // floating number in relative 0:1 coordinates
 *         },
 *         "bottom_right": {
 *           "x": 0.2, // floating number in relative 0:1 coordinates
 *           "y": 0.2, // floating number in relative 0:1 coordinates
 *         }
 *       }
 * @param {renderer} renderer
 */
function ObjectOverlay(d, renderer) {
  Overlay.call(this);

  this.renderer = renderer;

  this.label = d.label;
  this.labelUpper = this.label.toUpperCase();
  this.index = d.index;
  this.indexStr = `${this.index}`;

  this.frame_number = d.frame_number;
  this.bounding_box = d.bounding_box;

  if (typeof(d.attrs) !== 'undefined') {
    this._attrs = d.attrs.attrs;
  }
  this.attrText = null;
  this.attrTextWidth = -1;
  this.attrFontHeight = null;

  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;
  this.color = null;

  // this is the height of the header box into which we draw the label
  this.headerHeight = null;
  this.headerWidth = null;
  this.headerFontHeight = null;
  this.textPadder = null;
  this.labelTextWidth = null;
  this.indexTextWidth = null;
  this.labelIndexPadding =
    51; // extra space forced between label and index in header
}
ObjectOverlay.prototype = Object.create(Overlay.prototype);
ObjectOverlay.prototype.constructor = ObjectOverlay;


/**
 * Second half of constructor that should be called after the object exists.
 *
 * @method setup
 * @constructor
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
ObjectOverlay.prototype.setup = function(context, canvasWidth, canvasHeight) {
  if (typeof(this._attrs) !== undefined) {
    this._parseAttrs();
  }
  this.x = this.bounding_box.top_left.x * canvasWidth;
  this.y = this.bounding_box.top_left.y * canvasHeight;
  this.w = (this.bounding_box.bottom_right.x - this.bounding_box.top_left
      .x) * canvasWidth;
  this.h = (this.bounding_box.bottom_right.y - this.bounding_box.top_left
      .y) * canvasHeight;
  this.color = colorGenerator.color(this.index);

  this.headerFontHeight = Math.min(20, 0.09 * canvasHeight);
  this.headerFontHeight = this.renderer.checkFontHeight(this
      .headerFontHeight);
  this.attrFontHeight = Math.min(18, 0.088 * canvasHeight);
  this.attrFontHeight = this.renderer.checkFontHeight(this.attrFontHeight);
  this.headerHeight = Math.min(26, 0.13 * canvasHeight);
  // this is *0.4 instead of / 2 because it looks better
  this.textPadder = (this.headerHeight - this.headerFontHeight) * 0.4;

  if (typeof(context) === 'undefined') {
    return;
  }

  this._setupFontWidths(context, canvasWidth, canvasHeight);
};


ObjectOverlay.prototype._setupFontWidths = function(context, canvasWidth,
    canvasHeight) {
  context.font = `${this.headerFontHeight}px sans-serif`;
  this.labelTextWidth = context.measureText(this.labelUpper).width;
  this.indexTextWidth = context.measureText(this.indexStr).width;

  context.font = `${this.attrFontHeight}px sans-serif`;
  this.attrFontWidth = context.measureText(this.attrText).width;

  if ((this.labelTextWidth + this.indexTextWidth + this
      .labelIndexPadding + 2 * this.textPadder) <= this.w) {
    this.headerWidth = this.w;
  } else {
    this.headerWidth = this.labelTextWidth + this.indexTextWidth + 2 *
      this.textPadder + this.labelIndexPadding;
  }
};


/**
 * Private method to parse the attributes objects provided at creation and set
 * them up as a renderable string for the overlay.
 *
 * @method _parseAttrs
 * @param {attrs} attrs
 */
ObjectOverlay.prototype._parseAttrs = function(attrs) {
  if (this.attrText === null) {
    this.attrText = '';
  }

  if (typeof(attrs) === 'undefined') {
    if (typeof(this._attrs) === 'undefined') {
      return;
    }
    attrs = this._attrs;
  }

  for (let a = 0; a < attrs.length; a++) {
    this.attrText = this.attrText + `${attrs[a].value}`;
    if (a < attrs.length - 1) {
      this.attrText = this.attrText + ', ';
    }
  }
  this.attrText = this.attrText.replace(new RegExp('_', 'g'), ' ');
};


/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
ObjectOverlay.prototype.draw = function(context, canvasWidth, canvasHeight) {
  if (typeof(context) === 'undefined') {
    return;
  }

  if (this.labelTextWidth === null) {
    this._setupFontWidths(context, canvasWidth, canvasHeight);
  }

  context.strokeStyle = this.color;
  context.fillStyle = this.color;
  context.strokeRect(this.x, this.y, this.w, this.h);

  if (!this.renderer.player._boolThumbnailMode) {
    // fill and stroke to account for line thickness variation
    context.strokeRect(this.x, this.y - this.headerHeight,
        this.headerWidth, this.headerHeight);
    context.fillRect(this.x, this.y - this.headerHeight,
        this.headerWidth, this.headerHeight);

    context.font = `${this.headerFontHeight}px sans-serif`;
    context.fillStyle = colorGenerator.white;
    context.fillText(this.labelUpper,
        this.x + this.textPadder, this.y - this.textPadder);

    context.fillText(this.indexStr,
        this.x + this.headerWidth - 4 * this.textPadder - this
            .indexTextWidth,
        this.y - this.textPadder);

    context.font = `${this.attrFontHeight}px sans-serif`;
    if ((typeof(this.attrFontWidth) === 'undefined') ||
      (this.attrFontWidth === null)) {
      this.attrFontWidth = context.measureText(this.attrText).width;
    }

    context.fillText(this.attrText,
        this.x + this.textPadder,
        this.y + this.attrFontHeight + 3 * this.textPadder);
  }
};
