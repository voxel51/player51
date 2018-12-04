let Player51 = require("player51");

const ReactPlayer51 = (fps) => {
  this.frameOverlay = {}; 
  // We will parse the JSON in React so that we always have objects to work with.
  // initialize members to default or null values
  this.canvasWidth = null;
  this.canvasHeight = null;
  this.frameNumber = 0;
  this.frameRate = fps;
  this.frameDuration = 1.0/this.frameRate;
  this.frameZeroOffset = 1; // 1 if frame counting starts at 1; 0 otherwise
  this.videoIsPlaying = false;
  this.boolDrawFrameNumber = false;
};


ReactPlayer51.prototype.render = (parentElementId, canvasId) => {
  let parent = document.getElementById(parentElementId);
  let canvas = document.getElementById(canvasId);

  let theWidth = parent.offsetWidth;
  let theHeight = parent.offsetHeight;

  // after the DOM elements are created then we initialize other variables that
  // will be needed during playback
  this.canvasWidth = theWidth;
  this.canvasHeight = theHeight;
  this.canvasContext = canvas.getContext("2d");
  this.canvasContext.strokeStyle = "#fff";
  this.canvasContext.fillStyle = "#fff";
  this.canvasContext.lineWidth = 1;
  this.canvasContext.font = "14px sans-serif";

  let self = this;
};

