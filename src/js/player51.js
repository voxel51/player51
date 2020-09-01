/**
 * @module player51.js
 * @summary Defines a client-side media player that can play
 * videos or images and render metadata overlayed atop them.
 *
 * @desc Player51 is a javascript based image and video player that can also
 * render available annotations and markup overlayed on top of the image or
 * video.
 *
 * Usage:
 * There are full examples in the `test/` directory.  But a simple example of
 * usage is here.
 *
 * To switch between types of media, specify the type attribute in media
 * in the following format, otherwise known as MIME type.
 * <media type>/<media format>
 * examples: image/jpg, video/mp4, application/zip

   ```
    <div id="test-container"></div>

    <script type="module">
      import Player51 from "/src/js/player51.js";

      document.addEventListener("DOMContentLoaded", () => {
        console.log("Player51 Simple: Example code running.");

        let player = new Player51(
          {
            src: "url/to/video.mp4",
            type: "video/mp4"
          },
          "url/to/labels.json",
          25
        );

        console.log("Player51 created.");

        player.render("test-container");

        console.log("Player51 rendered and ready.");

      });
    </script>

   ```
 * For videos and images,
 * Note that default behavior is to mirror the size of the enclosing container.
 * You can, however, alter this in two ways.
 * 1. You can call `player.forceMax()` which will force the video or
 *    image and its enclosing container to the "native" resolution of
 *    the video or image up to 720p.
 * 2. You can call `player.forceSize(width, height)` to force the video
 *    or image and its enclosing container to the width and height you pass in.
 *    Both such calls need to be made before the render call.
 *
 * For zip files,
 * Note that the default behaviour is to have each image mirror the size of the
 * enclosing container.
 *
 * Also note that there are two options for rendering zip files,
 * Default: render as an image gallery.
 * SequenceFlag = true: render as a psuedo videoplayer.
 *
 * Copyright 2017-2020, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Alan Stahl, alan@voxel51.com
 */


// Imports
import {
  VideoPlayer,
} from './videoplayer.js';
import {
  ImageViewer,
} from './imageviewer.js';
import {
  GalleryViewer,
} from './galleryviewer.js';
import {
  ImageSequence,
} from './imagesequence.js';

export default Player51;


/**
 * Player51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param {object} options with the following keys:
 *   media: an object that has "src" (URL) and "type" (mimetype) attributes.
 *   overlay: data that should be overlayed on the video or image. In the case
 *     of videos: can be null, a single URL or an object that is preloaded data.
 *     In the case of images: can be a single URL.
 *   fps: the frame-rate of the media. Only used for videos. If it is not
 *     provided then it will be guessed.
 *   isSequence: for rendering ZIP files - if true, the contents will be
 *     rendered as a video; otherwise, as a gallery.
 */
function Player51(options, ...args) {
  // maintain compatibility with code that passes these arguments positionally
  if (options.src && options.type) {
    options.media = {
      src: options.src,
      type: options.type,
    };
    delete options.src;
    delete options.type;
  }
  for (let [index, name] of Object.entries(['overlay', 'fps', 'isSequence'])) {
    index = Number(index);
    if (args[index] !== undefined) {
      if (options[name] === undefined) {
        options[name] = args[index];
      } else {
        throw new Error(
            `Duplicate option and positional argument ${index + 1}: ${name}`);
      }
    }
  }
  if (!options.overlay) {
    // convert undefined and other false-y values to null for internal use
    options.overlay = null;
  }
  // set defaults for other options
  options.colorMap = options.colorMap || {};
  options.activeLabels = options.activeLabels || {};
  options.filter = options.filter || {};
  options.defaultOverlayOptions = options.defaultOverlayOptions || {};

  const {media, overlay} = options;
  const mimetype = options.media.type.toLowerCase();

  // Load correct player
  if (mimetype.startsWith('video/')) {
    return new VideoPlayer(media, overlay, options);
  } else if (mimetype.startsWith('image/')) {
    return new ImageViewer(media, overlay, options);
  } else if (mimetype === 'application/zip') {
    if (options.isSequence) {
      return new ImageSequence(media, overlay, options);
    }
    return new GalleryViewer(media, overlay, options);
  }
  throw new Error(`Unrecognized mime type: ${mimetype}`);
}
