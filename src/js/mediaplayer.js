/**
 * @module mediaplayer.js
 * @summary Defines a general class that helps with rendering players for
 * the different supported media types.
 *
 *
 * @desc MediaPlayer.js is a javascript class that helps child media players, ImageViewer51
 * and VideoPlayer51 request and render properly.
 *
 * Copyright 2018-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */


import { ObjectOverlay, FrameAttributesOverlay } from './overlay.js';

// ES6 module export
export { MediaPlayer, ObjectOverlay, FrameAttributesOverlay };


/**
 * MediaPlayer Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 *
 */
function MediaPlayer() {
	this._boolForcedMax = false;
    this._boolForcedSize = false;
}


/**
 * @member forceSize
 *
 * Forces a manual size to the video or image and canvas.
 *
 * Must be called before render; will not work dynamically.  Will not actually
 * be effected until render is called (and the loadedmetadata handler happens)
 */
MediaPlayer.prototype.forceSize = function (width, height) {
	if (this._boolForcedMax) {
		console.log("Warning!  Both forceSize and forcedMax were called.");
		console.log("Warning!  forceSize wins.");
	}
	this._boolForcedSize = true;
	this._forcedWidth = width;
	this._forcedHeight = height;
};


/**
 * @member forceMax
 *
 * Forces the video to max to native video resolution up to 720p
 *
 * Must be called before render; will not work dynamically.  Will not actually
 * be effected until render is called (and the loadedmetadata handler happens)
 */
MediaPlayer.prototype.forceMax = function (width, height) {
	if (this._boolForcedSize) {
		console.log("Warning!  Both forceSize and forcedMax were called.");
		console.log("Warning!  forceSize wins.");
	}
	this._boolForcedMax = true;
};


/**
 * @member checkFontHeight
 */
MediaPlayer.prototype.checkFontHeight = function (h) {
	if (h == 0) {
		console.log("PLAYER51 WARN: fontheight 0");
		return 10;
	}
	return h;
};


/**
 * @member setupCanvasContext
 *
 * Set up the canvas context for default styles.
 */
MediaPlayer.prototype.setupCanvasContext = function () {
	if (!this._isRendered) {
		console.log("WARN: trying to set up canvas context but player not rendered");
		return;
	}
	let canvasContext = this.eleCanvas.getContext("2d");
	canvasContext.strokeStyle = "#fff";
	canvasContext.fillStyle = "#fff";
	canvasContext.lineWidth = 3;
	canvasContext.font = "14px sans-serif";
	// easier for setting offsets
	canvasContext.textBaseline = "bottom";
	return canvasContext;
};


/**
 * @member updateSizeAndPadding
 *
 * This method updates the size and padding based on the configuration and the
 * image.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.updateSizeAndPadding = function () {
    this.computeWidthAndHeight();
    this.eleImage.setAttribute("width", this.width);
    this.eleImage.setAttribute("height", this.height);

    // Resize canvas
    this.resizeCanvas();

    this._isSizePrepared = true;
}


/**
 * @member computeWidthAndHeight
 * This method is a helper function that computes necessary padding and width/height.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.computeWidthAndHeight = function () {
    if (!this._isRendered) {
     console.log("WARN: Player51 trying to update size, but it is not rendered.");
     return;
    }

    this.paddingLeft = window.getComputedStyle(this.parent, null).getPropertyValue("padding-left");
    this.paddingRight = window.getComputedStyle(this.parent, null).getPropertyValue("padding-right");
    this.paddingTop = window.getComputedStyle(this.parent, null).getPropertyValue("padding-top");
    this.paddingBottom = window.getComputedStyle(this.parent, null).getPropertyValue("padding-bottom");
    this.paddingLeftN = parseInt(this.paddingLeft.substr(0, this.paddingLeft.length - 2));
    this.paddingRightN = parseInt(this.paddingRight.substr(0, this.paddingRight.length - 2));
    this.paddingTopN = parseInt(this.paddingTop.substr(0, this.paddingTop.length - 2));
    this.paddingBottomN = parseInt(this.paddingBottom.substr(0, this.paddingBottom.length - 2));

    // We cannot just take the window dimensions because the aspect ratio of
    // the image must be preserved.
    // Preservation is based on maintaining the height of the parent.

    // Try to maintain height of container first.  If fails, then set width.
    // Fails means that the width of the video is too wide for the container.
    this.height = this.parent.offsetHeight - this.paddingTopN - this.paddingBottomN;
    this.width = this.height * this.eleImage.width / this.eleImage.height;

    if (this.width > this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN) {
     this.width = this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN;
     this.height = this.width * this.eleImage.height / this.eleImage.width;
    }

    // if the caller wants to maximize to native pixel resolution
    if (this._boolForcedMax) {
        this.width = this.eleImage.width;
        this.height = this.eleImage.height;

        if (this.width >= 1440) {
            this.width = 1280;
            this.height = 720;
        }
    }

    // height priority in sizing is a forced size.
    if (this._boolForcedSize) {
        this.width = this._forcedWidth;
        this.height = this._forcedHeight;
    }
}


/**
 * @member resizeCanvas
 * This method is a helper function that aligns canvas dimensions with image dimensions.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.resizeCanvas = function() {
    let canvasWidth = 1280;
    let canvasHeight = canvasWidth * this.eleImage.height / this.eleImage.width;
    this.eleCanvas.setAttribute("width", canvasWidth);
    this.eleCanvas.setAttribute("height", canvasHeight);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.canvasMultiplier = canvasWidth / this.width;

    this.parent.setAttribute("width", this.width);
    this.parent.setAttribute("height", this.height);

    this.parent.style.width = (this.width + "px");
    this.parent.style.height = (this.height + "px");

    this.eleDivImage.style.width = (this.width + "px");
    this.eleDivImage.style.height = (this.height + "px");
    this.eleDivImage.style.paddingLeft = this.paddingLeft;
    this.eleDivImage.style.paddingRight = this.paddingRight;
    this.eleDivImage.style.paddingTop = this.paddingTop;
    this.eleDivImage.style.paddingBottom = this.paddingBottom;

    this.eleImage.style.width = (this.width + "px");
    this.eleImage.style.height = (this.height + "px");
    this.eleImage.style.paddingLeft = this.paddingLeft;
    this.eleImage.style.paddingRight = this.paddingRight;
    this.eleImage.style.paddingTop = this.paddingTop;
    this.eleImage.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = (this.width + "px");
    this.eleDivCanvas.style.height = (this.height + "px");
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = (this.width + "px");
    this.eleCanvas.style.height = (this.height + "px");
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;
}
