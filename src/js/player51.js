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
 * SequenceFlag = true: render as a psuedp videoplayer.
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
function Player51(media, overlay, fps = 0, sequenceFlag = false) {
  this.mediaType = this.determineMediaType(media);
  // Load correct player
  if (this.mediaType === 'video') {
    this.player = new VideoPlayer(media, overlay, fps);
  } else if (this.mediaType === 'image') {
    this.player = new ImageViewer(media, overlay);
  } else if (this.mediaType === 'application') {
    if (sequenceFlag) {
      this.player = new ImageSequence(media, overlay, fps);
    } else {
      this.player = new GalleryViewer(media, overlay);
    }
  } else {
    /* eslint-disable-next-line no-console */
    console.log('WARN: Player51 doesn\'t support this media type yet.');
  }
}


/**
 * This function sets player.boolDrawTimestamp
 *
 * @member setBoolDrawTimeStamp
 * @param {bool} value true/false
 */
Player51.prototype.setBoolDrawTimeStamp = function(value) {
  this.player.boolDrawTimestamp = value;
};


/**
 * This function sets player.boolDrawFrameNumber
 *
 * @member setBoolDrawFrameNumber
 * @param {bool} value  true/false
 */
Player51.prototype.setBoolDrawFrameNumber = function(value) {
  this.player.boolDrawFrameNumber = value;
};


/**
 * This function sets player.renderer.reader.workerScriptsPath
 *
 * @member setZipLibraryParameters
 * @param {string} path relative to zip.js
 */
Player51.prototype.setZipLibraryParameters = function(path) {
  if (this.player.renderer) {
    this.player.renderer.reader.workerScriptsPath = path;
  }
};


/**
 * This function figures out the type of media to be rendered.
 *
 * @member determineMediaType
 * @param {object} media
 * @return {string} image/video/etc..
 */
Player51.prototype.determineMediaType = function(media) {
  const splitResults = media.type.split('/');
  if (splitResults.length !== 2) {
    throw new Error('Media type is incorrect.');
  }
  return splitResults[0];
};


/**
 * Calls poster on player
 *
 * @member poster
 * @param {string} url Image to be shown while loading
 * @param {string} option loading/404
 */
Player51.prototype.poster = function(url, option='loading') {
  if (option === 'loading') {
    this.player.setLoadingPoster(url);
  } else if (option === '404') {
    this.player.setNotFoundPoster(url);
  } else {
    throw new Error('Invalid poster option.');
  }
};


/**
 * Calls loop on player
 *
 * @member loop
 */
Player51.prototype.loop = function() {
  this.player.loop();
};


/**
 * Calls autoplay on player
 *
 *
 * @member autoplay
 */
Player51.prototype.autoplay = function() {
  this.player.autoplay();
};


/**
 * Calls resetToFragment on player
 *
 * @member resetToFragment
 */
Player51.prototype.resetToFragment = function() {
  this.player.resetToFragment();
};


/**
 * Calls thumbnailMode on player
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * a click event.
 */
Player51.prototype.thumbnailMode = function(action) {
  this.player.thumbnailMode(action);
};


/**
 * Render
 *
 * Renders a new player in the DOM element provided.
 *
 * @member render
 * @param {domElement} parentElement
 */
Player51.prototype.render = function(parentElement) {
  this.player.render(parentElement);
};


/**
 * Calls forceSize on player
 *
 * @member forceSize
 * @param {int} width
 * @param {int} height
 */
Player51.prototype.forceSize = function(width, height) {
  this.player.forceSize(width, height);
};


/**
 * Calls forceMax on player
 *
 * @member forceMax
 */
Player51.prototype.forceMax = function() {
  this.player.forceMax();
};
