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
 * Opens up media and stores filenames in imageFiles by
 * index (psuedo frameNumber)
 *  @member openContents
 */
GalleryRenderer.prototype.openContents = function() {
  if (!this.checkMediaFormat(this.media.src)) {
    console.log('WARN: media is not a zip file.');
    return;
  }
  console.log(this.media);
};
GalleryRenderer.prototype.checkMediaFormat = function(filename) {
  const extension = filename.split('.').pop();
  return (extension === 'zip');
};
