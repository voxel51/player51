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
  // Data structures
  this.imageFiles = {};
  this.fileIndex = [];
  this.reader = new ZipLibrary();
  this.reader.workerScriptsPath = '../src/js/zipreader/';
  // Loading state attributes
  this._isGalleryReady = false;
  this._isImageInserted = false;
  // Dynamic state attributes
  this._currentIndex = 0;
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
};


/**
 * Checks media extension for zip file format.
 * @member checkMediaFormat
 * @param {string} filename
 * @return {bool}
 */
GalleryRenderer.prototype.checkMediaFormat = function(filename) {
  const extension = filename.split('.').pop();
  return (extension === 'zip');
};


/**
 * Opens up media and stores filenames in imageFiles by
 * index (psuedo frameNumber)
 * @member openContents
 * @required media.src needs to be a zip file
 */
GalleryRenderer.prototype.openContents = function() {
  const zipPath = this.media.src;
  if (!this.checkMediaFormat(zipPath)) {
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
        const extension = self.getExtension();
        if (self.getFileExtension(filename) === extension) {
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
      console.log(error);
    });
  }, function(error) {
    console.log(error);
  });
};


/**
 * Insert image into gallery
 *
 * @member insertImage
 * @param {name} filename
 * @default inserts the first file found in imageFiles
 */
GalleryRenderer.prototype.insertImage = function(filename='') {
  const key = this.fileIndex[0];
  if (filename !== '') {
    key = filename;
  }
  const fileBlob = this.imageFiles[key];
  const imageObj = document.createElement('img');
  const tmpURL = URL.createObjectURL(fileBlob);
  imageObj.className = 'p51-contained-image';
  imageObj.setAttribute('src', tmpURL);
  imageObj.setAttribute('type', this.getFileExtension(key));
  const self = this;
  imageObj.addEventListener('load', function() {
    // self.updateSizeAndPadding();
    console.log('Image Loaded');
  });

  this.eleDivImage.appendChild(imageObj);
  this._isImageInserted = true;
};


/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
GalleryRenderer.prototype.updateFromLoadingState = function() {
  if (this._isGalleryReady) {
    // Able to load an image into gallery
    if (!this._isImageInserted) {
      // Clear div first
      this.insertImage();
      console.log(this.state());
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
isGalleryReady: ${this._isGalleryReady}
isImageInserted: ${this._isImageInserted}
isRendered:   ${this._isRendered}
overlayCanBePrepared: ${this._overlayCanBePrepared}
`;
};
