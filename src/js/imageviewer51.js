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


import { MediaPlayer, ObjectOverlay, FrameAttributesOverlay } from "./mediaplayer.js";

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
    MediaPlayer.call(this, "image");

    this.media = media;
    this.frameOverlay = []; // will be used to store the labels

    this._isImageLoaded = false;
    this._overlayURL = overlay;
}
ImageViewer51.prototype = Object.create(MediaPlayer.prototype);
ImageViewer51.prototype.constructor = ImageViewer51;


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
    this.staticRender(parentElement);

    let self = this;
    // Update size
    this.eleImage.addEventListener("load", function() {
        self._isImageLoaded = true;
        self.updateSizeAndPadding();
        self.annotate(self._overlayURL);
    });
}


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
