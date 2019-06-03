/**
 * @module videoplayer51.js
 * @summary Defines a client-side media player that can play videos and render
 * metadata overlayed atop them.
 *
 * @desc VideoPlayer51 is a javascript based video player that can also
 * render available annotations and markup overlayed on top of the
 * video.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */

import {
  ObjectOverlay,
  FrameAttributesOverlay,
} from './overlay.js';
import {
  parseMediaFragmentsUri,
} from './mediafragments.js';
import {
  MediaPlayer,
} from './mediaplayer.js';

// ES6 module export
export {
  VideoPlayer51,
};


/**
 * VideoPlayer51 Class Definition
 *
 * INHERITS:  MediaPlayer
 * F-MIXINS:  None
 * @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format video/<format>
 * ex. type: "video/mp4"
 * @param {string} overlay is data that should be overlayed on the video.
 * Overlay can be empty (`null`), a string point to a single URL or
 * an object that is preloaded data.
 * @param {int} fps is the frame-rate of the media.  If it is not provided
 * then it will be guessed.
 */
function VideoPlayer51(media, overlay, fps) {
  MediaPlayer.call(this, 'video');

  this.media = media;
  this.frameOverlay = {}; // will be used to store the labels per frame

  // Attributes are organized by role; privates have a leading underscore
  // Content Attributes
  this.frameRate = fps;
  this.frameDuration = 1.0 / this.frameRate;
  this.frameZeroOffset = 1; // 1 if frame counting starts at 1; 0 otherwise
  // check if a fragment was passed in via the media and work accordingly
  this._hasMediaFragment = false; // will be true if the src has a fragment
  this._mfBeginT = null; // Time
  this._mfEndT = null;
  this._mfBeginF = null; // Frame
  this._mfEndF = null;
  this._lockToMF = false; // when we have a media fragment passed in, by
  // default, we force the player to stay within that fragment.  If the video is
  // looping, for example, then it will always go to the beginning of the
  // fragment.  However, as soon as the user scrubs the video, we turn off the
  // importance of the fragment so that the user can watch the whole video.
  // @todo an interface component needs to be added to show that we are in a
  // fragment and allow locking / unlocking of the fragment.
  const mfParse = parseMediaFragmentsUri(this.media.src);

  if (typeof mfParse.hash.t !== 'undefined') {
    this._mfBeginT = mfParse.hash.t[0].startNormalized;
    this._mfEndT = mfParse.hash.t[0].endNormalized;
    this._mfBeginF = this.computeFrameNumber(this._mfBeginT);
    this._mfEndF = this.computeFrameNumber(this._mfEndT);
    this._hasMediaFragment = true;
    this._lockToMF = true;
  }

  // Player View Attributes
  this.boolDrawFrameNumber = false;
  this.boolDrawTimestamp = false; // draw time indicator when playing
  this._boolShowControls =
    false; // whether to show the controls, part of Dynamic State

  // All state attributes are private because we need to manage the state
  // and state changes internally.

  // Player State Attributes
  // Naming convention:
  //  _bool --> things the programmer / user can set
  //  _is --> things that are impacted by code flow
  // Group 1 --> called Dynamic State in the code
  this._frameNumber = undefined; // does not cause an updateDynamicState call
  this._boolAutoplay = false; // set with `autoplay(bool=true)`
  this._boolLoop = false; // set with `loop(bool=true)`
  this._boolPlaying = false;
  this._boolManualSeek = false; // is the user manually scrubbing the video?

  // Group 2 --> called the Loading State in the code
  this._isReadyProcessFrames = false; // DOM rendered, sized and video loaded
  this._isDataLoaded = false; // video loaded
  // we cannot prepare the overlay before the player is rendered (canvas, etc.)
  // these are two separate things (can be means data is loaded)
  this._overlayCanBePrepared = true;
  this._isOverlayPrepared = false;
  this._isPreparingOverlay = false;
  this._overlayData = null;
  if ((overlay === null) || (typeof(overlay) === 'undefined')) {
    this._overlayURL = null;
    this._overlayCanBePrepared = false;
  } else if (typeof(overlay) === 'string') {
    this._overlayURL = overlay;
    this._overlayCanBePrepared = false;
    this.loadOverlay(overlay);
  } else if ((typeof(overlay) === 'object') && (overlay != null) && Object
      .keys(overlay).length >
    0) {
    this._overlayURL = null;
    this._overlayData = overlay;
  }
}
VideoPlayer51.prototype = Object.create(MediaPlayer.prototype);
VideoPlayer51.prototype.constructor = VideoPlayer51;


/**
 * Set a poster frame URL to display while the video itself is loading
 *
 * @member poster
 * @param {string} url Image to be shown while loading.
 */
VideoPlayer51.prototype.poster = function(url) {
  this._boolHasPoster = true;
  this._posterURL = url;
};


/**
 * Force the video to loop.
 *
 * @member loop
 * @param {bool} boolLoop
 */
VideoPlayer51.prototype.loop = function(boolLoop = true) {
  this._boolLoop = boolLoop;
  this.updateFromDynamicState();
};


/**
 * Force the video to autoplay when rendered.
 *
 * @member autoplay
 * @param {bool} boolAutoplay
 */
VideoPlayer51.prototype.autoplay = function(boolAutoplay = true) {
  this._boolAutoplay = boolAutoplay;
  this.updateFromDynamicState();
};


/**
 * If the player has a media fragment, reset to the initial state:
 * - locks to the fragment
 * - sets the scrub head to the beginning of the fragment
 *
 * Maintains the playing state.
 *
 * @member resetToFragment
 * @return {bool} true if reset happens
 */
VideoPlayer51.prototype.resetToFragment = function() {
  if (!this._hasMediaFragment) {
    return false;
  }

  this.renderer.eleVideo.currentTime = this._mfBeginT;
  this._lockToMF = true;

  this.updateFromDynamicState();
  return true;
};


/**
 * This changes the behaviour of the video player in the following ways.
 * 1. The caller can associate an action with clicking on the image.
 * 2. Video controls are never available.
 * 3. The video plays over mouse-over.
 * 4. The video is set to loop.
 * 5. Less information is visualized.
 * Caller probably wants to set the size of the video via forceSize()
 *
 * @member thumbnailMode
 * @param {function} action (optional) a callback function to associate with
 * any click on the video.
 */
VideoPlayer51.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this._thumbnailClickAction = action;
  this.loop(true);
};


/**
 * This function is the controller: the dynamic state of the player has changed
 * and we need to set various settings based on it.
 *
 * _frameNumber is part of the dynamic state but does not call this function to
 * be invoke.
 *
 * @member updateFromDynamicState
 */
VideoPlayer51.prototype.updateFromDynamicState = function() {
  if ((!this._isRendered) || (!this._isSizePrepared)) {
    return;
  }
  this.renderer.eleVideo.toggleAttribute('autoplay', this._boolAutoplay);
  this.renderer.eleVideo.toggleAttribute('loop', this._boolLoop);

  if (this._boolPlaying) {
    this.renderer.eleVideo.play();
    this.renderer.elePlayPauseButton.innerHTML = 'Pause';
  } else {
    this.renderer.eleVideo.pause();
    this.renderer.elePlayPauseButton.innerHTML = 'Play';
  }
  if (this._boolShowControls) {
    this.renderer.eleDivVideoControls.style.opacity = '0.9';
  } else {
    this.renderer.eleDivVideoControls.style.opacity = '0.0';
  }
};


/**
 * This function is a controller: the loading state of the player has changed
 * Make various actions based on that.
 *
 * @member updateFromLoadingState
 */
VideoPlayer51.prototype.updateFromLoadingState = function() {
  if ((this._isSizePrepared) && (this._isRendered)) {
    if (this._isDataLoaded) {
      this._isReadyProcessFrames = true;
    }
    // if we had to download overlay data and it is ready
    if ((this._overlayData !== null) && (this.overlayURL !== null)) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
  }
};


/**
 * This function updates the player state when the video current time/frame has
 * been changed, which happens when the video is playing or when the user
 * manually scrubs.
 *
 * @member updateStateFromTimeChange
 */
VideoPlayer51.prototype.updateStateFromTimeChange = function() {
  let cfn = this.computeFrameNumber();
  // check if we have a media fragment and should be looping
  // if so, reset the playing location appropriately
  cfn = this.checkForFragmentReset(cfn);
  if (cfn !== this._frameNumber) {
    this._frameNumber = cfn;
    this.processFrame();
  }
};


/**
 * Generate a string that represents the state.
 *
 * @member state
 * @return {dictionary} state
 */
VideoPlayer51.prototype.state = function() {
  return `
VideoPlayer51 State Information:
frame number: ${this._frameNumber}
playing: ${this._boolPlaying}
autoplay:  ${this._boolAutoplay}
looping:  ${this._boolLoop}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isRendered:   ${this._isRendered}
isSizePrepared:  ${this._isSizePrepared}
isDataLoaded:  ${this._isDataLoaded}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isOverlayPrepared: ${this._isOverlayPrepared}
isPreparingOverlay: ${this._isPreparingOverlay}
`;
};


/**
 * If the player has a media fragment and has exceeded the fragment, then reset
 * it back to the beginning if we are looping, else pause the video.
 *
 * The default html5 video player functionality only pauses once and then does
 * not respond to the fragment.
 *
 * @member checkForFragmentReset
 * @param {int} fn current frame number
 * @return {int} frame number after possible reset
 */
VideoPlayer51.prototype.checkForFragmentReset = function(fn) {
  if ((!this._hasMediaFragment) ||
    (!this._boolPlaying) ||
    (!this._lockToMF)) {
    return fn;
  }

  if (fn >= this._mfEndF) {
    if (this._boolLoop) {
      this.renderer.eleVideo.currentTime = this._mfBeginT;
      fn = this._mfBeginF;
    } else {
      this._boolPlaying = false;
    }
    // Important to only update in here since this is only the case that the
    // state has changed.
    this.updateFromDynamicState();
  }

  return fn;
};


/**
 * Uses information about the currentTime from the HTML5 video player and the
 * frameRate of the video to compute the current frame number.
 *
 * @member computeFrameNumber
 * @param {time} time
 * @return {time}
 */
VideoPlayer51.prototype.computeFrameNumber = function(time) {
  if (typeof time === 'undefined') {
    time = this.renderer.eleVideo.currentTime;
  }
  const currentFrameNumber = time * this.frameRate + this.frameZeroOffset;
  return Math.floor(currentFrameNumber);
};


/**
 * Retrieves the current time of the video being played in a human-readable
 * format.
 *
 * @member currentTimestamp
 * @param {int} decimals
 * @return {time}
 */
VideoPlayer51.prototype.currentTimestamp = function(decimals = 1) {
  let numSeconds = this.renderer.eleVideo.currentTime;
  const hours = Math.floor(numSeconds / 3600);
  numSeconds = numSeconds % 3600;
  const minutes = Math.floor(numSeconds / 60);
  const seconds = numSeconds % 60;

  return this._seconds_to_hhmmss_aux(hours) + ':' +
    this._seconds_to_hhmmss_aux(minutes) + ':' +
    this._seconds_to_hhmmss_aux(seconds.toFixed(decimals));
};
VideoPlayer51.prototype._seconds_to_hhmmss_aux = function(number) {
  let str = '';
  if (number == 0) {
    str = '00';
  } else if (number < 10) {
    str += '0' + number;
  } else {
    str = `${number}`;
  }
  return str;
};


/**
 * When an overlay is a string to a json file, then we assume that it needs to
 * be loaded and this function performs that load asynchronously.
 *
 * @member loadOverlay
 * @param {string} overlayPath
 */
VideoPlayer51.prototype.loadOverlay = function(overlayPath) {
  const self = this;
  this._isOverlayPrepared = false;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      self._overlayData = JSON.parse(this.responseText);
      self.updateFromLoadingState();
    }
  };
  xmlhttp.open('GET', overlayPath, true);
  xmlhttp.send();
};


/**
 * Force the video to loop.
 *
 * @member loop
 * @param {bool} boolLoop
 */
VideoPlayer51.prototype.loop = function(boolLoop = true) {
  this._boolLoop = boolLoop;
  this.updateFromDynamicState();
};


/**
 * Callback for the asynchronous retrieval of a json file.
 *
 * The overlay is represented as a dictionary of lists indexed by frame
 * numbers.
 *
 * Documentation about the way the rawjson can be represented
 * Format 1 -- Object Based:
 * {
 *   "objects": [
 *     {
 *       "label": "the class/label/name of thing to show",
 *       "index": "a unique index for the object",
 *       "frame_number": 100, // the integer frame number for this object
 *       "bounding_box": {
 *         "top_left": {
 *           "x": 0.1, // floating number in relative 0:1 coordinates
 *           "y": 0.1, // floating number in relative 0:1 coordinates
 *         },
 *         "bottom_right": {
 *           "x": 0.2, // floating number in relative 0:1 coordinates
 *           "y": 0.2, // floating number in relative 0:1 coordinates
 *         }
 *       }
 *       "attrs": {
 *         "attrs": [
 *           {
 *             "value": "string value",
 *             "confidence: 0.5 // numeric confidence
 *           }
 *         ]
 *       }
 *     },
 *     ...
 *   ]
 * }
 *
 * Format 2 -- Frame Based:
 * {
 *   "frames": {
 *     "100": { // key is a string representation of the integer frame number
 *       "frame_number": 100,  // integer frame number
 *       "objects": {
 *         "objects: [
 *           ... // Each object here is like one in the Format 1
 *         ]
 *       }
 *     }
 *   }
 * }
 *
 * The prepareOverlay code tries to intelligently decipher which of these
 * formats is present in the rawjson file.
 *
 * Noting potential race condition without using semaphors here
 *
 * @member {prepareOverlay}
 * @param {json} rawjson
 */
VideoPlayer51.prototype.prepareOverlay = function(rawjson) {
  if ((this._isOverlayPrepared) || (this._isPreparingOverlay)) {
    return;
  }

  // only want this preparation to happen once
  this._isPreparingOverlay = true;

  // Format 1
  if (typeof(rawjson.objects) !== 'undefined') {
    const context = this.renderer.setupCanvasContext();
    this._prepareOverlay_auxFormat1Objects(context, rawjson.objects);
  }

  // Format 2
  if (typeof(rawjson.frames) !== 'undefined') {
    const context = this.renderer.setupCanvasContext();
    const frameKeys = Object.keys(rawjson.frames);
    for (const frameKeyI in frameKeys) {
      if (frameKeyI) {
        const frameKey = frameKeys[frameKeyI];
        const f = rawjson.frames[frameKey];
        if (typeof(f.objects) !== 'undefined') {
          this._prepareOverlay_auxFormat1Objects(context, f.objects
              .objects);
        }
        if (typeof(f.attrs) !== 'undefined') {
          const o = new FrameAttributesOverlay(f.attrs, this);
          o.setup(
              context, this.renderer.canvasWidth, this.renderer.canvasHeight);
          this._prepareOverlay_auxCheckAdd(o, parseInt(frameKey));
        }
      }
    }
  }

  this._isOverlayPrepared = true;
  this._isPreparingOverlay = false;
  this.updateFromLoadingState();
};


/**
 * Helper function to parse one of the objects in the Format 1 of the overlay
 * and add it the overlay representation.
 *
 * @param {context} context
 * @param {array} objects is an Array of Objects with each entry an
 * object in Format 1 above.
 */
VideoPlayer51.prototype._prepareOverlay_auxFormat1Objects = function(context,
    objects) {
  for (let len = objects.length, i = 0; i < len; i++) {
    const o = new ObjectOverlay(objects[i], this);
    if (!this.renderer.canvasWidth &&
       typeof(this.renderer.canvasWidth) !== 'undefined') {
      const checkCanvasWidth = setInterval(() => {
        if (this.renderer.canvasWidth) {
          clearInterval(checkCanvasWidth);
          o.setup(context, this.renderer.canvasWidth, this
              .renderer.canvasHeight);
          this._prepareOverlay_auxCheckAdd(o);
        }
      }, 1000);
    } else {
      o.setup(context, this.renderer.canvasWidth, this.renderer.canvasHeight);
      this._prepareOverlay_auxCheckAdd(o);
    }
  }
};


/**
 * Add the overlay to the set.
 *
 * @arguments
 * @param {overlay} o the Overlay instance
 * @param {int} fn optional is the frame numnber
 * (if not provided, then the overlay o needs a frameNumber propery.
 */
VideoPlayer51.prototype._prepareOverlay_auxCheckAdd = function(o, fn = -1) {
  if (fn == -1) {
    fn = o.frame_number;
  }
  if (fn in this.frameOverlay) {
    const thelist = this.frameOverlay[fn];
    thelist.push(o);
    this.frameOverlay[fn] = thelist;
  } else {
    // this the first time we are seeing the frame
    const newlist = [o];
    this.frameOverlay[fn] = newlist;
  }
};


/**
 * Handles the rendering of a specific frame, noting that rendering has two
 * different meanings in Player51.  The Player51.render function is used to
 * actually create the Player51 and inject it into the DOM.  This
 * Player51.processFrame function is responsible for drawing when a new video
 * frame has been drawn by the underlying player.
 *
 * @todo need to use double-buffering instead of rendering direct to the
 * canvas to avoid flickering.
 * @member processFrame
 */
VideoPlayer51.prototype.processFrame = function() {
  if (!this._isReadyProcessFrames) {
    return;
  }

  const context = this.renderer.setupCanvasContext();

  // Since we are rendering on a transparent canvas, we need to clean it
  // every time.
  // @todo double-buffering
  context.clearRect(
      0, 0, this.renderer.canvasWidth, this.renderer.canvasHeight);

  // @todo give a css class to the frame number so its positioning and format
  // can be controlled easily from the css
  if (this.boolDrawFrameNumber) {
    context.fillText(this._frameNumber, 15, 30, 70);
  }

  if (this.boolDrawTimestamp) {
    // @todo better handling of the context paintbrush styles
    // working on a new way of forcing certain font sizes
    let fontheight = 24;
    const fhInWindow = fontheight / this.canvasMultiplier;
    if (fhInWindow < 12) {
      fontheight = 8 * this.canvasMultiplier;
    }
    fontheight = this.checkFontHeight(fontheight);
    context.font = `${fontheight}px sans-serif`;

    const hhmmss = this.currentTimestamp();
    const tw = context.measureText(hhmmss).width;
    const pad = 4;
    const pad2 = 2; // pad divided by 2
    const w = tw + pad + pad;
    const h = fontheight + pad + pad;
    const x = 10;
    const y = this.renderer.canvasHeight - 10 - pad - pad - fontheight;

    context.fillStyle = this.renderer.metadataOverlayBGColor;
    context.fillRect(x, y, w, h);

    context.fillStyle = this.renderer.colorGenerator.white;
    context.fillText(hhmmss, x + pad, y + pad + fontheight - pad2, tw +
      8);
  }

  if (this._isOverlayPrepared) {
    if (this._frameNumber in this.frameOverlay) {
      const fm = this.frameOverlay[this._frameNumber];
      for (let len = fm.length, i = 0; i < len; i++) {
        fm[i].draw(
            context, this.renderer.canvasWidth, this.renderer.canvasHeight);
      }
    }
  }

  this._frameNumber++;
  return;
};


/**
 * This is called periodically when the video is playing.  It checks if the
 * video playing has encountered a new frame and, if so, draws the overlays for
 * that frame.
 *
 * @member timerCallback
 */
VideoPlayer51.prototype.timerCallback = function() {
  if (this.renderer.eleVideo.paused || this.renderer.eleVideo.ended) {
    return;
  }
  this.updateStateFromTimeChange();
  // if we are manually seeking right now, then do not set the manual callback
  if (!this._boolManualSeek) {
    const self = this;
    setTimeout(function() {
      self.timerCallback();
    }, this.frameDuration * 500); // `* 500` is `* 1000 / 2`
  } else {
    console.log('NOT SETTING TIME CALLBACK');
  }
};
