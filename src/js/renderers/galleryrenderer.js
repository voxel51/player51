/**
 * @module galleryrenderer.js
 * @summary Renders an image gallery into the parentElement, handles overlay
 * and produces the end output.
 *
 * @desc GalleryRenderer is a class that controls the creation and viewing of
 * galleryviewer.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer,
} from '../renderer.js';

export {
  GalleryRenderer,
};


/**
 * GalleryRenderer Class Definition
 *
 * INHERITS: Renderer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in format gallery/<format>
 * ex. type: "gallery/jpg"
 * @param {string} overlay is data that should be overlayed on the images.
 */
function GalleryRenderer(media, overlay) {
  Renderer.call(this, media, overlay);
  this._frameNumber = 1;
  this._currentIndex = 0;
  this._currentKey = null;
  // Data structures
  this.imageFiles = {};
  this.fileIndex = [];
  this._currentImageURL = null;
  // Loading state attributes
  this._isImageInserted = false;
  // Initialization
  this.openContents();
}
GalleryRenderer.prototype = Object.create(Renderer.prototype);
GalleryRenderer.prototype.constructor = GalleryRenderer;


/**
 * Initializes an image gallery in parent
 *
 * @member initPlayer
 * @required setParentandMedia called beforehand
 */
GalleryRenderer.prototype.initPlayer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivImage = document.createElement('div');
  this.eleDivImage.className = 'p51-contained-image';
  this.parent.appendChild(this.eleDivImage);
  this.eleImage = document.createElement('img');
  this.eleImage.className = 'p51-contained-image';
  this.eleDivImage.appendChild(this.eleImage);

  // Gallery controls
  this.eleDivRightNav = document.createElement('a');
  this.eleDivRightNav.className = 'p51-gallery-right-nav';
  this.eleDivRightNav.text = '>';
  this.eleDivLeftNav = document.createElement('a');
  this.eleDivLeftNav.className = 'p51-gallery-left-nav';
  this.eleDivLeftNav.text = '<';
  this.parent.appendChild(this.eleDivRightNav);
  this.parent.appendChild(this.eleDivLeftNav);
  this.mediaElement = this.eleImage;
  this.mediaDiv = this.eleDivImage;
  this.initCanvas();
};


/**
 * This loads controls for galleryviewer
 *
 * @member initPlayerControls
 * @required player to be set
 */
GalleryRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();

  const self = this;
  this.eleDivRightNav.addEventListener('click', function() {
    if (self._isImageInserted) {
      const limit = self.fileIndex.length - 1;
      if (self._currentIndex < limit) {
        self._currentIndex++;
        self.insertImage(self._currentIndex);
      }
    }
  });

  this.eleDivLeftNav.addEventListener('click', function() {
    if (self._isImageInserted) {
      const limit = 0;
      if (self._currentIndex > limit) {
        self._currentIndex--;
        self.insertImage(self._currentIndex);
      }
    }
  });

  this.eleImage.addEventListener('load', function() {
    self.updateSizeAndPaddingByParent();
    if (self._currentKey) {
      self.prepareOverlay(self._currentKey);
      self.processFrame();
    }
  });
};


/**
 * This determines the dimensions of the media
 *
 * @member determineMediaDimensions
 * @required initPlayer() to be called
 */
GalleryRenderer.prototype.determineMediaDimensions = function() {
  this.mediaHeight = this.mediaElement.height;
  this.mediaWidth = this.mediaElement.width;
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
GalleryRenderer.prototype.updateFromLoadingState = function() {
  if (this._isRendered && !this._boolZipReady) {
    if (this._boolBadZip && this.player._boolNotFound) {
      this.eleImage.setAttribute('src', this.player._notFoundPosterURL);
    } else if (!this._boolBadZip && this.player._boolHasPoster) {
      this.eleImage.setAttribute('src', this.player._loadingPosterURL);
    }
  }
  if (this._boolZipReady && this._isRendered) {
    // Able to load an image into gallery
    if (!this._isImageInserted) {
      this.insertImage(this._currentIndex);
    }
  }
  // Overlay controller
  if ((this._overlayData !== null) && (this._overlayURL !== null)) {
    this._overlayCanBePrepared = true;
  }
};


/**
 * Generate a string that represents the state.
 *
 * @member state
 * @return {dictionary} state
 */
GalleryRenderer.prototype.state = function() {
  return `
GalleryViewer State Information:
currentIndex: ${this._currentIndex}
boolZipReady: ${this._boolZipReady}
isImageInserted: ${this._isImageInserted}
isRendered:   ${this._isRendered}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isOverlayPrepared: ${this._isOverlayPrepared}
`;
};


/**
 * Draws custom case objects onto a frame
 *
 * @member customDraw
 * @param {context} context
 */
GalleryRenderer.prototype.customDraw = function(context) {
};


/**
 * Loads blob data into datastructures
 *
 * @member handleBlob
 * @param {blob} blob
 * @param {path} filename
 */
GalleryRenderer.prototype.handleBlob = function(blob, filename) {
  const tmp = filename.split('/');
  const filenametruncated = tmp.slice(-1)[0];
  this.imageFiles[filenametruncated] = blob;
  this.fileIndex.push(filenametruncated);
  this._boolZipReady = true;
  this.updateFromLoadingState();
};


/**
 * This function prepares the overlay based on a specific filename.
 * Overrides method in renderer.js
 *
 * @member prepareOverlay
 * @param {string} filename
 * @required imageObj to be loaded
 */
GalleryRenderer.prototype.prepareOverlay = function(filename) {
  if (!this._overlayCanBePrepared) {
    return;
  }

  let entry = {};

  if (typeof(this._overlayData.images) !== 'undefined') {
    const frameKeys = Object.keys(this._overlayData.images);
    for (const key in frameKeys) {
      if (this._overlayData.images[key].filename === filename) {
        entry = this._overlayData.images[key];
        break;
      }
    }
  } else if (typeof(this._overlayData.frames) !== 'undefined') {
    const frameKeys = Object.keys(this._overlayData.frames);
    const frameNumber = parseInt(filename.replace(/[^0-9]/g, ''));
    for (const key in frameKeys) {
      if (parseInt(key) === frameNumber) {
        entry = this._overlayData.frames[key];
        break;
      }
    }
  }

  const context = this.setupCanvasContext();
  if (typeof(entry.objects) !== 'undefined') {
    this._prepareOverlay_auxFormat1Objects(context, entry.objects, true);
  }

  if (typeof(entry.attrs) !== 'undefined') {
    this._prepareOverlay_auxAttributes(context, entry.attrs);
  }
  this._isOverlayPrepared = true;
  this._isReadyProcessFrames = true;
};


/**
 * Insert image into gallery
 *
 * @member insertImage
 * @param {int} index
 */
GalleryRenderer.prototype.insertImage = function(index) {
  this.clearState();
  const key = this.fileIndex[index];
  this._currentKey = key;
  const fileBlob = this.imageFiles[key];
  const tmpURL = URL.createObjectURL(fileBlob);
  this._currentImageURL = tmpURL;
  this.eleImage.setAttribute('src', this._currentImageURL);
  this.eleImage.setAttribute('type', this.getFileExtension(key));
  this._isImageInserted = true;
};


/**
 * This function clears the state in preparation for the next image
 * in the gallery.
 *
 * @member clearState
 */
GalleryRenderer.prototype.clearState = function() {
  this._isOverlayPrepared = false;
  this._isReadyProcessFrames = false;
  URL.revokeObjectURL(this._currentImageURL);
  // Clear canvas
  for (const key in this.frameOverlay) {
    if (key) {
      delete this.frameOverlay[key];
    }
  }
  const context = this.setupCanvasContext();
  context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
};
