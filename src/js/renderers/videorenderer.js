/**
 * @module videorenderer.js
 * @summary Renders a video into the parentElement, handles the overlay and
 * produces the end output.
 *
 * @desc VideoRenderer is a class that controls the creation and viewing of
 * videoplayer.
 *
 * Copyright 2017-2020, Voxel51, Inc.
 * Alan Stahl, alan@voxel51.com
 */

import {
  Renderer,
} from '../renderer.js';
import {
  parseMediaFragmentsUri,
} from '../mediafragments.js';

export {
  VideoRenderer,
};


/**
 * VideoRenderer Class Definition
 *
 * INHERITS: Renderer
 * F-MIXINS: None
 @constructor
 * @param {object} media is an object that has "src" and "type" attributes.
 * type must be in the format video/<format>
 * ex. type: "video/mp4"
 * @param {string} overlay is data that should be overlayed on the video.
 * Overlay can be empty (`null`), a string point to a single URL or
 * an object that is preloaded data.
 * @param {object} options: additional player options
 */
function VideoRenderer(media, overlay, options) {
  Renderer.call(this, media, overlay, options);

  // Player State Attributes
  this._boolAutoplay = false;
  this._boolLoop = false;
  this._boolPlaying = false;
  this._boolManualSeek = false;
  this._boolShowControls = false;
  this._boolSingleFrame = false;
  // Content Attributes
  this.frameRate = options.fps;
  this.frameDuration = 1 / this.frameRate;

  this._overlayCanBePrepared = false; // need to wait for video metadata
  this._isVideoMetadataLoaded = false;
  this._hasMediaFragment = false;
  this._mfBeginT = null; // Time
  this._mfEndT = null;
  this._mfBeginF = null; // Frame
  this._mfEndF = null;
  this._lockToMF = false;
  this.setMediaFragment();
}
VideoRenderer.prototype = Object.create(Renderer.prototype);
VideoRenderer.prototype.constructor = VideoRenderer;


/**
 * Initializes a video and canvas in parent
 *
 * member initPlayer
 * @required setParentandMedia called beforehand
 */
VideoRenderer.prototype.initPlayer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivVideo = document.createElement('div');
  this.eleDivVideo.className = 'p51-contained-video';
  this.eleVideo = document.createElement('video');
  this.eleVideo.className = 'p51-contained-video';
  this.eleVideo.setAttribute('preload', 'metadata');
  this.eleVideo.setAttribute('src', this.media.src);
  this.eleVideo.muted = true; // this works whereas .setAttribute does not

  this.eleDivVideo.appendChild(this.eleVideo);
  this.parent.appendChild(this.eleDivVideo);

  // Video controls
  this.initPlayerControlHTML(this.eleDivVideo);
  this.mediaElement = this.eleVideo;
  this.mediaDiv = this.eleDivVideo;
  this.initCanvas();
};


/**
 * This loads controls for videoplayer51
 *
 * @member initPlayerControls
 * @required player to be set
 */
VideoRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();

  if (this.player._boolHasPoster) {
    this.eleVideo.setAttribute('poster', this.player._loadingPosterURL);
    if (this.player._boolForcedSize) {
      const sizeStyleString = 'width:' + this.player._forcedWidth +
        'px; height:' + this.player._forcedHeight + 'px;';
      this.eleVideo.setAttribute('style', sizeStyleString);
      this.eleDivVideo.setAttribute('style', sizeStyleString);
      this.parent.setAttribute('style', sizeStyleString);
    }
  }

  // after the DOM elements are created then we initialize other variables that
  // will be needed during playback
  const self = this;

  this.eleVideo.addEventListener('loadedmetadata', function() {
    self._isVideoMetadataLoaded = true;
    self.updateSizeAndPadding();
    self.setupCanvasContext();
    self.updateFromLoadingState();
  });

  this.eleVideo.addEventListener('loadeddata', function() {
    self._isDataLoaded = true;

    // Handles the case that we have a poster frame to indicate the video is
    // loading and now we can show the video.  But when we are not autoplay.
    // We need to set the state to playing if we are set to autoplay
    //  (the player itself will handle the autoplaying)
    if (self._boolAutoplay) {
      self._boolPlaying = true;
    } else if (self._hasMediaFragment) {
      self.eleVideo.currentTime = self._mfBeginT;
      self._frameNumber = self._mfBeginF;
    } else {
      self.eleVideo.currentTime = 0;
      self._frameNumber = 1;
    }

    self.updateFromLoadingState();

    if (self._boolSingleFrame ) {
      self.eleVideo.currentTime = self._mfBeginT;
      self._frameNumber = self._mfBeginF;
    }

    // so that we see overlay and time stamp now that we are ready
    if (!self._boolAutoplay) {
      self.processFrame();
    }

    self.dispatchEvent('load');
  });

  this.eleVideo.addEventListener('ended', function() {
    if (self._boolLoop) {
      self.eleVideo.play();
    } else {
      self._boolPlaying = false;
      self.updateFromDynamicState();
    }
  });


  this.eleVideo.addEventListener('pause', function() {
    self.checkForFragmentReset(self.computeFrameNumber());
    if (self._boolPlaying && !self._lockToMF && !self._boolManualSeek &&
        !self.eleVideo.ended) {
      self.eleVideo.play();
    }
  });

  // Update the seek bar as the video plays
  this.eleVideo.addEventListener('timeupdate', function() {
    // Calculate the slider value
    const value = (self.seekBarMax / self.eleVideo.duration) * self.eleVideo
        .currentTime;
    // Update the slider value
    self.eleSeekBar.value = value;
    self.dispatchEvent('timeupdate', {
      data: {
        frame_number: self.computeFrameNumber(),
      },
    });
  });

  this.eleVideo.addEventListener('play', function() {
    self.timerCallback();
  }, false);

  this.eleVideo.addEventListener('seeked', function() {
    self.updateStateFromTimeChange();
  });

  this.eleVideo.addEventListener('error', function() {
    if (self.player._boolNotFound) {
      self.eleVideo.setAttribute('poster', self.player._notFoundPosterURL);
    }
    self.dispatchEvent('error');
  });

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener('click', function() {
    self._boolPlaying = !self._boolPlaying;
    self.updateFromDynamicState();
  });

  // Event listener for the seek bar
  this.eleSeekBar.addEventListener('change', function() {
    // Calculate the new time
    const time = self.eleVideo.duration * (self.eleSeekBar
        .valueAsNumber / self.seekBarMax);
    // Update the video time
    self.eleVideo.currentTime = self.clampTimeToFrameStart(time);
    // Unlock the fragment so the user can browse the whole video
    self._lockToMF = false;
    self._boolSingleFrame = false;
    self.updateStateFromTimeChange();
  });

  // Pause the video when the seek handle is being dragged
  this.eleSeekBar.addEventListener('mousedown', function() {
    if (!self.player._boolThumbnailMode) {
      self._boolManualSeek = true;
      // Unlock the fragment so the user can browse the whole video
      self._lockToMF = false;
      // We need to manually control the video-play state
      // And turn it back on as needed.
      self.eleVideo.pause();
    }
  });

  // Play the video when the seek handle is dropped
  this.eleSeekBar.addEventListener('mouseup', function(e) {
    self._boolManualSeek = false;
    if (self._boolPlaying && self.eleVideo.paused) {
      // Calculate the new time
      const seekRect = self.eleSeekBar.getBoundingClientRect();
      const time = self.eleVideo.duration *
          ((e.clientX - seekRect.left) / seekRect.width);
      // Update the video time
      self.eleVideo.currentTime = self.clampTimeToFrameStart(time);
      self.eleSeekBar.value = time / self.eleVideo.duration * self.seekBarMax;
      self.eleVideo.play();
    }
  });

  const hideControls = function() {
    if (self._boolShowVideoOptions) {
      return;
    }
    self._boolShowControls = false;
    self.updateFromDynamicState();
  };

  this.parent.addEventListener('mouseenter', function() {
    // Two different behaviors.
    // 1.
    // 1.  Regular Mode: show controls.
    // 2.  Thumbnail Mode: play video
    // 3.  Single Frame Mode: annotate
    self.player._boolHovering = true;
    if (!self._isDataLoaded) {
      return;
    }

    const eventArgs = {cancelable: true, data: {player: self.player}};
    if (!self.dispatchEvent('mouseenter', eventArgs)) {
      return;
    } else if (self.player._boolThumbnailMode) {
      self._boolPlaying = true;
      if (self._boolSingleFrame) {
        self.processFrame();
      }
    } else {
      self._boolShowControls = true;
      self.setTimeout('hideControls', hideControls, 2.5 * 1000);
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener('mousemove', function(e) {
    if (!self.player._boolThumbnailMode) {
      self._boolShowControls = true;
      if (self.checkMouseOnControls(e)) {
        self.clearTimeout('hideControls');
      } else {
        self.setTimeout('hideControls', hideControls, 2.5 * 1000);
      }
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener('mouseleave', function() {
    self.player._boolHovering = false;
    if (!self._isDataLoaded) {
      return;
    }

    const eventArgs = {cancelable: true, data: {player: self.player}};
    if (!self.dispatchEvent('mouseleave', eventArgs)) {
      return;
    } else if (self.player._boolThumbnailMode) {
      self._boolPlaying = false;
      // clear things we do not want to render any more
      self.clearCanvas();
    } else {
      hideControls();
      self.clearTimeout('hideControls');
    }
    self.updateFromDynamicState();
  });
};


VideoRenderer.prototype._handleKeyboardEvent = function(e) {
  Renderer.prototype._handleKeyboardEvent.call(this, e);
  if (e.keyCode === 32) { // space
    this._boolPlaying = !this._boolPlaying;
    this.updateFromDynamicState();
    return true;
  }
  // navigating frame-by-frame with arrow keys
  if (this.eleVideo.paused && this.hasFrameNumbers() &&
      (e.keyCode === 37 || e.keyCode === 39)) {
    if (e.keyCode === 37) { // left arrow
      this.eleVideo.currentTime = Math.max(
          0, this.computeFrameTime() - this.frameDuration);
    } else { // right arrow
      this.eleVideo.currentTime = Math.min(
          this.eleVideo.duration,
          this.computeFrameTime() + this.frameDuration);
    }
    this.updateStateFromTimeChange();
    return true;
  }
};


/**
 * This determines the dimensions of the media
 *
 * @member determineMediaDimensions
 * @required initPlayer() to be called
 */
VideoRenderer.prototype.determineMediaDimensions = function() {
  this.mediaHeight = this.mediaElement.videoHeight;
  this.mediaWidth = this.mediaElement.videoWidth;
};


/**
 * Return the original size of the underlying image
 *
 * @return {object|null} with keys `width` and `height`, or null if the content
 *   size cannot be determined
 */
VideoRenderer.prototype.getContentDimensions = function() {
  if (!this.mediaElement || !this._isVideoMetadataLoaded) {
    return null;
  }
  return {
    width: this.mediaElement.videoWidth,
    height: this.mediaElement.videoHeight,
  };
};


/**
 * Resizes controls
 *
 * @member resizeControls
 * @required initPlayer() to be called
 */
VideoRenderer.prototype.resizeControls = function() {
  Renderer.prototype.resizeControls.call(this);
};


/**
 * This function is a controller
 * The dynamic state of the player has changed and various settings have to be
 * toggled.
 *
 * _frameNumber is part of the dynamic state but does not call this function to
 * invoke.
 *
 * @member updateFromDynamicState
 */
VideoRenderer.prototype.updateFromDynamicState = function() {
  if (!this._isRendered || !this._isSizePrepared) {
    return;
  }
  if (this.options.fps && this.frameRate !== this.options.fps) {
    this.frameRate = this.options.fps;
    this.frameDuration = 1 / this.frameRate;
  }
  if (this._boolAutoplay) {
    this._boolAutoplay = false;
    this._boolPlaying = true;
  }
  if (this._boolPlaying) {
    if (
      this.eleVideo.paused &&
      !this._boolSingleFrame &&
      !this._boolManualSeek &&
      this._isOverlayPrepared) {
      this.eleVideo.play();
    }
  } else {
    if (!this.eleVideo.paused && !this._boolSingleFrame) {
      this.eleVideo.pause();
      this.eleVideo.currentTime = this.clampTimeToFrameStart();
      this._updateFrame();
    }
  }
  this.updatePlayButton(this._boolPlaying);
  this.updateControlsDisplayState();
  this.processFrame();
};

/**
 * This function is a controller
 * The loading state of the player has changed and various settings have to be
 * toggled.
 *
 * @member updateFromLoadingState
 */
VideoRenderer.prototype.updateFromLoadingState = function() {
  if (this._isRendered && this._isSizePrepared) {
    if (this._isDataLoaded) {
      this._isReadyProcessFrames = true;
    }
    // prepare overlay once video and labels are loaded
    if (this._overlayData !== null && this._isVideoMetadataLoaded) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
  }

  if (this._isOverlayPrepared) {
    if ((!isFinite(this.frameRate) || !isFinite(this.frameDuration)) &&
        isFinite(this.eleVideo.duration)) {
      // FPS wasn't provided, so guess it from the labels. If we don't have
      // labels either, we can't determine anything, so fall back to FPS = 30.
      const numFrames = Object.keys(this.frameOverlay).length ||
          this.eleVideo.duration * 30;
      this.frameRate = numFrames / this.eleVideo.duration;
      this.frameDuration = 1 / this.frameRate;
    }
  }
};


/**
 * This function is a controller
 * This function updates the player state when the video current time/frame has
 * been changed, which happens when the video is playing or the user manually
 * scrubs.
 *
 * @member updateStateFromTimeChange
 */
VideoRenderer.prototype.updateStateFromTimeChange = function() {
  this.updateFromDynamicState();
  this._updateFrame();
};


VideoRenderer.prototype._updateFrame = function() {
  let cfn = this.computeFrameNumber();
  // check if we have a media fragment and should be looping
  // if so, reset the playing location appropriately
  cfn = this.checkForFragmentReset(cfn);
  if (cfn !== this._frameNumber && !this.eleVideo.seeking) {
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
VideoRenderer.prototype.state = function() {
  return `
VideoPlayer State Information:
frame number: ${this._frameNumber}
playing: ${this._boolPlaying}
autoplay:  ${this._boolAutoplay}
looping:  ${this._boolLoop}
single frame: ${this._boolSingleFrame}
isReadyProcessFrames: ${this._isReadyProcessFrames}
isRendered:   ${this._isRendered}
isSizePrepared:  ${this._isSizePrepared}
isDataLoaded:  ${this._isDataLoaded}
overlayCanBePrepared: ${this._overlayCanBePrepared}
isOverlayPrepared: ${this._isOverlayPrepared}
isPreparingOverlay: ${this._isPreparingOverlay}
hasMediaFragment: ${this._hasMediaFragment}
`;
};


/**
 * Draws custom case objects onto a frame.
 *
 * @member customDraw
 * @param {context} context
 */
VideoRenderer.prototype.customDraw = function(context) {
  // @todo double-buffering
  // @todo give a css class to the frame number so its positioning and format
  // can be controlled easily from the css
  if (this.player.boolDrawFrameNumber) {
    context.fillText(this._frameNumber || 0, 15, 30, 70);
  }

  let hhmmss;

  if (this.overlayOptions.showFrameCount) {
    const frame = this.currentFrameStamp();
    const total = this.totalFrameStamp();
    this.updateTimeStamp(`${frame} / ${total}`);
  } else {
    hhmmss = this.currentTimestamp();
    const duration = this.durationStamp();
    this.updateTimeStamp(`${hhmmss} / ${duration}`);
  }


  if (this.player.boolDrawTimestamp) {
    // @todo better handling of the context paintbrush styles
    // working on a new way of forcing certain font sizes
    let fontheight = 24;
    const fhInWindow = fontheight / this.canvasMultiplier;
    if (fhInWindow < 12) {
      fontheight = 8 * this.canvasMultiplier;
    }
    fontheight = this.checkFontHeight(fontheight);
    context.font = `${fontheight}px Arial, sans-serif`;
    if (hhmmss === undefined) {
      hmmss = this.currentTimestamp();
    }
    const tw = context.measureText(hhmmss).width;
    const pad = 4;
    const pad2 = 2; // pad divided by 2
    const w = tw + pad + pad;
    const h = fontheight + pad + pad;
    const x = 10;
    const y = this.canvasHeight - 10 - pad - pad - fontheight;

    context.fillStyle = this.metadataOverlayBGColor;
    context.fillRect(x, y, w, h);

    context.fillStyle = this.colorGenerator.white;
    context.fillText(hhmmss, x + pad, y + pad + fontheight - pad2, tw +
      8);
  }
};


/**
 * This is called periodically when the video is playing.  It checks if the
 * video playing has encountered a new frame and, if so, draws the overlays for
 * that frame.
 *
 * @member timerCallback
 */
VideoRenderer.prototype.timerCallback = function() {
  if (this.eleVideo.paused || this.eleVideo.ended) {
    this._updateFrame();
    return;
  }
  this.updateStateFromTimeChange();
  // if we are manually seeking right now, then do not set the manual callback
  if (!this._boolManualSeek) {
    requestAnimationFrame(this.timerCallback.bind(this));
  } else {
    /* eslint-disable-next-line no-console */
    console.log('NOT SETTING TIME CALLBACK');
  }
};


/**
 * Sets media fragment variables.
 *
 * @member setMediaFragment
 */
VideoRenderer.prototype.setMediaFragment = function() {
  // when we have a media fragment passed in, by
  // default, we force the player to stay within that fragment.  If the video is
  // looping, for example, then it will always go to the beginning of the
  // fragment.  However, as soon as the user scrubs the video, we turn off the
  // importance of the fragment so that the user can watch the whole video.
  const mfParse = parseMediaFragmentsUri(this.media.src);
  if (typeof(mfParse.hash.t) !== 'undefined') {
    this._mfBeginT = mfParse.hash.t[0].startNormalized;
    this._mfEndT = mfParse.hash.t[0].endNormalized;
    this._mfBeginF = this.computeFrameNumber(this._mfBeginT);
    this._mfEndF = this.computeFrameNumber(this._mfEndT);
    this._hasMediaFragment = true;
    this._lockToMF = true;
    if (this._mfBeginF === this._mfEndF) {
      this._boolSingleFrame = true;
    }
  }
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
VideoRenderer.prototype.checkForFragmentReset = function(fn) {
  if ((!this._hasMediaFragment) ||
    (!this._boolPlaying) ||
    (!this._lockToMF)) {
    return fn;
  }

  if (fn >= this._mfEndF || this.eleVideo.ended) {
    if (this._boolLoop) {
      this.eleVideo.currentTime = this._mfBeginT;
      fn = this._mfBeginF;
    } else {
      this._boolPlaying = false;
    }
  }

  return fn;
};


/**
 * Computes the frame number corresponding to the given (or current) video time.
 *
 * @member computeFrameNumber
 * @param {number} time Time to compute frame number for (defaults to current
 *   player time)
 * @return {number} Frame number
 */
VideoRenderer.prototype.computeFrameNumber = function(time) {
  if (typeof(time) === 'undefined') {
    time = this.eleVideo.currentTime;
  }
  // account for exact end of video
  if (this.eleVideo && time === this.eleVideo.duration) {
    time -= this.frameDuration / 2;
  }
  const frameNumber = time * this.frameRate + this.frameZeroOffset;
  return Math.floor(frameNumber);
};


/**
 * Computes the video time corresponding to the given frame number.
 *
 * @member computeFrameTime
 * @param {number} frameNumber frame number (1-indexed, as returned by
 *   computeFrameNumber; defaults to current frame number)
 * @return {number} Video time
 */
VideoRenderer.prototype.computeFrameTime = function(frameNumber) {
  if (typeof(frameNumber) === 'undefined') {
    frameNumber = this.computeFrameNumber();
  }
  frameNumber -= this.frameZeroOffset;
  // offset by 1/100 of a frame to avoid browser issues where being *exactly*
  // on a frame boundary sometimes renders the previous frame
  return (frameNumber + 0.01) * this.frameDuration;
};


/**
 * Computes the video time of the start of the frame displayed at the specified
 * time (or if unspecified, the current video time).
 *
 * @member clampTimeToFrameStart
 * @param {number} time Video time
 * @return {number} Video time
 */

VideoRenderer.prototype.clampTimeToFrameStart = function(time) {
  if (typeof(time) === 'undefined') {
    time = this.eleVideo.currentTime;
  }
  if (!isFinite(this.frameRate)) {
    return time;
  }
  return this.computeFrameTime(this.computeFrameNumber(time));
};


/**
 * Retrieves the current video frame number as a 0-padding string
 *
 * @member currentFrameStamp
 * @return {String}
 */
VideoRenderer.prototype.currentFrameStamp = function() {
  return this._renderFrameCount(this.computeFrameNumber());
};

/**
 * Retrieves the total frames of the video as string
 *
 * @member totalFrameStamp
 * @return {String}
 */
VideoRenderer.prototype.totalFrameStamp = function() {
  return this._renderFrameCount(this.getTotalFrameCount());
};

/**
 * Gets and caches the total frames in the video.
 *
 * @member getTotalFrameCount
 * @return {int}
 */
VideoRenderer.prototype.getTotalFrameCount = function() {
  if (this.totalFrameCount === undefined) {
    this.totalFrameCount = this.computeFrameNumber(this.eleVideo.duration);
  }
  return this.totalFrameCount;
};

VideoRenderer.prototype._renderFrameCount = function(numFrames) {
  if (this._totalFramesLen === undefined) {
    this._totalFramesLen = this.getTotalFrameCount().toString().length;
  }
  let frameStr = numFrames.toString();
  while (frameStr.length<this._totalFramesLen) {
    frameStr = '0'+frameStr;
  }
  return frameStr;
};


/**
 * Retrieves the video duration in a human-readable format.
 *
 * @member currentTimestamp
 * @return {time}
 */
VideoRenderer.prototype.durationStamp = function() {
  return this._renderTime(this.eleVideo.duration);
};

/**
 * Retrieves the current time of the video being played in a human-readable
 * format.
 *
 * @member currentTimestamp
 * @return {time}
 */
VideoRenderer.prototype.currentTimestamp = function() {
  return this._renderTime(this.eleVideo.currentTime);
};

VideoRenderer.prototype._renderTime = function(numSeconds, decimals = 1) {
  const renderHours = Math.floor(this.eleVideo.duration/3600) > 0;
  let hours = 0;
  if (renderHours) {
    hours = Math.floor(numSeconds / 3600);
  }
  numSeconds = numSeconds % 3600;
  const minutes = Math.floor(numSeconds / 60);
  const seconds = numSeconds % 60;

  const mmss = this._seconds_to_hhmmss_aux(minutes) + ':' +
    this._seconds_to_hhmmss_aux(seconds.toFixed(decimals));

  if (renderHours) {
    return this._seconds_to_hhmmss_aux(hours) + ':' + mmss;
  }
  return mmss;
};

VideoRenderer.prototype._seconds_to_hhmmss_aux = function(number) {
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
