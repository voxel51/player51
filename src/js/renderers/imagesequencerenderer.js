/**
 * @module imagesequencerenderer.js
 * @summary Renders a psuedo video player into the parentElement.
 *
 * @desc ImageSequenceRenderer is a class that controls the creation and
 * viewing of imagesequence.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer,
} from '../renderer.js';

export {
  ImageSequenceRenderer,
};


/**
 * ImageSequenceRenderer Class Definition
 *
 * INHERITS: Renderer
 * F-MIXINS: None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format imagesequence/<format>
 * ex. type: "imagesequence/zip"
 * @param {string} overlay is data that should be overlayed on the psuedo video.
 * Overlay is a path to a file of eta.core.image.ImageSetLabels format.
 */
function ImageSequenceRenderer(media, overlay) {
  Renderer.call(this, media, overlay);
}
ImageSequenceRenderer.prototype = Object.create(Renderer.prototype);
ImageSequenceRenderer.prototype.constructor = ImageSequenceRenderer;
