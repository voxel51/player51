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
 */


// ES6 module export
export {Player51};


/**
 * Player51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 * @param media is an object that has 'src' and 'type' attributes.
 * @param overlay is the string pointing to the markup to overlay on the video
 * @param fps is the frame-rate of the media.  If it is not provided then it
 * will be guessed.
 */
function Player51(media, overlay, fps) {
  this.media = media;
  this.overlayInfo = overlay;
  this.loadOverlay();

  // initialize members to default or null values
  this.canvasWidth = null;
  this.canvasHeight = null;
  this.frameNumber = 0;
  this.frameRate = fps;
  this.frameDuration = 1.0/this.frameRate;
  this.frameZeroOffset = 1; // 1 if frame counting starts at 1; 0 otherwise
  this.videoIsPlaying = false;
  this.frameOverlay = {}; // will be used to store the labels per frame
  this.boolDrawFrameNumber = false;
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
Player51.prototype.loadOverlay = function() {
  let self = this;

  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let labelsObject = JSON.parse(this.responseText);
        self.prepareOverlay(labelsObject);
      }
  };
  xmlhttp.open("GET", this.overlayInfo, true);
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
 * PLayer51.processFrame function is responsible for drawing when a new video
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
 * @param parentElement String id of the parentElement.
 */
Player51.prototype.render = function(parentElement) {
  let parent = document.getElementById(parentElement);

  this.eleDivVideo = document.createElement("div");
  this.eleDivVideo.className = "p51-contained-video";
  this.eleVideo = document.createElement("video");
  this.eleVideo.setAttribute("width", "100%");
  this.eleVideo.setAttribute("height", "100%");
  this.eleVideo.muted = true;  // this works whereas .setAttribute does not
  this.eleVideoSource = document.createElement("source");
  this.eleVideoSource.setAttribute("src", this.media.src);
  this.eleVideoSource.setAttribute("type", this.media.type);
  this.eleVideo.appendChild(this.eleVideoSource);
  this.eleDivVideo.appendChild(this.eleVideo);
  parent.appendChild(this.eleDivVideo);

  this.eleDivCanvas = document.createElement("div");
  this.eleDivCanvas.className = "p51-contained-canvas";
  this.eleCanvas = document.createElement("canvas");
  this.eleCanvas.setAttribute("width", parent.offsetWidth);
  this.eleCanvas.setAttribute("height", parent.offsetHeight);
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
  this.canvasWidth = parent.offsetWidth;
  this.canvasHeight = parent.offsetHeight;
  this.canvasContext = this.eleCanvas.getContext("2d");
  this.canvasContext.strokeStyle = "#fff";
  this.canvasContext.fillStyle = "#fff";
  this.canvasContext.lineWidth = 1;
  this.canvasContext.font = "14px sans-serif";

  let self = this;

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener("click", function() {
    if (self.eleVideo.paused == true) {
      // Play the video
      self.eleVideo.play();
      self.videoIsPlaying = true;

      // Update the button text to 'Pause'
      self.elePlayPauseButton.innerHTML = "Pause";
    } else {
      // Pause the video
      self.eleVideo.pause();
      self.videoIsPlaying = false;

      // Update the button text to 'Play'
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
  if (cfn != this.frameNumber) {
    this.frameNumber = cfn;
    this.processFrame();
  }
  let self = this;
  setTimeout(function () {
      self.timerCallback();
    }, this.frameDuration * 500); // `* 500` is `* 1000 / 2`
};

