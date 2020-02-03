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
    <div id="test-container" />

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
 * Copyright 2017-2019, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
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
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be specified as either image or video
 * @param {string} overlay is data that should be overlayed on
 * the video or image.
 * In the case of videos: Overlay can be empty (`null`),
 * a string pointing to a single URL or an object that is preloaded data.
 * In the case of images: Overlay can be a string pointing to a single URL.
 * @param {int} fps is the frame-rate of the media.  If it is not provided
 * then it will be guessed. Ignore in the case of images.
 * @param {bool} sequenceFlag tells the player to render the zip file as either
 * an image gallery or a video player.
 */
function Player51(options) {
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
    index = Number(index) + 1;
    if (arguments[index] !== undefined) {
      if (options[name] === undefined) {
        options[name] = arguments[index];
      } else {
        throw new Error(
          `Duplicate option and positional argument ${index}: ${name}`);
      }
    }
  }

  let {media, overlay, fps} = options;
  let mimetype = options.media.type.toLowerCase();

  // Load correct player
  if (mimetype.startsWith('video/')) {
    return new VideoPlayer(media, overlay, fps);
  } else if (mimetype.startsWith('image/')) {
    return new ImageViewer(media, overlay);
  } else if (mimetype === 'application/zip') {
    if (options.isSequence) {
      return new ImageSequence(media, overlay, fps);
    } else {
      return new GalleryViewer(media, overlay);
    }
  } else {
    throw new Error(`Unrecognized mime type: ${mimetype}`);
  }
}
