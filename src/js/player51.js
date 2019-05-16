/**
 * @module player51.js
 * @summary Defines a client-side media player that can play videos or images and render
 * metadata overlayed atop them.
 *
 * @desc Player51 is a javascript based image and video player that can also
 * render available annotations and markup overlayed on top of the image or
 * video.
 *
 * Usage:
 *
 * There are full examples in the `test/` directory.  But a simple example of
 * usage is here.
   ```
    <div id="test-container" />

    <script type="module">
      import Player51 from "/src/js/player51.js";

      document.addEventListener("DOMContentLoaded", () => {
        console.log("Player51 Simple: Example code running.");

        let player = new Player51(
          {
            src: "/test/player51-test-data/8Xxvx8V-hnc-001.mp4",
            type: "video/mp4"
          },
          "/test/player51-test-data/8Xxvx8V-hnc-001.json",
          25
        );

        console.log("Player51 created.");

        player.render("test-container");

        console.log("Player51 rendered and ready.");

      });
    </script>

   ```

 * Note that default behavior is to mirror the size of the enclosing container.
 * You can, however, alter this in two ways.
 * 1.  You can call `player.forceMaximize()` which will force the video and its
 *      enclosing container to the "native" resolution of the video up to 720p.
 * 2.  You can call `player.forceSize(width, height)` to force the video and
 *      its enclosing container to the width and height you pass in.
 * Both such calls need to be made before the render call.
 *
 * TODO: implement an abstraction to for the overlay rendering.  Currently it
 * is directly tied to a canvas.  But, one can consider implementing this via
 * div/DOM rendering and bringing the full power of CSS to bear on the
 * overlays, including animation.
 *
 * Copyright 2017-2018, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */


// Imports
import { ImageViewer51 } from "./imageviewer51.js";
import { VideoPlayer51 } from "./videoplayer51.js";

// ES6 module export
export default Player51;


/**
 * Player51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param media is an object that has "src" and "type" attributes.
 * type must be specified as either image or video
 * @param overlay is data that should be overlayed on the video.  Overlay can
 * be empty (`null`), a string point to a single URL or an object that is
 * preloaded data.
 * @param fps is the frame-rate of the media.  If it is not provided then it
 * will be guessed.
 *
*/
function Player51(media, overlay, fps) {

    this.media = media;
    this.mediaType = this.determineMediaType();
    // Load correct player
    if (this.mediaType === "video") {
        this.player = new VideoPlayer51(this.media, overlay, fps);
    } else if (this.mediaType === "image") {
        this.player = new ImageViewer51(this.media, overlay);
    }
}


/**
 * @member determineMediaType
 *
 * This function figures out the type of media to be rendered.
 *
 */
Player51.prototype.determineMediaType = function () {
    var split_results = this.media.type.split("/");
    return split_results[0];
}


/**
 * @member render
 *
 * Render
 *
 * Renders a new player in the DOM element provided.
 */
Player51.prototype.render = function (parentElement) {
    this.player.render(parentElement);
}


/**
 * @member forceMax
 *
 * Calls forceMax on player
 *
 */
Player51.prototype.forceMax = function () {
    this.player.forceMax();
}


/**
 * @member forceSize
 *
 * Calls forceSize on player
 *
 */
Player51.prototype.forceSize = function (width, height) {
    this.player.forceSize(width, height);
}
