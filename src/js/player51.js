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
      import Player51 from '/src/js/player51.js';

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

        player.render('test-container');

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
 * Copyright 2017-2018, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 */


// ES6 module export
export default Player51;


/**
 * Player51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param media is an object that has 'src' and 'type' attributes.
 * @param overlay is data that should be overlayed on the video.  Overlay can
 * be empty (`null`), a string point to a single URL or an object that is
 * preloaded data.
 * @param fps is the frame-rate of the media.  If it is not provided then it
 * will be guessed.
 */
function Player51(media, overlay, fps) {
  this.media = media;

  this.frameOverlay = {}; // will be used to store the labels per frame
  if (typeof(overlay) === "string") {
    this.loadOverlay(overlay);
  } else if ( (typeof(overlay) === "object") && (overlay != null) && Object.keys(overlay).length > 0) {
    this.prepareOverlay(overlay);
  }

  // initialize members to default or null values
  this.canvasWidth = null;
  this.canvasHeight = null;
  this.frameNumber = undefined;
  this.frameRate = fps;
  this.frameDuration = 1.0/this.frameRate;
  this.frameZeroOffset = 1; // 1 if frame counting starts at 1; 0 otherwise
  this.videoIsPlaying = false;
  this.boolDrawFrameNumber = false;
  this.colorArr = {};
  this.width = -1;
  this.height = -1;

  // private members
  this._boolThumbnailMode = false;
  this._boolForcedSize = false;
  this._boolForcedMax = false;
  this._forcedWidth = -1;
  this._forcedHeight = -1;
};


/**
 * @member computeFrameNumber
 *
 * Uses information about the currentTime from the HTML5 video player and the
 * frameRate of the video to compute the current frame number.
 */
Player51.prototype.computeFrameNumber = function() {
  let currentFrameNumber = this.eleVideo.currentTime * this.frameRate +
    this.frameZeroOffset;
  return Math.floor(currentFrameNumber);
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
}


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
}


/**
 * @member loadOverlay
 *
 * When an overlay is a string to a json file, then we assume that it needs to
 * be loaded and this function performs that load asynchronously.
 */
Player51.prototype.loadOverlay = function(overlayPath) {
  let self = this;

  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {
        let labelsObject = JSON.parse(this.responseText);
        self.prepareOverlay(labelsObject);
      }
  };
  xmlhttp.open("GET", overlayPath, true);
  xmlhttp.send();
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
 */
Player51.prototype.prepareOverlay = function (rawjson) {

  // Format 1
  if (typeof(rawjson.objects) !== "undefined") {
    this._prepareOverlay_auxFormat1Objects(rawjson.objects);
  }

  // Format 2
  if (typeof(rawjson.frames) !== "undefined") {
    let frame_keys = Object.keys(rawjson.frames);
    for (let frame_key_i in frame_keys) {
      let frame_key = frame_keys[frame_key_i];
      let f = rawjson.frames[frame_key];
      this._prepareOverlay_auxFormat1Objects(f.objects.objects);
    }
  }
};


/**
 * Helper function to parse one of the objects in the Format 1 of the overlay
 * and add it the overlay representation.
 *
 * Args:
 *   objects is an Array of Objects with each entry an object in Format 1 above.
 */
Player51.prototype._prepareOverlay_auxFormat1Objects = function(objects) {
  for (let len = objects.length, i=0; i< len; i++) {
    let o = objects[i];
    if (o.frame_number in this.frameOverlay) {
      let thelist = this.frameOverlay[o.frame_number];
      thelist.push(o);
      this.frameOverlay[o.frame_number] = thelist;
    } else {
      // this the first time we are seeing the frame
      let newlist = [o]
      this.frameOverlay[o.frame_number] = newlist;
    }
  }
}


/**
 * @member processFrame
 *
 * Handles the rendering of a specific frame, noting that rendering has two
 * different meanings in Player51.  The Player51.render function is used to
 * actually create the Player51 and inject it into the DOM.  This
 * Player51.processFrame function is responsible for drawing when a new video
 * frame has been drawn by the underlying player.
 */
Player51.prototype.processFrame = function() {
  // Since we are rendering on a transparent canvas, we need to clean it
  // every time.
  this.canvasContext.clearRect(0,0,this.canvasWidth, this.canvasHeight);

  // @todo give a css class to the frame number so its positioning and format
  // can be controlled easily from the css
  if (this.boolDrawFrameNumber) {
    this.canvasContext.fillText(this.frameNumber, 15, 30, 70);
  }

  if (this.frameNumber in this.frameOverlay) {
    let fm = this.frameOverlay[this.frameNumber];

    for (let len = fm.length, i=0; i<len; i++) {
      let fmo = fm[i];

      let x = fmo.bounding_box.top_left.x * this.canvasWidth;
      let y = fmo.bounding_box.top_left.y * this.canvasHeight;
      let w = (fmo.bounding_box.bottom_right.x - fmo.bounding_box.top_left.x) * this.canvasWidth;
      let h = (fmo.bounding_box.bottom_right.y - fmo.bounding_box.top_left.y) * this.canvasHeight;

      this.canvasContext.strokeRect(x, y, w, h);
      let label = fmo.label + " [" + fmo.index + "]";
      if (typeof(fmo.index) !== "undefined" &&
          typeof(this.colorArr[fmo.index]) === "undefined") {
        this.colorArr[fmo.index] = this.generateBoundingBoxColor();
      }
      this.canvasContext.strokeStyle = this.colorArr[fmo.index];
      this.canvasContext.strokeRect(x, y, w, h);
      if (!this._boolThumbnailMode) {
        this.canvasContext.fillText(label, x, y+15);
      }
    }
  }

  this.frameNumber++;
  return;
};


/**
 * @member render
 * Render a new player for this media within the DOM element provided
 *
 * @param parentElement String id of the parentElement or actual Div object.
 */
Player51.prototype.render = function(parentElement) {
  let parent = undefined;
  if (typeof parentElement === "string") {
    parent = document.getElementById(parentElement);
  } else {
    parent = parentElement;
  }
  // Using the widths of the parent is a bit limiting: it requires the parent
  // to the rendered fully into the browser and configured in a way that
  // appropriately sizes the parent.  If and when the parent is resized, then
  // this code will not recognize that (and is not "responsive").

  this.eleDivVideo = document.createElement("div");
  this.eleDivVideo.className = "p51-contained-video";
  this.eleVideo = document.createElement("video");
  this.eleVideo.muted = true;  // this works whereas .setAttribute does not
  this.eleVideoSource = document.createElement("source");
  this.eleVideoSource.setAttribute("src", this.media.src);
  this.eleVideoSource.setAttribute("type", this.media.type);
  this.eleVideo.appendChild(this.eleVideoSource);
  this.eleDivVideo.appendChild(this.eleVideo);
  parent.appendChild(this.eleDivVideo);

  this.eleCanvas = document.createElement("canvas");

  this.eleDivCanvas = document.createElement("div");
  this.eleDivCanvas.className = "p51-contained-canvas";
  this.eleDivCanvas.appendChild(this.eleCanvas);
  parent.appendChild(this.eleDivCanvas);

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
  parent.appendChild(this.eleDivVideoControls);


  // after the DOM elements are created then we initialize other variables that
  // will be needed during playback
  let self = this;

  this.eleVideo.addEventListener("loadedmetadata", function() {
    // first set height to that of the container
    self.width = parent.offsetWidth;
    self.height = parent.offsetHeight;

    // if the caller wants to maximize to native pixel resolution
    if (self._boolForcedMax) {
      self.width = self.eleVideo.videoWidth;
      self.height = self.eleVideo.videoHeight;

      if (self.width >= 1440) {
        self.width = 1280;
        self.height = 720;
      }
    }

    // height priority in sizing is a forced size.
    if (self._boolForcedSize) {
      self.width = self._forcedWidth;
      self.height = self._forcedHeight;
    }

    console.log("size is " + self.width + " x " + self.height);

    parent.style.width = (self.width + "px");
    parent.style.height = (self.height + "px");

    self.eleVideo.setAttribute("width", self.width);
    self.eleVideo.setAttribute("height", self.height);
    self.eleCanvas.setAttribute("width", self.width);
    self.eleCanvas.setAttribute("height", self.height);
    self.eleCanvas.width = self.width;
    self.eleCanvas.height = self.height;
    self.canvasWidth = self.width;
    self.canvasHeight = self.height;

    // @todo move this elsewhere
    self.canvasContext = self.eleCanvas.getContext("2d");
    self.canvasContext.strokeStyle = "#fff";
    self.canvasContext.fillStyle = "#fff";
    self.canvasContext.lineWidth = 1;
    self.canvasContext.font = "14px sans-serif";
  });

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener("click", function() {
    if (self.eleVideo.paused === true) {
      // Play the video
      self.eleVideo.play();
      self.videoIsPlaying = true;

      // Update the button text to "Pause"
      self.elePlayPauseButton.innerHTML = "Pause";
    } else {
      // Pause the video
      self.eleVideo.pause();
      self.videoIsPlaying = false;

      // Update the button text to "Play"
      self.elePlayPauseButton.innerHTML = "Play";
    }
  });

  // Event listener for the seek bar
  this.eleSeekBar.addEventListener("change", function() {
    // Calculate the new time
    let time = self.eleVideo.duration * (self.eleSeekBar.valueAsNumber / 100.0);

    // Update the video time
    self.eleVideo.currentTime = time;
  });

  this.eleVideo.addEventListener("ended", function() {
    console.log("Video ended.");
    self.videoIsPlaying = false;
    self.elePlayPauseButton.innerHTML = "Play";
  });

  // Update the seek bar as the video plays
  this.eleVideo.addEventListener("timeupdate", function() {
    // Calculate the slider value
    let value = (100 / self.eleVideo.duration) * self.eleVideo.currentTime;

    // Update the slider value
    self.eleSeekBar.value = value;
  });

  // Pause the video when the seek handle is being dragged
  this.eleSeekBar.addEventListener("mousedown", function() {
    self.eleVideo.pause();
  });

  // Play the video when the seek handle is dropped
  this.eleSeekBar.addEventListener("mouseup", function() {
    if (self.videoIsPlaying) {
      self.eleVideo.play();
    }
  });

  this.eleVideo.addEventListener("play", function() {
      self.timerCallback();
    }, false);

  parent.addEventListener("mouseenter", function() {
    self.eleDivVideoControls.style.opacity = "0.9";
  });

  parent.addEventListener("mouseleave", function() {
    self.eleDivVideoControls.style.opacity = "0";
  });
}


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
 */
Player51.prototype.thumbnailMode = function() {
  this._boolThumbnailMode = true;
}

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
  if (cfn !== this.frameNumber) {
    this.frameNumber = cfn;
    this.processFrame();
  }
  let self = this;
  setTimeout(function () {
      self.timerCallback();
    }, this.frameDuration * 500); // `* 500` is `* 1000 / 2`
};


/**
 * @member generateBoundingBoxColor
 *
 * Called to generate a random bounding box color to use in rendering.
 */
Player51.prototype.generateBoundingBoxColor = function() {
  let BOUNDING_BOX_COLORS = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a"];
  return BOUNDING_BOX_COLORS[Math.floor(Math.random() * 10)];
};

