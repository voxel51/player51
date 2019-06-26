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
import {
  ZipLibrary,
} from '../zipreader/zip.js';

// ES6 module export
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
  // Data structures
  this.imageFiles = {};
  this.fileIndex = [];
  this.reader = new ZipLibrary();
  this.reader.workerScriptsPath = '../src/js/zipreader/';
  // Loading state attributes
  this._isGalleryReady = false;
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

  // Gallery controls
  this.eleDivRightNav = document.createElement('a');
  this.eleDivRightNav.className = 'p51-gallery-right-nav';
  this.eleDivRightNav.text = '>';
  this.eleDivLeftNav = document.createElement('a');
  this.eleDivLeftNav.className = 'p51-gallery-left-nav';
  this.eleDivLeftNav.text = '<';
  this.parent.appendChild(this.eleDivRightNav);
  this.parent.appendChild(this.eleDivLeftNav);
  this.mediaDiv = this.eleDivImage;
  this.initCanvas();
  this.updateFromLoadingState();
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
        self.clearState();
        self.insertImage(self._currentIndex);
      }
    }
  });

  this.eleDivLeftNav.addEventListener('click', function() {
    if (self._isImageInserted) {
      const limit = 0;
      if (self._currentIndex > limit) {
        self._currentIndex--;
        self.clearState();
        self.insertImage(self._currentIndex);
      }
    }
  });
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
GalleryRenderer.prototype.updateFromLoadingState = function() {
  if (this._isRendered && !this._isGalleryReady) {
    if (this.player._boolHasPoster) {
      const imageObj = document.createElement('img');
      imageObj.className = 'p51-contained-image';
      imageObj.setAttribute('src', this.player._posterURL);
      this.eleDivImage.appendChild(imageObj);
    }
  }
  if (this._isGalleryReady && this._isRendered) {
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
isGalleryReady: ${this._isGalleryReady}
isImageInserted: ${this._isImageInserted}
isRendered:   ${this._isRendered}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isOverlayPrepared: ${this._isOverlayPrepared}
`;
};


/**
 * Draws custom case objects onto a frame.
 * @member customDraw
 * @param {context} context
 */
GalleryRenderer.prototype.customDraw = function(context) {
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
  const frameKeys = Object.keys(this._overlayData.images);
  for (const key in frameKeys) {
    if (this._overlayData.images[key].filename === filename) {
      entry = this._overlayData.images[key];
      break;
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
 * This function updates the size of the canvas to match the image
 * Overrides method in renderer.js
 *
 * @member updateSizeAndPadding
 * @param {object} imageObj
 * @required imageObj to be loaded
 */
GalleryRenderer.prototype.updateSizeAndPadding = function(imageObj) {
  this.eleCanvas.setAttribute('width', imageObj.width);
  this.eleCanvas.setAttribute('height', imageObj.height);
  this.canvasWidth = imageObj.width;
  this.canvasHeight = imageObj.height;
};


/**
 * Checks media extension for zip file format.
 *
 * @member checkMediaFormat
 * @param {string} filename
 * @return {bool}
 */
GalleryRenderer.prototype.checkMediaFormat = function(filename) {
  const extension = filename.split('.').pop();
  return (extension === 'zip');
};


/**
 * Checks for MACOSX from mac created zips.
 *
 * @member checkMACOSX
 * @param {path} filename
 * @return {bool}
 */
GalleryRenderer.prototype.checkMACOSX = function(filename) {
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
GalleryRenderer.prototype.openContents = function() {
  const zipPath = this.media.src;
  if (!this.checkMediaFormat(zipPath)) {
    /* eslint-disable-next-line no-console */
    console.log('WARN: media is not a zip file.');
    return;
  }

  const self = this;
  this._isGalleryReady = false;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      const zipBlob = this.response;
      self.readBlob(zipBlob);
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
GalleryRenderer.prototype.readBlob = function(blob) {
  const self = this;
  this.reader.createReader(new this.reader.BlobReader(blob), function(reader) {
    reader.getEntries(function(entries) {
      entries.forEach(function(item) {
        const filename = item.filename;
        const extension = self.getFileExtension(filename);
        if (self.checkImageExtension(extension) &&
        !self.checkMACOSX(filename)) {
          item.getData(new self.reader.BlobWriter(), function(content) {
            const tmp = filename.split('/');
            const filenametruncated = tmp.slice(-1)[0];
            self.imageFiles[filenametruncated] = content;
            self.fileIndex.push(filenametruncated);
            self._isGalleryReady = true;
            self.updateFromLoadingState();
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
 * Insert image into gallery
 *
 * @member insertImage
 * @param {int} index
 */
GalleryRenderer.prototype.insertImage = function(index) {
  this.clearState();
  const key = this.fileIndex[index];
  const fileBlob = this.imageFiles[key];
  const imageObj = document.createElement('img');
  const tmpURL = URL.createObjectURL(fileBlob);
  this._currentImageURL = tmpURL;
  imageObj.className = 'p51-contained-image';
  imageObj.setAttribute('src', tmpURL);
  imageObj.setAttribute('type', this.getFileExtension(key));
  const self = this;
  imageObj.addEventListener('load', function(event) {
    self.updateSizeAndPadding(event.target);
    self.prepareOverlay(key);
    self.processFrame();
  });

  this.eleDivImage.appendChild(imageObj);
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
  while (this.eleDivImage.firstChild) {
    this.eleDivImage.removeChild(this.eleDivImage.firstChild);
  }
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
