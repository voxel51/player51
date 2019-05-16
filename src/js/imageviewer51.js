/**
 * @module imageviewer51.js
 * @summary Defines a client-side media player that can display images and render
 * metadata overlayed atop them.
 *
 * @desc ImageViewer51 is a javascript based image displayer that can also
 * render available annotations and markup overlayed on top of the
 * image.
 *
 * Copyright 2018-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */


import { ObjectOverlay } from "./overlay.js";

 // ES6 module export
 export { ImageViewer51 };


/**
 * ImagePlayer51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param media is an object that has "src" and "type" attributes.
 * type must be in the format image/<format>
 * ex. type: "image/jpg"
 * @param overlay is data that should be overlayed on the image.  Overlay is a path to a
 * file of eta.core.image.ImageLabels format
 */
function ImageViewer51(media, overlay) {

    this.media = media;
    this.frameOverlay = []; // will be used to store the labels

    this._boolForcedMax = false;
    this._boolForcedSize = false;

    this._isRendered = false;
    this._isSizePrepared = false;
    this._isImageLoaded = false;

    this._overlayURL = overlay;
}


/**
 * @member annotate
 *
 * Request resources from the server and then draw objects onto image
 *
 */
ImageViewer51.prototype.annotate = function (overlayPath) {
    if (!this._isRendered || !this._isSizePrepared) {
        console.log("Player51 WARN: Tried to annotate, hasn't been rendered yet.")
        return;
    }

    let self = this;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            var overlayData = JSON.parse(this.responseText);
            self.prepareOverlay(overlayData);
            self.draw();
        }
    };
    xmlhttp.open("GET", overlayPath, true);
    xmlhttp.send();
}


/**
 * @member render
 * Render a new viewer for this image within the DOM element provided
 *
 * Note that the viewer parts inherit certain properties from the parent div,
 * such as padding.
 *
 * @param parentElement String id of the parentElement or actual Div object.
 */
ImageViewer51.prototype.render = function(parentElement) {
    this.parent = undefined;
    if (typeof parentElement === "string") {
        this.parent = document.getElementById(parentElement);
    } else {
        this.parent = parentElement;
    }

    // Load image
    this.eleDivImage = document.createElement("div");
    this.eleDivImage.className = "p51-contained-image";
    this.eleImage = document.createElement("img");
    this.eleImage.className = "p51-contained-image";
    this.eleImage.setAttribute("src", this.media.src);
    this.eleImage.setAttribute("type", this.media.type);
    this.eleDivImage.appendChild(this.eleImage);
    this.parent.appendChild(this.eleDivImage);

    // Load canvas
    this.eleDivCanvas = document.createElement("div");
	this.eleDivCanvas.className = "p51-contained-canvas";
	this.eleCanvas = document.createElement("canvas");
	this.eleCanvas.className = "p51-contained-canvas";
	this.eleDivCanvas.appendChild(this.eleCanvas);
	this.parent.appendChild(this.eleDivCanvas);

    this._isRendered = true;

    let self = this;
    // Update size
    this.eleImage.addEventListener("load", function() {
        self._isImageLoaded = true;
        self.updateSizeAndPadding();
        self.annotate(self._overlayURL);
    });
}


/**
 * @member forceSize
 *
 * Forces a manual size to the video and canvas.
 *
 * Must be called before render; will not work dynamically.  Will not actually
 * be effected until render is called (and the loadedmetadata handler happens)
 */
ImageViewer51.prototype.forceSize = function (width, height) {
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
ImageViewer51.prototype.forceMax = function (width, height) {
	if (this._boolForcedSize) {
		console.log("Warning!  Both forceSize and forcedMax were called.");
		console.log("Warning!  forceSize wins.");
	}
	this._boolForcedMax = true;
};


/**
 * @member draw
 *
 * Draws objects onto the canvas
 *
 * Requires overlay to be prepared.
 */
ImageViewer51.prototype.draw = function () {
    let context = this.setupCanvasContext();
    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (let len = this.frameOverlay.length, i = 0; i < len; i++) {
        let obj = this.frameOverlay[i];
        obj.draw(context, this.canvasWidth, this.canvasHeight);
    }
}


/**
 * @member prepareOverlay
 *
 * Callback for asynchronous retrieval of a json file.
 *
 * The overlay is represented as a dictonary of objects in eta.core.image.ImageLabels format
 *
 */
ImageViewer51.prototype.prepareOverlay = function (rawjson) {
    let context = this.setupCanvasContext();
    let objects = rawjson.objects.objects;
    for (let len = objects.length, i = 0; i < len; i++) {
		let o = new ObjectOverlay(objects[i], this);
        o.setup(context, this.canvasWidth, this.canvasHeight);
        this.frameOverlay.push(o);
	}
}


/**
 * @member checkFontHeight
 */
ImageViewer51.prototype.checkFontHeight = function (h) {
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
ImageViewer51.prototype.setupCanvasContext = function () {
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
ImageViewer51.prototype.updateSizeAndPadding = function () {
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
ImageViewer51.prototype.computeWidthAndHeight = function () {
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
ImageViewer51.prototype.resizeCanvas = function() {
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
