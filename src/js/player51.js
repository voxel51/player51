/**
 * @module player51.js
 * @summary Defines a client-side media player that can play videos and render
 * metadata overlayed atop them.
 *
 * @desc Player51 is a javascript based image and video player that can also
 * render available annotations and markup overlayed on top of the image or
 * video.
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
 */
Player51.prototype.prepareOverlay = function (rawjson) {
  for (let len = rawjson.objects.length, i=0; i< len; i++) {
    let o = rawjson.objects[i];

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
};


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
      this.canvasContext.fillText(label, x, y+15);
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
    // Get the true height/width of the video after it loads
    let theWidth = self.eleVideo.videoWidth;
    let theHeight = self.eleVideo.videoHeight;

    parent.style.width = (self.eleVideo.videoWidth + "px");
    parent.style.height = (self.eleVideo.videoHeight + "px");

    self.eleVideo.setAttribute("width", theWidth);
    self.eleVideo.setAttribute("height", theHeight);
    self.eleCanvas.setAttribute("width", theWidth);
    self.eleCanvas.setAttribute("height", theHeight);
    // Make sure that the video does not overflow a normal screen size

    if (self.eleVideo.videoWidth >= 1440) {
      parent.style.width = "1280px";
      parent.style.height = "720px";
      self.eleCanvas.width = "1280";
      self.eleCanvas.height = "720";
      self.eleVideo.width = "1280";
      self.eleVideo.height = "720";
      self.canvasWidth = self.eleCanvas.width;
      self.canvasHeight = self.eleCanvas.height;
    } else {
      self.eleCanvas.width = self.eleVideo.videoWidth;
      self.eleCanvas.height = self.eleVideo.videoHeight;
      self.canvasWidth = self.eleCanvas.width;
      self.canvasHeight = self.eleCanvas.height;
    }

    self.canvasWidth = theWidth;
    self.canvasHeight = theHeight;
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

