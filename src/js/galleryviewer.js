/**
 * @module galleryviewer.js
 * @summary Defines a client-side media player that can display a zip of
 * images and render metadata overlayed atop them.
 *
 * @desc GalleryViewer is a javascript based image gallery that can render
 * available annotation and markup overlayed on top of the images.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  MediaPlayer,
} from './mediaplayer.js';

// ES6 module export
export {
  GalleryViewer,
};


/**
 * GalleryViewer Class Definition
 *
 * INHERITS: MediaPlayer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in format gallery/<format>
 * ex. type: "gallery/jpg"
 * @param {string} overlay is data that should be overlayed on the images.
 */
function GalleryViewer(media, overlay) {
  MediaPlayer.call(this, 'gallery', media, overlay);
}
GalleryViewer.prototype = Object.create(MediaPlayer.prototype);
GalleryViewer.prototype.constructor = GalleryViewer;
