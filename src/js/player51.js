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
 * Copyright 2017-2021, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Alan Stahl, alan@voxel51.com
 */
import mime from "mime-types";

import { VideoPlayer } from "./videoplayer.js";
import { ImageViewer } from "./imageviewer.js";
import { colorGenerator } from "./overlay.js";

export { ColorGenerator } from "./overlay.js";

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
function Player51({ sample, src, ...options }) {
  options.colorMap = options.colorMap || {};
  options.colorByLabel = options.coloredByLabel || false;
  options.activeLabels = options.activeLabels || [];
  options.filter = options.filter || {};
  options.enableOverlayOptions = options.enableOverlayOptions || {};
  options.defaultOverlayOptions = options.defaultOverlayOptions || {};
  options.selectedLabels = options.selectedLabels || [];
  options.colorGenerator = options.colorGenerator || colorGenerator;

  const mimeType =
    (sample.metadata && sample.metadata.mime_type) ||
    mime.lookup(sample.filepath) ||
    "image/jpg";

  if (mimeType.startsWith("video/")) {
    return new VideoPlayer(src, sample, options);
  } else if (mimeType.startsWith("image/")) {
    return new ImageViewer(src, sample, options);
  }
  throw new Error(`Unrecognized mime type: ${mimeType}`);
}
