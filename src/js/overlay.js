/**
 * @module overlay.js
 * @summary Defines a series of helper classes that render the overlays on top
 * of either the video or image player.
 *
 * Copyright 2017-2021, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */

import {
  inRect,
  distance,
  distanceFromLineSegment,
  compareData,
  computeBBoxForTextOverlay,
} from "./util.js";
import { deserialize } from "./numpy.js";

export {
  colorGenerator,
  ColorGenerator,
  Overlay,
  FrameAttributesOverlay,
  FrameMaskOverlay,
  ObjectOverlay,
  KeypointsOverlay,
  PolylineOverlay,
};

const MASK_ALPHA = 0.6;
const LINE_WIDTH = 6;
const POINT_RADIUS = 6;
const DASH_LENGTH = 10;
const DASH_COLOR = "#ffffff";
const _rawColorCache = {};

/**
 * A Class to encapsulate the creation of suitable colors for drawing the
 * overlays and maintaining their identity over the entire video.
 */
function ColorGenerator() {
  // member will store all colors created
  this.colors = {};
  this._rawColors = {};

  // standard colors
  this.white = "#ffffff";
  this.black = "#000000";

  this._colorSet = undefined;
  this._colorS = "70%";
  this._colorL = "40%";
  this._colorA = "0.875";

  const maskOffset = Math.floor(Math.random() * 256);
  this.rawMaskColors = new Uint32Array(256);
  for (let i = 0; i < this.rawMaskColors.length; i++) {
    this.rawMaskColors[i] = this.rawColor((i + maskOffset) % 256);
  }
  // reduce alpha of masks
  const rawMaskColorComponents = new Uint8Array(this.rawMaskColors.buffer);
  for (let i = 3; i < rawMaskColorComponents.length; i += 4) {
    rawMaskColorComponents[i] = Math.floor(255 * MASK_ALPHA);
  }
}

/**
 * Provide a color based on an index.
 *
 * @member color
 * @param {int} index
 * @return {color} color
 */
ColorGenerator.prototype.color = function (index) {
  if (!(index in this.colors)) {
    if (typeof this._colorSet === "undefined") {
      this._generateColorSet();
    }
    const rawIndex = Math.floor(Math.random() * this._colorSet.length);
    this.colors[index] = this._colorSet[rawIndex];
    this._rawColors[index] = this._rawColors[rawIndex];
  }
  return this.colors[index];
};

/**
 * Provide raw RGBA values for a color based on an index.
 *
 * @member color
 * @param {int} index
 * @return {color} color
 */
ColorGenerator.prototype.rawColor = function (index) {
  if (!(index in this._rawColors)) {
    this.color(index);
  }
  return this._rawColors[index];
};

/**
 * Generates the entire dictionary of colors.
 *
 * @member _generateColorSet
 * @private
 * @param {int} n
 */
ColorGenerator.prototype._generateColorSet = function (n = 36) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  const delta = 360 / n;
  this._colorSet = new Array(n);
  for (let i = 0; i < n; i++) {
    this._colorSet[i] = `hsla(${i * delta}, ${this._colorS}, ${this._colorL}, ${
      this._colorA
    })`;
    context.fillStyle = this._colorSet[i];
    context.clearRect(0, 0, 1, 1);
    context.fillRect(0, 0, 1, 1);
    this._rawColors[i] = new Uint32Array(
      context.getImageData(0, 0, 1, 1).data.buffer
    )[0];
  }
};

// Instantiate one colorGenerator for global use
const colorGenerator = new ColorGenerator();

/**
 * Checks whether an attribute should be shown.
 * @param {object} filter map of name -> filter callbacks
 * @param {object} attr attribute object
 * @param {boolean} useValue (passed to filter callback)
 * @return {boolean}
 */
function _isAttrShown(filter, attr, useValue = false) {
  return filter && attr.name && filter[attr.name] && filter[attr.name].call
    ? filter[attr.name](attr, useValue)
    : true;
}

/**
 * A Class defining the generic interface for how to render overlays on the
 * video.
 *
 * Each sub-class must overload the setup and the draw functions.
 *
 * @param {Renderer} renderer Associated renderer
 */
function Overlay(renderer) {
  this.renderer = renderer;
  this.options = renderer.overlayOptions;
}
Overlay.prototype.draw = function (context, canvasWidth, canvasHeight) {
  /* eslint-disable-next-line no-console */
  console.log("ERROR: draw called on abstract type");
};
Overlay.prototype.setup = function (context, canvasWidth, canvasHeight) {
  /* eslint-disable-next-line no-console */
  console.log("ERROR: setup called on abstract type");
};

Overlay.prototype._isShown = function (name) {
  if (
    this.renderer.options.activeLabels &&
    this.renderer.options.activeLabels[name] === false
  ) {
    return false;
  }
  if (!_isAttrShown(this.renderer.options.filter, this)) {
    return false;
  }
  return true;
};
Overlay.prototype._getColor = function (name, label, index) {
  const options = this.renderer.options;
  const hasColor = options.colorMap && options.colorMap[name];
  const useColorMap = !options.colorByLabel;
  if (hasColor && useColorMap) {
    return options.colorMap[name];
  } else if (hasColor && !useColorMap) {
    return colorGenerator.color(label);
  }
  return colorGenerator.color(index);
};

Overlay.prototype.hasFocus = function () {
  return this.renderer.isFocus(this);
};

// in numerical order (CONTAINS_BORDER takes precedence over CONTAINS_CONTENT)
Overlay.CONTAINS_NONE = 0;
Overlay.CONTAINS_CONTENT = 1;
Overlay.CONTAINS_BORDER = 2;

/**
 * Checks whether the given point (in canvas coordinates) is contained by the
 * object, and if so, what part of the object contains it.
 *
 * @param {number} x canvas x coordinate
 * @param {number} y canvas y coordinate
 * @return {number} an Overlay.CONTAINS_* constant
 */
Overlay.prototype.containsPoint = function (x, y) {
  return Overlay.CONTAINS_NONE;
};

Overlay.prototype.getMouseDistance = function (x, y) {
  throw new Error("Method getMouseDistance() must be implemented.");
};

Overlay.prototype.getPointInfo = function (x, y) {
  throw new Error("Method getPointInfo() must be implemented.");
};

Overlay.prototype.isSelectable = function () {
  return this.id !== undefined;
};

Overlay.prototype.isSelected = function () {
  return (
    this.isSelectable() &&
    this.renderer.options.selectedObjects.includes(this.id)
  );
};

/**
 * An overlay that renders frame-level attributes
 *
 * @param {array} d is an array with the following structure
 *    [
 *      "name": "name of the attribute",
 *      "value": "value for the attribute",
 *      "confidence": confidence of the attribute
 *    ]
 * @param {Renderer} renderer Associated renderer
 *
 */
function FrameAttributesOverlay(d, renderer) {
  Overlay.call(this, renderer);

  this.attrs = d.attrs;
  this.attrText = null; // will store a list of strings (one for each object in d.attrs)

  this.attrFontHeight = null;
  this.maxAttrTextWidth = -1;
  this.font = null;

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
FrameAttributesOverlay.prototype.setup = function (
  context,
  canvasWidth,
  canvasHeight
) {
  if (typeof this.attrs !== undefined) {
    this._updateAttrs();
  }
  this.textPadder = 10;
  if (this.x === null || this.y === null) {
    this.x = this.textPadder;
    this.y = this.textPadder;
  }

  this.attrFontHeight = Math.min(20, 0.09 * canvasHeight);
  this.attrFontHeight = this.renderer.checkFontHeight(this.attrFontHeight);
  this.font = `${this.attrFontHeight}px Arial, sans-serif`;
  if (typeof context === "undefined") {
    return;
  }
  context.font = this.font;
};

FrameAttributesOverlay.prototype._getFilteredAttrs = function () {
  return this.attrs.filter(
    (attr) =>
      this.renderer.options.activeLabels[attr.name] &&
      _isAttrShown(this.renderer.options.filter, attr, true)
  );
};

/**
 * Private method to parse the attributes objects provided at creation and set
 * them up as renderable strings for the overlay.
 *
 * @method _updateAttrs
 */
FrameAttributesOverlay.prototype._updateAttrs = function () {
  this.attrText = this._getFilteredAttrs().map((attr) => {
    const strLimit = 24;
    let { name, value } = attr;
    name = name.length > strLimit ? name.slice(0, strLimit) + "..." : name;
    value =
      typeof value === "string" && value.length > strLimit
        ? value.slice(0, strLimit) + "..."
        : value;
    let s = `${name}: ${value}`;
    if (this.options.showConfidence && !isNaN(attr.confidence)) {
      s += ` (${Number(attr.confidence).toFixed(2)})`;
    }
    return s;
  });
};

/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
FrameAttributesOverlay.prototype.draw = function (
  context,
  canvasWidth,
  canvasHeight
) {
  if (typeof context === "undefined") {
    return;
  }
  if (this.w === null) {
    this.setup(context, canvasWidth, canvasHeight);
  }

  if (!this.renderer.player._boolThumbnailMode) {
    this._updateAttrs();
    if (!this.attrText.length) {
      return;
    }
    context.font = this.font;
    const bbox = computeBBoxForTextOverlay(
      context,
      this.attrText,
      this.attrFontHeight,
      this.textPadder
    );
    this.w = bbox.width;
    this.h = bbox.height;
    context.fillStyle = this.renderer.metadataOverlayBGColor;
    context.fillRect(this.x, this.y, this.w, this.h);

    // Rendering y is at the baseline of the text.  Handle this by padding
    // one row (attrFontHeight and textPadder)
    context.fillStyle = colorGenerator.white;
    for (let a = 0; a < this.attrText.length; a++) {
      context.fillText(
        this.attrText[a],
        this.x + this.textPadder,
        this.y + (a + 1) * (this.attrFontHeight + this.textPadder)
      );
    }
  }
};

FrameAttributesOverlay.prototype.getMouseDistance = function (x, y) {
  if (this.containsPoint(x, y)) {
    return 0;
  }
  return Infinity;
};

FrameAttributesOverlay.prototype.containsPoint = function (x, y) {
  const xAxis = x > this.x && x < this.w + this.x;
  const yAxis = y > this.y && y < this.h + this.y;
  return xAxis && yAxis;
};

FrameAttributesOverlay.prototype.getPointInfo = function (x, y) {
  return this._getFilteredAttrs().map((a) => {
    return {
      color: this._getColor(a.name, a.value),
      field: a.name,
      confidence: a.confidence,
      label: a.value,
      type: "classification",
      target: a.target,
      attrs: a.attrs,
    };
  });
};

/**
 * An overlay that renders frame-level masks
 *
 * @param {object} d an object with keys:
 *   `mask`: base64-encoded mask
 *   `name`: a name identifying the mask
 * @param {Renderer} renderer Associated renderer
 *
 */
function FrameMaskOverlay(d, renderer) {
  if (!FrameMaskOverlay._tempMaskCanvas) {
    FrameMaskOverlay._tempMaskCanvas = document.createElement("canvas");
  }

  Overlay.call(this, renderer);

  this.mask = deserialize(d.mask);
  this.name = d.name;
  this.id = d._id;
  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;
  this.renderer = renderer;
}
FrameMaskOverlay.prototype = Object.create(Overlay.prototype);
FrameMaskOverlay.prototype.constructor = FrameMaskOverlay;

/**
 * Second half of constructor that should be called after the object exists.
 *
 * @method setup
 * @constructor
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
FrameMaskOverlay.prototype.setup = function (
  context,
  canvasWidth,
  canvasHeight
) {
  this.x = 0;
  this.y = 0;
  this.w = canvasWidth;
  this.h = canvasHeight;
};

/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
FrameMaskOverlay.prototype.draw = function (
  context,
  canvasWidth,
  canvasHeight
) {
  if (this.name && !this._isShown(this.name)) {
    return;
  }

  const [maskHeight, maskWidth] = this.mask.shape;
  ensureCanvasSize(FrameMaskOverlay._tempMaskCanvas, {
    width: maskWidth,
    height: maskHeight,
  });
  const maskContext = FrameMaskOverlay._tempMaskCanvas.getContext("2d");
  const maskImage = maskContext.createImageData(maskWidth, maskHeight);
  const imageColors = new Uint32Array(maskImage.data.buffer);
  if (this.mask.rendered) {
    imageColors.set(this.mask.data);
  } else {
    this.mask.targets = new Uint32Array(this.mask.data);
    const index = this.renderer.frameMaskIndex;
    if (index) {
      for (let i = 0; i < this.mask.data.length; i++) {
        if (index[this.mask.data[i]]) {
          imageColors[i] = colorGenerator.rawMaskColors[this.mask.data[i]];
        }
      }
    } else {
      for (let i = 0; i < this.mask.data.length; i++) {
        if (this.mask.data[i]) {
          imageColors[i] = colorGenerator.rawMaskColors[this.mask.data[i]];
        }
      }
    }
    this.mask.data = imageColors;
    this.mask.rendered = true;
  }
  maskContext.putImageData(maskImage, 0, 0);
  context.imageSmoothingEnabled = this.renderer.overlayOptions.smoothMasks;
  context.drawImage(
    FrameMaskOverlay._tempMaskCanvas,
    0,
    0,
    maskWidth,
    maskHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  this.h = canvasHeight;
  this.w = canvasWidth;
};

FrameMaskOverlay.prototype.getMaskCoordinates = function (x, y) {
  const [h, w] = this.mask.shape;
  const sx = Math.floor(x * (w / this.w));
  const sy = Math.floor(y * (h / this.h));
  return [sx, sy];
};

FrameMaskOverlay.prototype.getIndex = function (x, y) {
  const [sx, sy] = this.getMaskCoordinates(x, y);
  return this.mask.shape[1] * sy + sx;
};

FrameMaskOverlay.prototype.getTarget = function (x, y) {
  const index = this.getIndex(x, y);
  return this.mask.targets[index];
};

FrameMaskOverlay.prototype.getMouseDistance = function (x, y) {
  if (this.containsPoint(x, y)) {
    return 0;
  }
  return Infinity;
};

FrameMaskOverlay.prototype.containsPoint = function (x, y) {
  if (!this._isShown()) {
    return Overlay.CONTAINS_NONE;
  }
  if (this.mask.rendered && this.getTarget(x, y)) {
    return Overlay.CONTAINS_CONTENT;
  }
  return Overlay.CONTAINS_NONE;
};

FrameMaskOverlay.prototype.getRGBAColor = function (target) {
  const rawColor = colorGenerator.rawMaskColors[target];
  const [r, g, b, a] = new Uint8Array(new Uint32Array([rawColor]).buffer);
  return `rgba(${r},${g},${b},${a / 255})`;
};

FrameMaskOverlay.prototype.getPointInfo = function (x, y) {
  const coords = this.getMaskCoordinates(x, y);
  const target = this.getTarget(x, y);
  return {
    id: this.id,
    color: this.getRGBAColor(target),
    shape: this.mask.shape,
    coordinates: coords,
    field: this.name,
    target,
    type: "mask",
  };
};

/**
 * An overlay that renders keypoints
 *
 * @param {array} d an ETA Keypoints object
 * @param {Renderer} renderer Associated renderer
 *
 */
function KeypointsOverlay(d, renderer) {
  Overlay.call(this, renderer);

  this.id = d._id;
  this.name = d.name;
  this.label = d.label;
  this.index = d.index;
  this.points = d.points;
  this.target = d.target;
  this.attrs = d.attrs;
}
KeypointsOverlay.prototype = Object.create(Overlay.prototype);
KeypointsOverlay.prototype.constructor = KeypointsOverlay;

/**
 * Second half of constructor that should be called after the object exists.
 *
 * @method setup
 * @constructor
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
KeypointsOverlay.prototype.setup = function (
  context,
  canvasWidth,
  canvasHeight
) {
  this.x = 0;
  this.y = 0;
  this.w = canvasWidth;
  this.h = canvasHeight;
};

/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
KeypointsOverlay.prototype.draw = function (
  context,
  canvasWidth,
  canvasHeight
) {
  if (!this._isShown(this.name)) {
    return;
  }
  const color = this._getColor(this.name, this.label, this.index);
  context.lineWidth = 0;
  const isSelected = this.isSelected();

  for (const point of this.points) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(
      point[0] * canvasWidth,
      point[1] * canvasHeight,
      isSelected ? POINT_RADIUS * 2 : POINT_RADIUS,
      0,
      Math.PI * 2
    );
    context.fill();

    if (isSelected) {
      context.fillStyle = DASH_COLOR;
      context.beginPath();
      context.arc(
        point[0] * canvasWidth,
        point[1] * canvasHeight,
        POINT_RADIUS,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }
};

KeypointsOverlay.prototype._getDistanceAndPoint = function (x, y) {
  const distances = [];
  for (const point of this.points) {
    const d = distance(x, y, point[0] * this.w, point[1] * this.h);
    if (d <= 2 * POINT_RADIUS) {
      distances.push([d, point]);
    }
  }
  if (distances.length) {
    return distances.sort((a, b) => a[0] - b[0])[0];
  }
};

KeypointsOverlay.prototype.getPointInfo = function (x, y) {
  return {
    id: this.id,
    color: this._getColor(this.name, this.label, this.index),
    label: this.label,
    field: this.name,
    index: this.index,
    target: this.target,
    point: this._getDistanceAndPoint(x, y)[1],
    numPoints: this.points.length,
    attrs: this.attrs,
    type: "keypoints",
  };
};

KeypointsOverlay.prototype.getMouseDistance = function (x, y) {
  return this._getDistanceAndPoint(x, y)[0];
};

KeypointsOverlay.prototype.containsPoint = function (x, y) {
  if (!this._isShown()) {
    return Overlay.CONTAINS_NONE;
  }
  if (this._getDistanceAndPoint(x, y)) {
    return Overlay.CONTAINS_BORDER;
  }
  return Overlay.CONTAINS_NONE;
};

/**
 * An overlay that renders polylines
 *
 * @param {array} d an ETA Polyline object
 * @param {Renderer} renderer Associated renderer
 *
 */
function PolylineOverlay(d, renderer) {
  Overlay.call(this, renderer);

  this.id = d._id;
  this.name = d.name;
  this.label = d.label;
  this.index = d.index;
  this.points = d.points;
  this.closed = d.closed;
  this.filled = d.filled;
  this.target = d.target;
  this.attrs = d.attrs;
}
PolylineOverlay.prototype = Object.create(Overlay.prototype);
PolylineOverlay.prototype.constructor = PolylineOverlay;

/**
 * Second half of constructor that should be called after the object exists.
 *
 * @method setup
 * @constructor
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
PolylineOverlay.prototype.setup = function (
  context,
  canvasWidth,
  canvasHeight
) {
  this.x = 0;
  this.y = 0;
  this.w = canvasWidth;
  this.h = canvasHeight;

  this._context = context;

  this.path = new Path2D();
  for (const shape of this.points) {
    const shapePath = new Path2D();
    for (const [pidx, point] of Object.entries(shape)) {
      if (pidx > 0) {
        shapePath.lineTo(canvasWidth * point[0], canvasHeight * point[1]);
      } else {
        shapePath.moveTo(canvasWidth * point[0], canvasHeight * point[1]);
      }
    }
    if (this.closed) {
      shapePath.closePath();
    }
    this.path.addPath(shapePath);
  }
};

/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
PolylineOverlay.prototype.draw = function (context, canvasWidth, canvasHeight) {
  if (!this._isShown(this.name)) {
    return;
  }
  const color = this._getColor(this.name, this.label, this.index);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = LINE_WIDTH;
  context.stroke(this.path);
  if (this.isSelected()) {
    context.strokeStyle = DASH_COLOR;
    context.setLineDash([DASH_LENGTH]);
    context.stroke(this.path);
    context.strokeStyle = color;
    context.setLineDash([]);
  }
  if (this.filled) {
    context.globalAlpha = MASK_ALPHA;
    context.fill(this.path);
    context.globalAlpha = 1;
  }
};

PolylineOverlay.prototype.getPointInfo = function (x, y) {
  return {
    id: this.id,
    color: this._getColor(this.name, this.label, this.index),
    label: this.label,
    field: this.name,
    index: this.index,
    points: this.points.length(),
    closed: this.closed,
    filled: this.filled,
    target: this.target,
    attrs: this.attrs,
    type: "polyline",
  };
};

PolylineOverlay.prototype.getMouseDistance = function (x, y) {
  const distances = [];
  for (const shape of this.points) {
    for (let i = 0; i < shape.length - 1; i++) {
      distances.push(
        distanceFromLineSegment(
          x,
          y,
          this.w * shape[i][0],
          this.h * shape[i][1],
          this.w * shape[i + 1][0],
          this.h * shape[i + 1][1]
        )
      );
    }
    // acheck final line segment if closed
    if (this.closed) {
      distances.push(
        distanceFromLineSegment(
          x,
          y,
          this.w * shape[0][0],
          this.h * shape[0][1],
          this.w * shape[shape.length - 1][0],
          this.h * shape[shape.length - 1][1]
        )
      );
    }
  }
  return distances.min();
};

PolylineOverlay.prototype.containsPoint = function (x, y) {
  if (!this._isShown()) {
    return Overlay.CONTAINS_NONE;
  }
  const tolerance = LINE_WIDTH * 1.5;
  const minDistance = this.getMouseDistance(x, y);
  if (minDistance <= tolerance) {
    return Overlay.CONTAINS_BORDER;
  }

  if (this.closed || this.filled) {
    return this._context.isPointInPath(this.path, x, y)
      ? Overlay.CONTAINS_CONTENT
      : Overlay.CONTAINS_NONE;
  }
  return Overlay.CONTAINS_NONE;
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
 * @param {Renderer} renderer Associated renderer
 */
function ObjectOverlay(d, renderer) {
  if (!ObjectOverlay._tempMaskCanvas) {
    ObjectOverlay._tempMaskCanvas = document.createElement("canvas");
  }
  Overlay.call(this, renderer);

  this._cache_options = Object.assign({}, this.options);
  this.id = d._id;
  this.name = d.name;
  this.confidence = d.confidence;
  this.label = d.label;
  this._setupLabel();
  this.index = d.index;
  this.target = d.target;
  this.indexStr = "";
  if (this.index != null) {
    this.indexStr = `${this.index}`;
  }

  this.frame_number = d.frame_number;
  this.bounding_box = d.bounding_box;

  if (typeof d.attrs !== "undefined") {
    this._attrs = d.attrs.attrs;
  }
  this.attrText = null;
  this.attrTextWidth = -1;
  this.attrFontHeight = null;
  this.attrWidth = 0;
  this.attrHeight = 0;

  if (typeof d.mask === "string") {
    this.mask = deserialize(d.mask);
  }

  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;

  // this is the height of the header box into which we draw the label
  this.headerHeight = null;
  this.headerWidth = null;
  this.headerFontHeight = null;
  this.textPadder = null;
  this.labelTextWidth = null;
  this.indexTextWidth = null;
  this.labelIndexPadding = 51; // extra space forced between label and index in header
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
ObjectOverlay.prototype.setup = function (context, canvasWidth, canvasHeight) {
  this._parseAttrs();
  this.x = this.bounding_box.top_left.x * canvasWidth;
  this.y = this.bounding_box.top_left.y * canvasHeight;
  this.w =
    (this.bounding_box.bottom_right.x - this.bounding_box.top_left.x) *
    canvasWidth;
  this.h =
    (this.bounding_box.bottom_right.y - this.bounding_box.top_left.y) *
    canvasHeight;

  this.headerFontHeight = Math.min(20, 0.09 * canvasHeight);
  this.headerFontHeight = this.renderer.checkFontHeight(this.headerFontHeight);
  this.attrFontHeight = Math.min(18, 0.088 * canvasHeight);
  this.attrFontHeight = this.renderer.checkFontHeight(this.attrFontHeight);

  this.headerHeight = Math.min(26, 0.13 * canvasHeight);
  // this is *0.4 instead of / 2 because it looks better
  this.textPadder = (this.headerHeight - this.headerFontHeight) * 0.4;

  if (typeof context === "undefined") {
    return;
  }
  this._setupFontWidths(context, canvasWidth, canvasHeight);
};

/**
 * Checks whether the object has attributes
 * @return {boolean}
 */
ObjectOverlay.prototype.hasAttrs = function () {
  return this._attrs !== undefined;
};

ObjectOverlay.prototype._setupFontWidths = function (
  context,
  canvasWidth,
  canvasHeight
) {
  context.font = `${this.headerFontHeight}px Arial, sans-serif`;
  this.labelTextWidth = context.measureText(this.labelUpper).width;
  this.indexTextWidth = context.measureText(this.indexStr).width;

  this._setupAttrFont(context);
  this.attrFontWidth = context.measureText(this.attrText).width;

  if (
    this.labelTextWidth +
      this.indexTextWidth +
      this.labelIndexPadding +
      2 * this.textPadder <=
    this.w
  ) {
    this.headerWidth = this.w;
  } else {
    this.headerWidth =
      this.labelTextWidth +
      this.indexTextWidth +
      2 * this.textPadder +
      this.labelIndexPadding;
  }
  this._setupAttrBox(context);
};

ObjectOverlay.prototype._setupAttrFont = function (context) {
  this.attrFont = `${this.attrFontHeight}px Arial, sans-serif`;
  context.font = this.attrFont;
};

ObjectOverlay.prototype._setupAttrBox = function (context) {
  this._setupAttrFont(context);
  const wh = computeBBoxForTextOverlay(
    context,
    this.attrText,
    this.attrFontHeight,
    this.textPadder
  );
  this.attrWidth = wh.width;
  this.attrHeight = wh.height;
};

ObjectOverlay.prototype._setupLabel = function () {
  this.labelUpper = this.label.toUpperCase();
  if (this.options.showConfidence && !isNaN(this.confidence)) {
    this.labelUpper += ` (${Number(this.confidence).toFixed(2)})`;
  }
};

/**
 * Private method to parse the attributes objects provided at creation and set
 * them up as a renderable string for the overlay.
 *
 * @method _parseAttrs
 * @param {attrs} attrs
 */
ObjectOverlay.prototype._parseAttrs = function (attrs) {
  if (this.attrText === null) {
    this.attrText = "";
  }

  if (typeof attrs === "undefined") {
    if (typeof this._attrs === "undefined") {
      return;
    }
    attrs = this._attrs;
  }

  const sortedAttrs = attrs.sort(function (attr1, attr2) {
    return attr1.name.localeCompare(attr2.name);
  });

  if (!this.options.showAttrs) {
    this.attrText = "";
    return;
  }

  if (this.options.attrRenderMode === "attr-value") {
    this.attrText = sortedAttrs
      .map(function (attr) {
        const attrVal = String(attr.value).replace(/_/g, " ");
        const attrName = attr.name.replace(/_/g, " ");
        return `${attrName}: ${attrVal}`;
      })
      .join("\n");
  } else {
    this.attrText = sortedAttrs
      .map(function (attr) {
        return String(attr.value).replace(/_/g, " ");
      })
      .join(", ");
  }
};

/**
 * Basic rendering function for drawing the overlay instance.
 *
 * @method draw
 * @param {context} context
 * @param {int} canvasWidth
 * @param {int} canvasHeight
 */
ObjectOverlay.prototype.draw = function (context, canvasWidth, canvasHeight) {
  if (typeof context === "undefined") {
    return;
  }

  if (!this._isShown(this.name)) {
    return;
  }

  let optionsUpdated = false;
  if (!compareData(this._cache_options, this.options)) {
    this._cache_options = Object.assign({}, this.options);
    this._parseAttrs(this._attrs);
    this._setupAttrBox(context);
    optionsUpdated = true;
  }

  if (optionsUpdated || this.labelTextWidth === null) {
    this._setupLabel();
    this._setupFontWidths(context, canvasWidth, canvasHeight);
  }
  const color = this._getColor(this.name, this.label, this.index);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = LINE_WIDTH;
  context.strokeRect(this.x, this.y, this.w, this.h);

  if (this.isSelected()) {
    context.strokeStyle = DASH_COLOR;
    context.setLineDash([DASH_LENGTH]);
    context.strokeRect(this.x, this.y, this.w, this.h);
    context.strokeStyle = color;
    context.setLineDash([]);
  }

  if (this.mask) {
    if (_rawColorCache[color] === undefined) {
      const rawMaskColorComponents = new Uint8Array(
        context.getImageData(this.x, this.y, 1, 1).data.buffer
      );
      rawMaskColorComponents[3] = 255 * MASK_ALPHA;
      _rawColorCache[color] = new Uint32Array(rawMaskColorComponents.buffer)[0];
    }
    const rawMaskColor = _rawColorCache[color];

    const [maskHeight, maskWidth] = this.mask.shape;
    ensureCanvasSize(ObjectOverlay._tempMaskCanvas, {
      width: maskWidth,
      height: maskHeight,
    });

    const maskContext = ObjectOverlay._tempMaskCanvas.getContext("2d");
    const maskImage = maskContext.createImageData(maskWidth, maskHeight);
    const maskImageRaw = new Uint32Array(maskImage.data.buffer);

    for (let i = 0; i < this.mask.data.length; i++) {
      if (this.mask.data[i]) {
        maskImageRaw[i] = rawMaskColor;
      }
    }
    maskContext.putImageData(maskImage, 0, 0);
    context.imageSmoothingEnabled = this.renderer.overlayOptions.smoothMasks;
    context.drawImage(
      ObjectOverlay._tempMaskCanvas,
      0,
      0,
      maskWidth,
      maskHeight,
      this.x,
      this.y,
      this.w,
      this.h
    );
  }

  if (!this.renderer.player._boolThumbnailMode) {
    // fill and stroke to account for line thickness variation
    context.strokeRect(
      this.x,
      this.y - this.headerHeight,
      this.headerWidth,
      this.headerHeight
    );
    context.fillRect(
      this.x,
      this.y - this.headerHeight,
      this.headerWidth,
      this.headerHeight
    );

    context.font = `${this.headerFontHeight}px Arial, sans-serif`;
    context.fillStyle = colorGenerator.white;
    context.fillText(
      this.labelUpper,
      this.x + this.textPadder,
      this.y - this.textPadder
    );

    context.fillText(
      this.indexStr,
      this.x + this.headerWidth - 4 * this.textPadder - this.indexTextWidth,
      this.y - this.textPadder
    );

    if (!this.options.attrsOnlyOnClick || this.hasFocus()) {
      this._setupAttrFont(context);
      if (
        typeof this.attrFontWidth === "undefined" ||
        this.attrFontWidth === null
      ) {
        this.attrFontWidth = context.measureText(this.attrText).width;
        this._setupAttrBox(context);
      }
      if (this.options.attrRenderBox) {
        context.fillStyle = this.renderer.metadataOverlayBGColor;
        context.fillRect(
          this.x + this.textPadder,
          this.y + this.textPadder,
          this.attrWidth,
          this.attrHeight
        );
      }
      const lines = this.attrText.split("\n");
      context.fillStyle = colorGenerator.white;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        context.fillText(
          line,
          this.x + this.textPadder,
          this.y +
            3 +
            this.attrFontHeight +
            this.textPadder +
            this.attrFontHeight * i
        );
      }
    }
  }
};

ObjectOverlay.prototype.getPointInfo = function (x, y) {
  const left = this.bounding_box.top_left.x;
  const width = this.bounding_box.bottom_right.x - left;
  const top = this.bounding_box.top_left.y;
  const height = this.bounding_box.bottom_right.y - top;
  return {
    id: this.id,
    color: this._getColor(this.name, this.label, this.index),
    label: this.label,
    field: this.name,
    index: this.index,
    confidence: this.confidence,
    target: this.target,
    attrs: this.attrs,
    top,
    left,
    height,
    width,
    type: "detection",
  };
};

ObjectOverlay.prototype._inHeader = function (x, y) {
  return inRect(
    x,
    y,
    this.x - LINE_WIDTH / 2,
    this.y - this.headerHeight - LINE_WIDTH / 2,
    this.headerWidth + LINE_WIDTH,
    this.headerHeight + LINE_WIDTH
  );
};

ObjectObject.prototype.getMouseDistance = function (x, y) {
  if (this._inHeader(x, y)) {
    return 0;
  }
  const distances = [
    distanceFromLineSegment(x, y, this.x, this.y, this.x + this.w, this.y),
    distanceFromLineSegment(x, y, this.x, this.y, this.x, this.y + this.h),
    distanceFromLineSegment(
      x,
      y,
      this.x + this.w,
      this.y + this.h,
      this.x + this.w,
      this.y
    ),
    distanceFromLineSegment(
      x,
      y,
      this.x + this.w,
      this.y + this.h,
      this.x,
      this.y + this.h
    ),
  ];
  return distances.min();
};

ObjectOverlay.prototype.containsPoint = function (x, y) {
  if (!this._isShown()) {
    return Overlay.CONTAINS_NONE;
  }
  // the header takes up an extra LINE_WIDTH / 2 on each side due to its border
  if (this._inHeader(x, y)) {
    return Overlay.CONTAINS_BORDER;
  }
  // the distance from the box contents to the edge of the line segment is
  // LINE_WIDTH / 2, so this gives a tolerance of an extra LINE_WIDTH on either
  // side of the border
  const tolerance = LINE_WIDTH * 1.5;
  if (
    distanceFromLineSegment(x, y, this.x, this.y, this.x + this.w, this.y) <=
      tolerance ||
    distanceFromLineSegment(x, y, this.x, this.y, this.x, this.y + this.h) <=
      tolerance ||
    distanceFromLineSegment(
      x,
      y,
      this.x + this.w,
      this.y + this.h,
      this.x + this.w,
      this.y
    ) <= tolerance ||
    distanceFromLineSegment(
      x,
      y,
      this.x + this.w,
      this.y + this.h,
      this.x,
      this.y + this.h
    ) <= tolerance
  ) {
    return Overlay.CONTAINS_BORDER;
  }
  if (inRect(x, y, this.x, this.y, this.w, this.h)) {
    return Overlay.CONTAINS_CONTENT;
  }
};

/**
 * Resizes a canvas so it is at least the specified size.
 *
 * @param {Canvas} canvas
 * @param {number} width
 * @param {number} height
 */
function ensureCanvasSize(canvas, { width, height }) {
  if (canvas.width < width) {
    canvas.width = width;
  }
  if (canvas.height < height) {
    canvas.height = height;
  }
}
