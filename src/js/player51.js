/**
 * @module player51.js
 * @summary Defines a client-side media player that can play videos and render
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
 */


import {parseMediaFragmentsUri} from "./mediafragments.js";

// ES6 module export
export default Player51;


/**
 * Player51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param media is an object that has "src" and "type" attributes.
 * @param overlay is data that should be overlayed on the video.  Overlay can
 * be empty (`null`), a string point to a single URL or an object that is
 * preloaded data.
 * @param fps is the frame-rate of the media.  If it is not provided then it
 * will be guessed.
 */
function Player51(media, overlay, fps) {

  this.media = media;
  this.frameOverlay = {}; // will be used to store the labels per frame

  // Attributes are organized by role; privates have a leading underscore
  // Content Attributes
  this.canvasWidth = null;
  this.canvasHeight = null;
  this.frameRate = fps;
  this.frameDuration = 1.0/this.frameRate;
  this.frameZeroOffset = 1; // 1 if frame counting starts at 1; 0 otherwise
  // check if a fragment was passed in via the media and work accordingly
  this._hasMediaFragment = false;  // will be true if the src has a fragment
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
  let mfParse = parseMediaFragmentsUri(this.media.src);

  if (typeof mfParse.hash.t !== "undefined") {
    this._mfBeginT = mfParse.hash.t[0].startNormalized;
    this._mfEndT = mfParse.hash.t[0].endNormalized;
    this._mfBeginF = this.computeFrameNumber(this._mfBeginT);
    this._mfEndF = this.computeFrameNumber(this._mfEndT);
    this._hasMediaFragment = true;
    this._lockToMF = true;
  }


  // All state attributes are private because we need to manage the state
  // and state changes internally.

  // Player Prerender Attributes
  //  These attributes must be set before the `render()` function is called or
  //  they will have no impact.
  // set via poster(); used to show an image while the video itself is loading
  this._boolHasPoster = false;   // set via `poster()`
  this._posterURL = "";   // set via `poster()`
  this._boolForcedSize = false;  // set via `forceSize()`
  this._boolForcedMax = false;  // set via `forceMax()`
  this._forcedWidth = -1;  // set via `forceSize()`
  this._forcedHeight = -1;  // set via `forceSize()`
  this._boolThumbnailMode = false;
  this._thumbnailClickAction = undefined;

  // Player View Attributes
  this.width = -1;
  this.height = -1;
  this.paddingLeft = 0;
  this.paddingRight = 0;
  this.paddingTop = 0;
  this.paddingBottom = 0;
  this._boolBorderBox = false;  // is the container a border-box?

  this.boolDrawFrameNumber = false;
  this.boolDrawTimestamp = false;  // draw time indicator when playing
  this.metadataOverlayBGColor = "hsla(210, 20%, 10%, 0.8)";
  this._boolShowControls = false; // whether to show the controls, part of Dynamic State

  // Player State Attributes
  // Naming convention:
  //  _bool --> things the programmer / user can set
  //  _is --> things that are impacted by code flow
  // Group 1 --> called Dynamic State in the code
  this._frameNumber = undefined; // does not cause an updateDynamicState call
  this._boolAutoplay = false; // set with `autoplay(bool=true)`
  this._boolLoop = false;  // set with `loop(bool=true)`
  this._boolPlaying = false;
  this._boolManualSeek = false;  // is the user manually scrubbing the video?

  // Group 2 --> called the Loading State in the code
  this._isReadyProcessFrames = false; // DOM rendered, sized and video loaded
  this._isRendered = false; // DOM rendered
  this._isSizePrepared = false; // DOM rendered and sized
  this._isDataLoaded = false; // video loaded
  // we cannot prepare the overlay before the player is rendered (canvas, etc.)
  // these are two separate things (can be means data is loaded)
  this._overlayCanBePrepared = true;
  this._isOverlayPrepared = false;
  this._isPreparingOverlay = false;
  this._overlayData = null;
  if ((overlay === null) || (typeof(overlay) === "undefined")) {
    this._overlayURL = null;
    this._overlayCanBePrepared = false;
  } else if (typeof(overlay) === "string") {
    this._overlayURL = overlay;
    this._overlayCanBePrepared = false;
    this.loadOverlay(overlay);
  } else if ( (typeof(overlay) === "object") && (overlay != null) && Object.keys(overlay).length > 0) {
    this._overlayURL = null ;
    this._overlayData = overlay;
  }
}


/**
 * @member updateFromDynamicState
 *
 * This function is the controller: the dynamic state of the player has changed
 * and we need to set various settings based on it.
 *
 * _frameNumber is part of the dynamic state but does not call this function to
 * be invoke.
 */
Player51.prototype.updateFromDynamicState = function() {
  if ( (!this._isRendered) ||
       (!this._isSizePrepared) ) {
    return;
  }

  this.eleVideo.toggleAttribute("autoplay", this._boolAutoplay);
  this.eleVideo.toggleAttribute("loop", this._boolLoop);

  if (this._boolPlaying) {
    this.eleVideo.play();
    this.elePlayPauseButton.innerHTML = "Pause";
  } else {
    this.eleVideo.pause();
    this.elePlayPauseButton.innerHTML = "Play";
  }
  if (this._boolShowControls) {
    this.eleDivVideoControls.style.opacity = "0.9";
  } else {
    this.eleDivVideoControls.style.opacity = "0.0";
  }
};

/**
 * @member updateFromLoadingState
 *
 * This function is a controller: the loading state of the player has changed
 * Make various actions based on that.
 */
Player51.prototype.updateFromLoadingState = function() {
  if ( (this._isSizePrepared) &&
       (this._isRendered) ) {

    if (this._isDataLoaded)
      this._isReadyProcessFrames = true;

    // if we had to download overlay data and it is ready
    if ( (this._overlayData !== null) && (this.overlayURL !== null) )
      this._overlayCanBePrepared = true;
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
  }
};

/**
 * @member state()
 *
 * Generate a string that represents the state.
 */
Player51.prototype.state = function() {
  return `
Player51 State Information:
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
 * @member autoplay
 *
 * Force the video to autoplay when rendered.
 */
Player51.prototype.autoplay = function(boolAutoplay=true) {
  this._boolAutoplay = boolAutoplay;
  this.updateFromDynamicState();
};

/**
 * @member checkForFragmentReset
 *
 * If the player has a media fragment and has exceeded the fragment, then reset
 * it back to the beginning if we are looping, else pause the video.
 *
 * The default html5 video player functionality only pauses once and then does
 * not respond to the fragment.
 *
 * Args: frame number current
 * Returns: frame number after possible reset.
 */
Player51.prototype.checkForFragmentReset = function(fn) {
  if ( (!this._hasMediaFragment) ||
       (!this._boolPlaying) ||
       (!this._lockToMF) ) {
    return fn;
  }

  if (fn >= this._mfEndF) {
    if (this._boolLoop) {
      this.eleVideo.currentTime = this._mfBeginT;
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
 * @member computeFrameNumber
 *
 * Uses information about the currentTime from the HTML5 video player and the
 * frameRate of the video to compute the current frame number.
 */
Player51.prototype.computeFrameNumber = function(time) {
  if (typeof time === "undefined") {
    time = this.eleVideo.currentTime;
  }
  let currentFrameNumber = time * this.frameRate + this.frameZeroOffset;
  return Math.floor(currentFrameNumber);
};


/**
 * @member currentTimestamp
 *
 * Retrieves the current time  of the video being played in a human-readable
 * format.
 */
Player51.prototype.currentTimestamp = function(decimals=1) {
  let numSeconds = this.eleVideo.currentTime;
  let hours = Math.floor(numSeconds / 3600);
  numSeconds = numSeconds % 3600;
  let minutes = Math.floor(numSeconds / 60);
  let seconds = numSeconds % 60;

  return this._seconds_to_hhmmss_aux(hours) + ":" +
         this._seconds_to_hhmmss_aux(minutes) + ":" +
         this._seconds_to_hhmmss_aux(seconds.toFixed(decimals));
};
Player51.prototype._seconds_to_hhmmss_aux = function(number) {
  let str = "";
  if (number == 0) {
    str = "00";
  } else if (number < 10) {
    str += "0" + number;
  } else {
    str = `${number}`;
  }
  return str;
};


/**
 * @member forceSize
 *
 * Forces a manual size to the video and canvas.
 *
 * Must be called before render; will not work dynamically.  Will not actually
 * be effected until render is called (and the loadedmetadata handler happens)
 */
Player51.prototype.forceSize = function(width, height) {
  if (this._boolForcedMax) {
    console.log("Warning!  Both forceSize and forcedMax were called.");
    console.log("Warning!  forceSize wins.");
  }
  this._boolForcedSize = true;
  this._forcedWidth = width;
  this._forcedHeight = height;
};


/**
 * @member forceMax
 *
 * Forces the video to max to native video resolution up to 720p
 *
 * Must be called before render; will not work dynamically.  Will not actually
 * be effected until render is called (and the loadedmetadata handler happens)
 */
Player51.prototype.forceMax = function(width, height) {
  if (this._boolForcedSize) {
    console.log("Warning!  Both forceSize and forcedMax were called.");
    console.log("Warning!  forceSize wins.");
  }
  this._boolForcedMax = true;
};


/**
 * @member loadOverlay
 *
 * When an overlay is a string to a json file, then we assume that it needs to
 * be loaded and this function performs that load asynchronously.
 */
Player51.prototype.loadOverlay = function(overlayPath) {
  let self = this;

  this._isOverlayPrepared = false;
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      self._overlayData = JSON.parse(this.responseText);
      self.updateFromLoadingState();
    }
  };
  xmlhttp.open("GET", overlayPath, true);
  xmlhttp.send();
};


/**
 * @member loop
 *
 * Force the video to loop.
 */
Player51.prototype.loop = function(boolLoop=true) {
  this._boolLoop = boolLoop;
  this.updateFromDynamicState();
};

/**
 * @member poster
 *
 * Set a poster frame URL to display while the video itself is loading
 */
Player51.prototype.poster = function(url) {
  this._boolHasPoster = true;
  this._posterURL = url;
};

/**
 * @member prepareOverlay
 *
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
 */
Player51.prototype.prepareOverlay = function (rawjson) {

  if ((this._isOverlayPrepared) || (this._isPreparingOverlay)) {
    return;
  }

  // only want this preparation to happen once
  this._isPreparingOverlay = true;

  // Format 1
  if (typeof(rawjson.objects) !== "undefined") {
    let context = this.setupCanvasContext();
    this._prepareOverlay_auxFormat1Objects(context, rawjson.objects);
  }

  // Format 2
  if (typeof(rawjson.frames) !== "undefined") {
    let context = this.setupCanvasContext();
    let frame_keys = Object.keys(rawjson.frames);
    for (let frame_key_i in frame_keys) {
      let frame_key = frame_keys[frame_key_i];
      let f = rawjson.frames[frame_key];
      if (typeof(f.objects) !== "undefined") {
        this._prepareOverlay_auxFormat1Objects(context, f.objects.objects);
      }
      if (typeof(f.attrs) !== "undefined") {
        let o = new FrameAttributesOverlay(f.attrs, this);
        o.setup(context, this.canvasWidth, this.canvasHeight);
        this._prepareOverlay_auxCheckAdd(o, parseInt(frame_key));
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
 * Args:
 *   objects is an Array of Objects with each entry an object in Format 1 above.
 */
Player51.prototype._prepareOverlay_auxFormat1Objects = function(context, objects) {
  for (let len = objects.length, i=0; i< len; i++) {
    let o = new ObjectOverlay(objects[i], this);
    if (!this.canvasWidth) {
      setTimeout(() => {
        o.setup(context, this.canvasWidth, this.canvasHeight);
        this._prepareOverlay_auxCheckAdd(o);
      }, 1000);
    } else {
      o.setup(context, this.canvasWidth, this.canvasHeight);
      this._prepareOverlay_auxCheckAdd(o);
    }

  }
};

/**
 * Add the overlay to the set.
 *
 * @arguments
 *  o the Overlay instance
 *  fn optional is the frame numnber (if not provided, then the overlay o needs
 *  a .frame_number propery.
 */
Player51.prototype._prepareOverlay_auxCheckAdd = function(o, fn=-1) {
  if (fn==-1) {
    fn = o.frame_number;
  }
  if (fn in this.frameOverlay) {
    let thelist = this.frameOverlay[fn];
    thelist.push(o);
    this.frameOverlay[fn] = thelist;
  } else {
    // this the first time we are seeing the frame
    let newlist = [o];
    this.frameOverlay[fn] = newlist;
  }
};

/**
 * @member checkFontHeight
 */
Player51.prototype.checkFontHeight = function(h) {
  if (h == 0) {
    console.log("PLAYER51 WARN: fontheight 0");
    return 10;
  }
  return h;
};


/**
 * @member processFrame
 *
 * Handles the rendering of a specific frame, noting that rendering has two
 * different meanings in Player51.  The Player51.render function is used to
 * actually create the Player51 and inject it into the DOM.  This
 * Player51.processFrame function is responsible for drawing when a new video
 * frame has been drawn by the underlying player.
 *
 * @todo need to use double-buffering instead of rendering direct to the
 * canvas to avoid flickering.
 */
Player51.prototype.processFrame = function() {

  if (!this._isReadyProcessFrames) {
    return;
  }

  let context = this.setupCanvasContext();

  // Since we are rendering on a transparent canvas, we need to clean it
  // every time.
  // @todo double-buffering
  context.clearRect(0,0,this.canvasWidth, this.canvasHeight);

  // @todo give a css class to the frame number so its positioning and format
  // can be controlled easily from the css
  if (this.boolDrawFrameNumber) {
    context.fillText(this._frameNumber, 15, 30, 70);
  }

  if (this.boolDrawTimestamp) {
    // @todo better handling of the context paintbrush styles
    // working on a new way of forcing certain font sizes
    let fontheight = 24;
    let fh_in_window = fontheight / this.canvasMultiplier;
    if (fh_in_window < 12) {
      fontheight = 8 * this.canvasMultiplier;
    }
    fontheight = this.checkFontHeight(fontheight);
    context.font = `${fontheight}px sans-serif`;

    let hhmmss = this.currentTimestamp();
    let tw = context.measureText(hhmmss).width;
    let pad = 4;
    let pad2 = 2; // pad divided by 2
    let w = tw + pad + pad;
    let h = fontheight + pad + pad;
    let x = 10;
    let y = this.canvasHeight - 10 - pad - pad - fontheight;

    context.fillStyle = this.metadataOverlayBGColor;
    context.fillRect(x, y, w, h);

    context.fillStyle = colorGenerator.white;
    context.fillText(hhmmss, x+pad, y+pad+fontheight-pad2, tw+8);
  }

  if (this._isOverlayPrepared) {
    if (this._frameNumber in this.frameOverlay) {
      let fm = this.frameOverlay[this._frameNumber];

      for (let len = fm.length, i=0; i<len; i++) {
        fm[i].draw(context, this.canvasWidth, this.canvasHeight);
      }
    }
  }

  this._frameNumber++;
  return;
};


/**
 * @member render
 * Render a new player for this media within the DOM element provided
 *
 * Note that the player parts inherit certain properties from the parent div,
 * such as padding.
 *
 * @param parentElement String id of the parentElement or actual Div object.
 */
Player51.prototype.render = function(parentElement) {
  this.parent = undefined;
  if (typeof parentElement === "string") {
    this.parent = document.getElementById(parentElement);
  } else {
    this.parent = parentElement;
  }

  let cBS = window.getComputedStyle(this.parent, null).getPropertyValue("box-sizing");
  this._boolBorderBox = false;
  if (cBS === "border-box") {
    this._boolBorderBox = true;
  }

  this.eleDivVideo = document.createElement("div");
  this.eleDivVideo.className = "p51-contained-video";
  this.eleVideo = document.createElement("video");
  this.eleVideo.className = "p51-contained-video";
  this.eleVideo.setAttribute("preload", "metadata");
  this.eleVideo.muted = true;  // this works whereas .setAttribute does not
  if (this._boolAutoplay) {
    this.eleVideo.toggleAttribute("autoplay", true);
  }
  if (this._boolLoop) {
    this.eleVideo.toggleAttribute("loop", true);
  }
  if (this._boolHasPoster) {
    this.eleVideo.setAttribute("poster", this._posterURL);
  }
  this.eleVideoSource = document.createElement("source");
  this.eleVideoSource.setAttribute("src", this.media.src);
  this.eleVideoSource.setAttribute("type", this.media.type);
  this.eleVideo.appendChild(this.eleVideoSource);
  this.eleDivVideo.appendChild(this.eleVideo);
  this.parent.appendChild(this.eleDivVideo);

  this.eleDivCanvas = document.createElement("div");
  this.eleDivCanvas.className = "p51-contained-canvas";
  this.eleCanvas = document.createElement("canvas");
  this.eleCanvas.className = "p51-contained-canvas";
  this.eleDivCanvas.appendChild(this.eleCanvas);
  this.parent.appendChild(this.eleDivCanvas);

  this.eleDivVideoControls = document.createElement("div");
  this.eleDivVideoControls.className = "p51-video-controls";
  this.elePlayPauseButton = document.createElement("button");
  this.elePlayPauseButton.setAttribute("type", "button");
  this.elePlayPauseButton.className = "p51-play-pause";
  this.elePlayPauseButton.innerHTML = "Play";
  this.eleSeekBar = document.createElement("input");
  this.eleSeekBar.setAttribute("type", "range");
  this.eleSeekBar.setAttribute("value", "0");
  this.eleSeekBar.className = "p51-seek-bar";
  this.eleDivVideoControls.appendChild(this.elePlayPauseButton);
  this.eleDivVideoControls.appendChild(this.eleSeekBar);
  this.parent.appendChild(this.eleDivVideoControls);

  // after the DOM elements are created then we initialize other variables that
  // will be needed during playback
  let self = this;

  this.eleVideo.addEventListener("loadedmetadata", function() {
    self.updateSizeAndPadding();
    self.setupCanvasContext();
    self.updateFromLoadingState();
  });

  this.eleVideo.addEventListener("loadeddata", function() {
    self._isDataLoaded = true;

    // Handles the case that we have a poster frame to indicate the video is
    // loading and now we can show the video.  But when we are not autoplay.
    // We need to set the state to playing if we are set to autoplay
    //  (the player itself will handle the autoplaying)
    if (self._boolAutoplay) {
      self._boolPlaying = true;
    } else if (self._boolHasPoster) {
      if (self._hasMediaFragment) {
        self.eleVideo.currentTime = self._mfBeginT;
        self._frameNumber = self._mfBeginF;
      } else {
        self.eleVideo.currentTime = 0;
        self._frameNumber = 1;
      }
    }

    self.updateFromLoadingState();

    // so that we see overlay and time stamp now that we are ready
    if ((!self._boolThumbnailMode)&&(!self._boolAutoplay)) {
      self.processFrame();
    }
  });

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener("click", function() {
    if (self._boolPlaying !== true) {
      self._boolPlaying = true;
    } else {
      self._boolPlaying = false;
    }
    self.updateFromDynamicState();
  });

  // Event listener for the seek bar
  this.eleSeekBar.addEventListener("change", function() {
    // Calculate the new time
    let time = self.eleVideo.duration * (self.eleSeekBar.valueAsNumber / 100.0);

    // Update the video time
    self.eleVideo.currentTime = time;

    // Unlock the fragment so the user can browse the whole video
    self._lockToMF = false;

    self.updateFromDynamicState();
  });

  /*  THIS DOES NOT FUNCTION YET
  // Pause the video when the seek handle is being dragged
  this.eleSeekBar.addEventListener("mousemove", function() {
    if (self._boolManualSeek) {
      let time = self.eleVideo.duration * (self.eleSeekBar.valueAsNumber / 100.0);
      self.eleVideo.currentTime = time;
      self.processFrame();
    }
  });
  */

  // Pause the video when the seek handle is being dragged
  this.eleSeekBar.addEventListener("mousedown", function() {
    if (!self._boolThumbnailMode) {
      self._boolManualSeek = true;
      // Unlock the fragment so the user can browse the whole video
      self._lockToMF = false;
      // We need to manually control the video-play state
      // And turn it back on as needed.
      self.eleVideo.pause();
    }
  });

  // Play the video when the seek handle is dropped
  this.eleSeekBar.addEventListener("mouseup", function() {
    self._boolManualSeek = false;
    if (self._boolPlaying) {
      self.eleVideo.play();
    }
  });

  this.eleVideo.addEventListener("ended", function() {
    self._boolPlaying = false;
    self.updateFromDynamicState();
  });

  this.eleVideo.addEventListener("pause", function () {
    // this is a pause that is fired from the video player itself and not from
    // the user clicking the play/pause button.
    // Noting the checkForFragmentReset function calls updateFromDynamicState
    self.checkForFragmentReset(self.computeFrameNumber());
  });

  // Update the seek bar as the video plays
  this.eleVideo.addEventListener("timeupdate", function() {
    // Calculate the slider value
    let value = (100 / self.eleVideo.duration) * self.eleVideo.currentTime;

    // Update the slider value
    self.eleSeekBar.value = value;
  });

  this.eleVideo.addEventListener("play", function() {
    self.timerCallback();
  }, false);

  this.parent.addEventListener("mouseenter", function() {
    // Two different behaviors.
    // 1.  Regular Mode: show controls.
    // 2.  Thumbnail Mode: play video
    if (!self._isDataLoaded) {
      return;
    }

    if (self._boolThumbnailMode) {
      self._boolPlaying = true;
    } else {
      self._boolShowControls = true;
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener("mouseleave", function() {
    if (!self._isDataLoaded) {
      return;
    }

    if (self._boolThumbnailMode) {
      self._boolPlaying = false;
      // clear things we do not want to render any more
      self.setupCanvasContext().clearRect(0,0,self.canvasWidth, self.canvasHeight);
    } else {
      self._boolShowControls = false;
    }
    self.updateFromDynamicState();
  });

  if (typeof this._thumbnailClickAction !== "undefined") {
    this.parent.addEventListener("click", this._thumbnailClickAction);
  }

  this._isRendered = true;
  this.updateFromLoadingState();
};

/**
 * @member resetToFragment
 *
 * If the player has a media fragment, reset to the initial state:
 * - locks to the fragment
 * - sets the scrub head to the beginning of the fragment
 *
 * Maintains the playing state.
 *
 * Args:
 * Returns: true if reset happened
 */
Player51.prototype.resetToFragment = function() {
  if (!this._hasMediaFragment) {
    return false;
  }

  this.eleVideo.currentTime = this._mfBeginT;
  this._lockToMF = true;

  this.updateFromDynamicState();

  return true;
};

/**
 * @member setupCanvasContext
 *
 * Set up the canvas context for default styles.
 */
Player51.prototype.setupCanvasContext = function () {
  if (!this._isRendered) {
    console.log("WARN: trying to set up canvas context but player not rendered");
    return;
  }
  let canvasContext = this.eleCanvas.getContext("2d");
  canvasContext.strokeStyle = "#fff";
  canvasContext.fillStyle = "#fff";
  canvasContext.lineWidth = 3;
  canvasContext.font = "14px sans-serif";
  // easier for setting offsets
  canvasContext.textBaseline = "bottom";

  return canvasContext;
};


/**
 * @member thumbnailMode
 *
 * This changes the behavior of Player51 in the following way
 * 1. The controls are never available.
 * 2. The video plays on mouse-over.
 * 3. The video is set to loop.
 * 4. The caller can associated an action with clicking anywhere on the frame.
 * 5. Less information is visualized.
 *
 * Caller probably wants to set the size of the video via forceSize()
 *
 * Args:
 *  action: (optional) a callback function to associate with any click in the
 *  video player.
 */
Player51.prototype.thumbnailMode = function(action) {
  this._boolThumbnailMode = true;
  this.loop(true);
  this._thumbnailClickAction = action;
};

/**
 * @member timerCallback
 *
 * This is called periodically when the video is playing.  It checks if the
 * video playing has encountered a new frame and, if so, draws the overlays for
 * that frame.
 */
Player51.prototype.timerCallback = function() {
  if (this.eleVideo.paused || this.eleVideo.ended) {
    return;
  }
  let cfn = this.computeFrameNumber();

  // check if we have a media fragment and should be looping
  // if so, reset the playing location appropriately
  cfn = this.checkForFragmentReset(cfn);

  if (cfn !== this._frameNumber) {
    this._frameNumber = cfn;
    this.processFrame();
  }

  // if we are manually seeking right now, then do not set the manual callback
  if (!this._boolManualSeek) {
    let self = this;
    setTimeout(function () {
      self.timerCallback();
    }, this.frameDuration * 500); // `* 500` is `* 1000 / 2`
  } else {
    console.log("NOT SETTING TIME CALLBACK");
  }
};

/**
 * @member updateSizeAndPadding
 *
 * This method updates the size and padding based on the configuration and the
 * video.
 * Requires that the player is rendered.
 */
Player51.prototype.updateSizeAndPadding = function() {
  if (!this._isRendered) {
    console.log("WARN: Player51 trying to update size, but it is not rendered.");
    return;
  }

  this.paddingLeft = window.getComputedStyle(this.parent, null).getPropertyValue("padding-left");
  this.paddingRight = window.getComputedStyle(this.parent, null).getPropertyValue("padding-right");
  this.paddingTop = window.getComputedStyle(this.parent, null).getPropertyValue("padding-top");
  this.paddingBottom = window.getComputedStyle(this.parent, null).getPropertyValue("padding-bottom");
  this.paddingLeftN = parseInt(this.paddingLeft.substr(0, this.paddingLeft.length-2));
  this.paddingRightN = parseInt(this.paddingRight.substr(0, this.paddingRight.length-2));
  this.paddingTopN = parseInt(this.paddingTop.substr(0, this.paddingTop.length-2));
  this.paddingBottomN = parseInt(this.paddingBottom.substr(0, this.paddingBottom.length-2));

  // We cannot just take the window dimensions because the aspect ratio of
  // the video must be preserved.
  // Preservation is based on maintaining the height of the parent.

  // Try to maintain height of container first.  If fails, then set width.
  // Fails means that the width of the video is too wide for the container.
  this.height = this.parent.offsetHeight - this.paddingTopN - this.paddingBottomN;
  this.width = this.height * this.eleVideo.videoWidth / this.eleVideo.videoHeight;

  if (this.width > this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN) {
    this.width = this.parent.offsetWidth - this.paddingLeftN - this.paddingRightN;
    this.height = this.width * this.eleVideo.videoHeight / this.eleVideo.videoWidth;
  }

  // if the caller wants to maximize to native pixel resolution
  if (this._boolForcedMax) {
    this.width = this.eleVideo.videoWidth;
    this.height = this.eleVideo.videoHeight;

    if (this.width >= 1440) {
      this.width = 1280;
      this.height = 720;
    }
  }

  // height priority in sizing is a forced size.
  if (this._boolForcedSize) {
    this.width = this._forcedWidth;
    this.height = this._forcedHeight;
  }

  // We currently maintain a 1-to-1 relationship between the off-screen buffer
  // for video and canvas and the on-screen div.  This is not necessary and we
  // can consider fixing the off-screen size (at least for canvas) so we can
  // set context and locations in context well
  this.eleVideo.setAttribute("width", this.width);
  this.eleVideo.setAttribute("height", this.height);

  // Current functionality is to set a fixed size canvas so that we can
  // guarantee of consistent L&F for the overlays.
  // But, the right way to do this is probably define an abstraction to the
  // canvas size and then make the canvas the closest match to the actual
  // display size so that we do not kill so much member in creating the video
  // player.
  //this.eleCanvas.setAttribute("width", this.width);
  //this.eleCanvas.setAttribute("height", this.height);
  //this.canvasWidth = this.width;
  //this.canvasHeight = this.height;

  let canvasWidth = 1280;
  let canvasHeight = canvasWidth * this.eleVideo.videoHeight / this.eleVideo.videoWidth;
  this.eleCanvas.setAttribute("width", canvasWidth);
  this.eleCanvas.setAttribute("height", canvasHeight);
  this.canvasWidth = canvasWidth;
  this.canvasHeight = canvasHeight;
  this.canvasMultiplier = canvasWidth / this.width;

  this.parent.setAttribute("width", this.width);
  this.parent.setAttribute("height", this.height);

  if (this._boolBorderBox) {
    let widthstr = `${this.width + this.paddingLeftN + this.paddingRightN}px`;
    let heightstr = `${this.height + this.paddingTopN + this.paddingBottomN}px`;

    this.parent.style.width = widthstr;
    this.parent.style.height = heightstr;

    this.eleDivVideo.style.width = widthstr;
    this.eleDivVideo.style.height = heightstr;
    this.eleDivVideo.style.paddingLeft = this.paddingLeft;
    this.eleDivVideo.style.paddingRight = this.paddingRight;
    this.eleDivVideo.style.paddingTop = this.paddingTop;
    this.eleDivVideo.style.paddingBottom = this.paddingBottom;

    this.eleVideo.style.width = widthstr;
    this.eleVideo.style.height = heightstr;
    this.eleVideo.style.paddingLeft = this.paddingLeft;
    this.eleVideo.style.paddingRight = this.paddingRight;
    this.eleVideo.style.paddingTop = this.paddingTop;
    this.eleVideo.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = widthstr;
    this.eleDivCanvas.style.height = heightstr;
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = widthstr;
    this.eleCanvas.style.height = heightstr;
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;

    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + "px");
    this.eleDivVideoControls.style.height = (
      Math.min(60+this.paddingBottomN, 0.1*this.height+this.paddingBottomN) + "px"
    );

    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = (this.paddingBottomN - 2)+"px";
    this.eleDivVideoControls.style.left = this.paddingLeft;
  } else {
    this.parent.style.width = (this.width + "px");
    this.parent.style.height = (this.height + "px");

    this.eleDivVideo.style.width = (this.width + "px");
    this.eleDivVideo.style.height = (this.height + "px");
    this.eleDivVideo.style.paddingLeft = this.paddingLeft;
    this.eleDivVideo.style.paddingRight = this.paddingRight;
    this.eleDivVideo.style.paddingTop = this.paddingTop;
    this.eleDivVideo.style.paddingBottom = this.paddingBottom;

    this.eleVideo.style.width = (this.width + "px");
    this.eleVideo.style.height = (this.height + "px");
    this.eleVideo.style.paddingLeft = this.paddingLeft;
    this.eleVideo.style.paddingRight = this.paddingRight;
    this.eleVideo.style.paddingTop = this.paddingTop;
    this.eleVideo.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = (this.width + "px");
    this.eleDivCanvas.style.height = (this.height + "px");
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = (this.width + "px");
    this.eleCanvas.style.height = (this.height + "px");
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;

    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + "px");
    this.eleDivVideoControls.style.height = (
      Math.min(80, 0.1*this.height) + "px"
    );
    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = this.paddingBottom;
    this.eleDivVideoControls.style.left = this.paddingLeft;
  }

  this._isSizePrepared = true;
  this.updateFromLoadingState();
};



/**********************************************************************/



/**
 * A Class to encapsulate the creation of suitable colors for drawing the
 * overlays and maintaining their identity over the entire video.
 */
function ColorGenerator()
{
  // member will store all colors created
  this.colors = {};

  // standard colors
  this.white = "#ffffff";
  this.black = "#000000";

  this._colorSet = undefined;
  this._colorS = "70%";
  this._colorL = "40%";
  this._colorA = "0.875";
}

/**
 * @member color
 *
 * Provide a color based on an index.
 */
ColorGenerator.prototype.color = function(index) {
  if (!(index in this.colors)) {
    this.colors[index] = this.generateNewColor();
  }
  return this.colors[index];
};


/**
 * @member @private _generateColorSet
 *
 * Generates the entire dictionary of colors.
 */
ColorGenerator.prototype._generateColorSet = function(n=36) {
  let delta = 360/n;
  this._colorSet = new Array(n);
  for (let i=0;i<n;i++) {
    this._colorSet[i] = (
      `hsla(${i*delta}, ${this._colorS}, ${this._colorL}, ${this._colorA})`);
  }
};

/**
 * @member generateNewColor
 *
 * Called to generate a random bounding box color to use in rendering.
 */
ColorGenerator.prototype.generateNewColor = function() {
  if (typeof(this._colorSet) === "undefined") {
    this._generateColorSet();
  }
  return this._colorSet[Math.floor(Math.random()*this._colorSet.length)];
};


// Instantiate one colorGenerator for global use
let colorGenerator = new ColorGenerator();


/**
 * A Class defining the generic interface for how to render overlays on the
 * video.
 *
 * Each sub-class must overload the setup and the draw functions.
 */
function Overlay()
{
}
Overlay.prototype.draw = function(context, canvasWidth, canvasHeight) {
  console.log("ERROR: draw called on abstract type");
};
Overlay.prototype.setup = function(context, canvasWidth, canvasHeight) {
  console.log("ERROR: setup called on abstract type");
};


/**
 * A Class for rendering an FrameAttributesOverlay on the Video
 *
 * @argument d is an array with the following structure
 *    [
 *      "name": "name of the attribute",
 *      "value": "value for the attribute",
 *      "confidence": confidence of the attribute
 *    ]
 *
 */
function FrameAttributesOverlay(d, player)
{
  Overlay.call(this);

  this.player = player;

  this.attrs = d.attrs;
  this.attrText = null; // will store a list of strings (one for each object in d.attrs)

  this.attrFontHeight = null;
  this.maxAttrTextWidth = -1;

  // Location and Size to draw these
  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;
  this.textPadder = null;
}
FrameAttributesOverlay.prototype = Object.create(Overlay.prototype);
FrameAttributesOverlay.prototype.constructor = FrameAttributesOverlay;

/**
 * @method setup
 * Second half of constructor that should be called after the object exists.
 *
 * @constructor
 */
FrameAttributesOverlay.prototype.setup = function(context, canvasWidth, canvasHeight) {
  if (typeof(this.attrs) !== undefined) {
    this._parseAttrs();
  }

  this.attrFontHeight = Math.min(20, 0.09*canvasHeight);
  this.attrFontHeight = this.player.checkFontHeight(this.attrFontHeight);
  // this is *0.4 instead of / 2 because it looks better
  this.textPadder = 10;

  this.x = this.textPadder;
  this.y = this.textPadder;

  // this.w is set up by the _setupWidths function

  this.h = this.attrText.length*(this.attrFontHeight+this.textPadder) + this.textPadder;

  if (typeof(context) === "undefined") {
    return;
  }

  this._setupWidths(context, canvasWidth, canvasHeight);
};

/**
 * @method _parseAttrs
 *
 * Private method to parse the attributes objects provided at creation and set
 * them up as renderable strings for the overlay.
 */
FrameAttributesOverlay.prototype._parseAttrs = function () {

  if (this.attrText === null) {
    this.attrText = new Array(this.attrs.length);
  }

  for (let len=this.attrs.length, a=0;a<len;a++) {
    let at = `${this.attrs[a].name}: ${this.attrs[a].value}`;
    this.attrText[a] = at.replace(new RegExp("_", "g"), " ");
  }
};

FrameAttributesOverlay.prototype._setupWidths = function(context, canvasWidth, canvasHeight) {
  context.font = `${this.attrFontHeight}px sans-serif`;
  let mw = 0;
  for (let a=0;a<this.attrText.length;a++) {
    let aw = context.measureText(this.attrText[a]).width;
    if (aw == 0) {
      console.log("PLAYER51 WARN: rendering context broken");
      return;
    }
    if (aw > mw) {
      mw = aw;
    }
  }
  this.maxAttrTextWidth = mw;
  this.w = this.maxAttrTextWidth + 2*this.textPadder;
};

/** @method draw
 *
 * Basic rendering function for drawing the overlay instance.
 */
FrameAttributesOverlay.prototype.draw = function(context, canvasWidth, canvasHeight) {
  if (typeof(context) === "undefined") {
    return;
  }

  if (this.w === null) {
    this._setupWidths(context, canvasWidth, canvasHeight);
    // If something went wrong in trying to estimate the sizes of things, then
    // we still cannot draw.
    if (this.w <= 0) {
      console.log("PLAYER51 WARN: FAO draw before setup; invalid canvas");
      return;
    }
  }

  if (!this.player._boolThumbnailMode) {
    context.fillStyle = this.player.metadataOverlayBGColor;
    context.fillRect(this.x, this.y, this.w, this.h);

    context.font = `${this.attrFontHeight}px sans-serif`;
    context.fillStyle = colorGenerator.white;

    // Rendering y is at the baseline of the text.  Handle this by adding
    // one row (attrFontHeight and textPadder)
    for (let a=0;a<this.attrText.length;a++) {
      context.fillText(this.attrText[a],
        this.x + this.textPadder,
        this.y + (a+1)*(this.attrFontHeight + this.textPadder));
    }
  }
};


/**
 * A Class for rendering an Overlay on the Video
 *
 * @argument d is a dictionary with the following structure
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
 */
function ObjectOverlay(d, player)
{
  Overlay.call(this);

  this.player = player;

  this.label = d.label;
  this.labelUpper = this.label.toUpperCase();
  this.index = d.index;
  this.indexStr = `${this.index}`;

  this.frame_number = d.frame_number;
  this.bounding_box = d.bounding_box;

  if (typeof(d.attrs) !== "undefined") {
    this._attrs = d.attrs.attrs;
  }
  this.attrText = null;
  this.attrTextWidth = -1;
  this.attrFontHeight = null;

  this.x = null;
  this.y = null;
  this.w = null;
  this.h = null;
  this.color = null;

  // this is the height of the header box into which we draw the label
  this.headerHeight = null;
  this.headerWidth = null;
  this.headerFontHeight = null;
  this.textPadder = null;
  this.labelTextWidth = null;
  this.indexTextWidth = null;
  this.labelIndexPadding = 51;  // extra space forced between label and index in header
}
ObjectOverlay.prototype = Object.create(Overlay.prototype);
ObjectOverlay.prototype.constructor = ObjectOverlay;

/**
 * @method setup
 * Second half of constructor that should be called after the object exists.
 *
 * @constructor
 */
ObjectOverlay.prototype.setup = function(context, canvasWidth, canvasHeight) {
  if (typeof(this._attrs) !== undefined) {
    this._parseAttrs();
  }
  this.x = this.bounding_box.top_left.x * canvasWidth;
  this.y = this.bounding_box.top_left.y * canvasHeight;
  this.w = (this.bounding_box.bottom_right.x - this.bounding_box.top_left.x) * canvasWidth;
  this.h = (this.bounding_box.bottom_right.y - this.bounding_box.top_left.y) * canvasHeight;
  this.color = colorGenerator.color(this.index);

  this.headerFontHeight = Math.min(20, 0.09*canvasHeight);
  this.headerFontHeight = this.player.checkFontHeight(this.headerFontHeight);
  this.attrFontHeight = Math.min(18, 0.088*canvasHeight);
  this.attrFontHeight = this.player.checkFontHeight(this.attrFontHeight);
  this.headerHeight = Math.min(26, 0.13*canvasHeight);
  // this is *0.4 instead of / 2 because it looks better
  this.textPadder = (this.headerHeight - this.headerFontHeight) * 0.4;

  if (typeof(context) === "undefined") {
    return;
  }

  this._setupFontWidths(context, canvasWidth, canvasHeight);
};

ObjectOverlay.prototype._setupFontWidths = function(context, canvasWidth, canvasHeight) {
  context.font = `${this.headerFontHeight}px sans-serif`;
  this.labelTextWidth = context.measureText(this.labelUpper).width;
  this.indexTextWidth = context.measureText(this.indexStr).width;

  context.font = `${this.attrFontHeight}px sans-serif`;
  this.attrFontWidth = context.measureText(this.attrText).width;

  if ((this.labelTextWidth + this.indexTextWidth + this.labelIndexPadding + 2*this.textPadder) <= this.w) {
    this.headerWidth = this.w;
  } else {
    this.headerWidth = this.labelTextWidth + this.indexTextWidth + 2*this.textPadder + this.labelIndexPadding;
  }
};

/**
 * @method _parseAttrs
 *
 * Private method to parse the attributes objects provided at creation and set
 * them up as a renderable string for the overlay.
 */
ObjectOverlay.prototype._parseAttrs = function (attrs) {
  if (this.attrText === null) {
    this.attrText = "";
  }
  if (typeof(attrs) === "undefined") {
    if (typeof(this._attrs) === "undefined")
      return;
    attrs = this._attrs;
  }

  for (let a=0;a<attrs.length;a++) {
    this.attrText = this.attrText + `${attrs[a].value}`;
    if (a < attrs.length-1) {
      this.attrText = this.attrText + ", ";
    }
  }
  this.attrText = this.attrText.replace(new RegExp("_", "g"), " ");
};

/** @method draw
 *
 * Basic rendering function for drawing the overlay instance.
 */
ObjectOverlay.prototype.draw = function(context, canvasWidth, canvasHeight) {
  if (typeof(context) === "undefined") {
    return;
  }

  if (this.labelTextWidth === null) {
    this._setupFontWidths(context, canvasWidth, canvasHeight);
  }

  context.strokeStyle = this.color;
  context.fillStyle = this.color;
  context.strokeRect(this.x, this.y, this.w, this.h);

  if (!this.player._boolThumbnailMode) {
    // fill and stroke to account for line thickness variation
    context.strokeRect(this.x, this.y - this.headerHeight,
      this.headerWidth, this.headerHeight);
    context.fillRect(this.x, this.y - this.headerHeight,
      this.headerWidth, this.headerHeight);

    context.font = `${this.headerFontHeight}px sans-serif`;
    context.fillStyle = colorGenerator.white;
    context.fillText(this.labelUpper,
      this.x + this.textPadder, this.y - this.textPadder);

    context.fillText(this.indexStr,
      this.x + this.headerWidth - 4*this.textPadder - this.indexTextWidth,
      this.y - this.textPadder);

    context.font = `${this.attrFontHeight}px sans-serif`;
    if ((typeof(this.attrFontWidth) === "undefined") ||
        (this.attrFontWidth === null)) {
      this.attrFontWidth = context.measureText(this.attrText).width;
    }
    context.fillText(this.attrText,
      this.x + this.textPadder,
      this.y + this.attrFontHeight + 3*this.textPadder);
  }
};
