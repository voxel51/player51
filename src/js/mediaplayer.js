/**
 * @module mediaplayer.js
 * @summary Defines a general class that helps with rendering players for
 * the different supported media types.
 *
 * @desc MediaPlayer.js is a javascript class that helps child media players, ImageViewer51
 * and VideoPlayer51 request and render properly.
 *
 * Copyright 2018-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */


import { ObjectOverlay, FrameAttributesOverlay, ColorGenerator } from './overlay.js';

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
function MediaPlayer(mediaType) {
    this.colorGenerator = new ColorGenerator();
    this.mediaElement = null;
    this.mediaType = mediaType;

    // Content Attributes
    this.canvasWidth = null;
    this.canvasHeight = null;

    // Player State Attributes
    this._isRendered = false;
    this._isSizePrepared = false;

    // Player Prerender Attributes
    this._boolForcedMax = false;
    this._boolForcedSize = false;
    this._forcedWidth = -1;  // set via `forceSize()`
    this._forcedHeight = -1;  // set via `forceSize()`
    this._boolThumbnailMode = false;
    this._thumbnailClickAction = undefined;
    this._boolHasPoster = false;   // set via `poster()`
    this._posterURL = "";   // set via `poster()`

    // Player View Attributes
    this.width = -1;
	this.height = -1;
	this.paddingLeft = 0;
	this.paddingRight = 0;
	this.paddingTop = 0;
	this.paddingBottom = 0;
	this._boolBorderBox = false;  // is the container a border-box?
    this.metadataOverlayBGColor = "hsla(210, 20%, 10%, 0.8)";
}


/**
 *
 * @member poster
 *
 * Define abstract function poster to be implemented in subclasses
 */
MediaPlayer.prototype.poster = function(url) {
}


/**
 *
 * @member loop
 *
 * Define abstract function loop to be implemented in subclasses
 */
MediaPlayer.prototype.loop = function() {
}


/**
 *
 * @member autoplay
 *
 * Define abstract function autoplay to be implemented in subclasses
 */
MediaPlayer.prototype.autoplay = function() {
}


/**
 *
 * @member resetToFragment
 *
 * Define abstract function resetToFragment to be implemented in subclasses
 */
MediaPlayer.prototype.resetToFragment = function() {
}


/**
 *
 * @member thumbnailMode
 *
 * This changes the behaviour of the media player in the following ways.
 *
 * General Functionality
 * 1. The caller can associated an action with clicking anywhere on the media.
 *
 * Mode: ImageViewer51
 * 1. Annotations are drawn over mouse-over.
 *
 * Mode: VideoPlayer51
 * 1. Video controls are never available.
 * 2. The video plays over mouse-over.
 * 3. The video is set to loop.
 * 4. Less information is visualized.
 *
 * Caller probably wants to set the size of the media via forceSize()
 *
 * Args:
 * action: (optional) a callback function to associate with any click to the media.
 */
MediaPlayer.prototype.thumbnailMode = function(action) {
    this._boolThumbnailMode = true;
    this._thumbnailClickAction = action;

    if (this.mediaType == "video") {
        this.loop(true);
    }
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
 * Forces the video or image to max to native video resolution up to 720p
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
 * @member staticRender
 *
 * Set up the basic rendering without UI controls
 *
 * Creates media and canvas, handles part of the positioning
 */
MediaPlayer.prototype.staticRender = function (parentElement) {
    this.parent = undefined;
	if (typeof parentElement === "string") {
		this.parent = document.getElementById(parentElement);
	} else {
		this.parent = parentElement;
	}

    let cBS = window.getComputedStyle(this.parent, null).getPropertyValue("box-sizing");
    this._boolBorderBox = false;
    if (cBS === "border-box") {
        this._boolBorderBox = true;
    }

    // Load media
    if (this.mediaType === "image") {
        this.eleDivImage = document.createElement("div");
        this.eleDivImage.className = "p51-contained-image";
        this.eleImage = document.createElement("img");
        this.eleImage.className = "p51-contained-image";
        this.eleImage.setAttribute("src", this.media.src);
        this.eleImage.setAttribute("type", this.media.type);
        this.eleDivImage.appendChild(this.eleImage);
        this.parent.appendChild(this.eleDivImage);
        this.mediaElement = this.eleImage;
        this.mediaDiv = this.eleDivImage;
    } else if (this.mediaType === "video") {
        this.eleDivVideo = document.createElement("div");
    	this.eleDivVideo.className = "p51-contained-video";
    	this.eleVideo = document.createElement("video");
    	this.eleVideo.className = "p51-contained-video";
    	this.eleVideo.setAttribute("preload", "metadata");
    	this.eleVideo.muted = true;  // this works whereas .setAttribute does not

        this.eleVideoSource = document.createElement("source");
    	this.eleVideoSource.setAttribute("src", this.media.src);
    	this.eleVideoSource.setAttribute("type", this.media.type);
    	this.eleVideo.appendChild(this.eleVideoSource);
    	this.eleDivVideo.appendChild(this.eleVideo);
    	this.parent.appendChild(this.eleDivVideo);

        // Video controls
        this.eleDivVideoControls = document.createElement("div");
    	this.eleDivVideoControls.className = "p51-video-controls";
    	this.elePlayPauseButton = document.createElement("button");
    	this.elePlayPauseButton.setAttribute("type", "button");
    	this.elePlayPauseButton.className = "p51-play-pause";
    	this.elePlayPauseButton.innerHTML = "Play";
    	this.eleSeekBar = document.createElement("input");
    	this.eleSeekBar.setAttribute("type", "range");
    	this.eleSeekBar.setAttribute("value", "0");
    	this.eleSeekBar.className = "p51-seek-bar";
    	this.eleDivVideoControls.appendChild(this.elePlayPauseButton);
    	this.eleDivVideoControls.appendChild(this.eleSeekBar);
    	this.parent.appendChild(this.eleDivVideoControls);
        this.mediaElement = this.eleVideo;
        this.mediaDiv = this.eleDivVideo;
    }

    // Load canvas
    this.eleDivCanvas = document.createElement("div");
    this.eleDivCanvas.className = "p51-contained-canvas";
    this.eleCanvas = document.createElement("canvas");
    this.eleCanvas.className = "p51-contained-canvas";
    this.eleDivCanvas.appendChild(this.eleCanvas);
    this.parent.appendChild(this.eleDivCanvas);

    this._isRendered = true;
}


/**
 * @member dynamicRender
 *
 * Setup shared UI controls
 *
 */
MediaPlayer.prototype.dynamicRender = function () {
    if (typeof this._thumbnailClickAction !== "undefined") {
		this.parent.addEventListener("click", this._thumbnailClickAction);
	}
}


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
 * This method updates the size and padding based on the configuration.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.updateSizeAndPadding = function () {
    this.handleWidthAndHeight();
    // Resize canvas
    this.resizeCanvas();
    this._isSizePrepared = true;
}


/**
 * @member handleWidthAndHeight
 * This method is a helper function that computes necessary padding and width/height and sets
 * the media element.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.handleWidthAndHeight = function () {
    if (!this._isRendered) {
        console.log("WARN: Player51 trying to update size, but it is not rendered.");
        return;
    }

    if (this.mediaType === "image") {
        this.mediaHeight = this.mediaElement.height;
        this.mediaWidth = this.mediaElement.width;
    } else if (this.mediaType === "video") {
        this.mediaHeight = this.mediaElement.videoHeight;
        this.mediaWidth = this.mediaElement.videoWidth;
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
    this.width = this.height * this.mediaWidth / this.mediaHeight;

    if (this.width > this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN) {
     this.width = this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN;
     this.height = this.width * this.mediaHeight / this.mediaWidth;
    }

    // if the caller wants to maximize to native pixel resolution
    if (this._boolForcedMax) {
        this.width = this.mediaWidth;
        this.height = this.mediaHeight;

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

    // Set width and height
    this.mediaElement.setAttribute("width", this.width);
    this.mediaElement.setAttribute("height", this.height);
}


/**
 * @member resizeCanvas
 * This method is a helper function that aligns canvas dimensions with image dimensions.
 * Requires that the viewer is rendered.
 */
MediaPlayer.prototype.resizeCanvas = function() {
    // NOTE:: Legacy
    // Current functionality is to set a fixed size canvas so that we can
	// guarantee of consistent L&F for the overlays.
	// But, the right way to do this is probably define an abstraction to the
	// canvas size and then make the canvas the closest match to the actual
	// display size so that we do not kill so much member in creating the video
	// player.
	//this.eleCanvas.setAttribute("width", this.width);
	//this.eleCanvas.setAttribute("height", this.height);
	//this.canvasWidth = this.width;
	//this.canvasHeight = this.height;

    let canvasWidth = 1280;
	let canvasHeight = canvasWidth * this.mediaHeight / this.mediaWidth;
	this.eleCanvas.setAttribute("width", canvasWidth);
	this.eleCanvas.setAttribute("height", canvasHeight);
	this.canvasWidth = canvasWidth;
	this.canvasHeight = canvasHeight;
	this.canvasMultiplier = canvasWidth / this.width;

	this.parent.setAttribute("width", this.width);
	this.parent.setAttribute("height", this.height);

    if (this._boolBorderBox) {
        let widthstr = `${this.width + this.paddingLeftN + this.paddingRightN}px`;
        let heightstr = `${this.height + this.paddingTopN + this.paddingBottomN}px`;

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

        if (this.mediaType === "video") {
            // need to size the controls too.
            // The controls are tuned using margins when padding exists.
            this.eleDivVideoControls.style.width = (this.width + "px");
            this.eleDivVideoControls.style.height = (
                Math.min(60 + this.paddingBottomN, 0.1 * this.height + this.paddingBottomN) + "px"
            );

            // controls have 0 padding because we want them only to show
            // on the video, this impacts their left location too.
            this.eleDivVideoControls.style.paddingLeft = 0;
            this.eleDivVideoControls.style.paddingRight = 0;
            this.eleDivVideoControls.style.bottom = (this.paddingBottomN - 2) + "px";
            this.eleDivVideoControls.style.left = this.paddingLeft;
        }
    } else {
        this.parent.style.width = (this.width + "px");
        this.parent.style.height = (this.height + "px");

        this.mediaDiv.style.width = (this.width + "px");
        this.mediaDiv.style.height = (this.height + "px");
        this.mediaDiv.style.paddingLeft = this.paddingLeft;
        this.mediaDiv.style.paddingRight = this.paddingRight;
        this.mediaDiv.style.paddingTop = this.paddingTop;
        this.mediaDiv.style.paddingBottom = this.paddingBottom;

        this.mediaElement.style.width = (this.width + "px");
        this.mediaElement.style.height = (this.height + "px");
        this.mediaElement.style.paddingLeft = this.paddingLeft;
        this.mediaElement.style.paddingRight = this.paddingRight;
        this.mediaElement.style.paddingTop = this.paddingTop;
        this.mediaElement.style.paddingBottom = this.paddingBottom;

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

        if (this.mediaType === "video") {
            // need to size the controls too.
            // The controls are tuned using margins when padding exists.
            this.eleDivVideoControls.style.width = (this.width + "px");
            this.eleDivVideoControls.style.height = (
                Math.min(80, 0.1 * this.height) + "px"
            );
            // controls have 0 padding because we want them only to show
            // on the video, this impacts their left location too.
            this.eleDivVideoControls.style.paddingLeft = 0;
            this.eleDivVideoControls.style.paddingRight = 0;
            this.eleDivVideoControls.style.bottom = this.paddingBottom;
            this.eleDivVideoControls.style.left = this.paddingLeft;
        }
    }
}
