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
  // Data structures
  this.imageFiles = {};
  this.reader = new ZipLibrary();
  this.reader.workerScriptsPath = '../src/js/zipreader/';
  // Loading state attributes
  this._isGalleryPrepared = false;
  // Initialization
  this.openContents();
}
GalleryRenderer.prototype = Object.create(Renderer.prototype);
GalleryRenderer.prototype.constructor = GalleryRenderer;


/**
 * Initializes an image gallery in parent
 * @member initPlayer
 * @required setParentandMedia called beforehand
 */
GalleryRenderer.prototype.initPlayer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
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
  this._isGalleryPrepared = false;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      const zipBlob = this.response;
      self.readBlob(zipBlob);
      self._isGalleryPrepared = true;
    }
  };
  xmlhttp.responseType = 'blob';
  xmlhttp.open('GET', zipPath, true);
  xmlhttp.send();
};


/**
 * Reads the zip blob into files
 * @member readBlob
 * @param {blob} blob
 */
GalleryRenderer.prototype.readBlob = function(blob) {
  const self = this;
  this.reader.createReader(new this.reader.BlobReader(blob), function(reader) {
    reader.getEntries(function(entries) {
      console.log(entries);
      entries[1].getData(new self.reader.BlobWriter(), function(image) {
        const imageUrl = URL.createObjectURL(image);
        const tmpImage = document.createElement('img');
        tmpImage.setAttribute('src', imageUrl);
        tmpImage.setAttribute('type', 'png');
        console.log(image);
        console.log(tmpImage);
        self.parent.appendChild(tmpImage);
      });
    });
  }, function(error) {
    console.log(error);
  });


/*
const zip = this.reader;
  // use a BlobReader to read the zip from a Blob object
zip.createReader(new zip.BlobReader(blob), function(reader) {

  // get all entries from the zip
  reader.getEntries(function(entries) {
    if (entries.length) {

      // get first entry content as text
      entries[0].getData(new zip.TextWriter(), function(text) {
        // text contains the entry data as a String
        console.log(text);

        // close the zip reader
        reader.close(function() {
          // onclose callback
        });

      }, function(current, total) {
        // onprogress callback
      });
    }
  });
}, function(error) {
  // onerror callback
});
*/
};
