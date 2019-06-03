/**
 * @module videorenderer.js
 * @summary Renders a video into the parentElement, handles the overlay and
 * produces the end output.
 *
 * @desc VideoRenderer is a class that controls the creation and viewing of
 * videoplayer51.
 *
 * Copyright 2019-2020, Voxel51, Inc.
 * Kevin Qi, kevin@voxel51.com
 */

import {
  Renderer51,
} from '../renderer51.js';

// ES6 module export
export {
  VideoRenderer,
};


/**
 * VideoRenderer Class Definition
 *
 * INHERITS: Renderer51
 * F-MIXINS: None
 @constructor
 */
function VideoRenderer() {
  Renderer51.call(this);
}
VideoRenderer.prototype = Object.create(Renderer51.prototype);
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
  this.eleVideo.muted =
    true; // this works whereas .setAttribute does not

  this.eleVideoSource = document.createElement('source');
  this.eleVideoSource.setAttribute('src', this.media.src);
  this.eleVideoSource.setAttribute('type', this.media.type);
  this.eleVideo.appendChild(this.eleVideoSource);
  this.eleDivVideo.appendChild(this.eleVideo);
  this.parent.appendChild(this.eleDivVideo);

  // Video controls
  this.eleDivVideoControls = document.createElement('div');
  this.eleDivVideoControls.className = 'p51-video-controls';
  this.elePlayPauseButton = document.createElement('button');
  this.elePlayPauseButton.setAttribute('type', 'button');
  this.elePlayPauseButton.className = 'p51-play-pause';
  this.elePlayPauseButton.innerHTML = 'Play';
  this.eleSeekBar = document.createElement('input');
  this.eleSeekBar.setAttribute('type', 'range');
  this.eleSeekBar.setAttribute('value', '0');
  this.eleSeekBar.className = 'p51-seek-bar';
  this.eleDivVideoControls.appendChild(this.elePlayPauseButton);
  this.eleDivVideoControls.appendChild(this.eleSeekBar);
  this.parent.appendChild(this.eleDivVideoControls);
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

  if (this.player._boolAutoplay) {
    this.eleVideo.toggleAttribute('autoplay', true);
  }
  if (this.player._boolLoop) {
    this.eleVideo.toggleAttribute('loop', true);
  }
  if (this.player._boolHasPoster) {
    this.eleVideo.setAttribute('poster', this.player._posterURL);
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
    self.updateSizeAndPadding();
    self.player.updateFromLoadingState();
    self.setupCanvasContext();
    self.player.updateFromLoadingState();
  });

  this.eleVideo.addEventListener('loadeddata', function() {
    self.player._isDataLoaded = true;

    // Handles the case that we have a poster frame to indicate the video is
    // loading and now we can show the video.  But when we are not autoplay.
    // We need to set the state to playing if we are set to autoplay
    //  (the player itself will handle the autoplaying)
    if (self.player._boolAutoplay) {
      self.player._boolPlaying = true;
    } else if (self.player._boolHasPoster) {
      if (self.player._hasMediaFragment) {
        self.eleVideo.currentTime = self._mfBeginT;
        self.player._frameNumber = self.player._mfBeginF;
      } else {
        self.eleVideo.currentTime = 0;
        self.player._frameNumber = 1;
      }
    }

    self.player.updateFromLoadingState();
    // so that we see overlay and time stamp now that we are ready
    if ((!self.player._boolThumbnailMode) && (!self.player
        ._boolAutoplay)) {
      self.player.processFrame();
    }
  });

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener('click', function() {
    if (self.player._boolPlaying !== true) {
      self.player._boolPlaying = true;
    } else {
      self.player._boolPlaying = false;
    }
    self.player.updateFromDynamicState();
  });

  // Event listener for the seek bar
  this.eleSeekBar.addEventListener('change', function() {
    // Calculate the new time
    const time = self.eleVideo.duration * (self.eleSeekBar
        .valueAsNumber / 100.0);
    // Update the video time
    self.eleVideo.currentTime = time;
    // Unlock the fragment so the user can browse the whole video
    self.player._lockToMF = false;
    self.player.updateStateFromTimeChange();
  });

  // Pause the video when the seek handle is being dragged
  this.eleSeekBar.addEventListener('mousedown', function() {
    if (!self.player._boolThumbnailMode) {
      self.player._boolManualSeek = true;
      // Unlock the fragment so the user can browse the whole video
      self.player._lockToMF = false;
      // We need to manually control the video-play state
      // And turn it back on as needed.
      self.eleVideo.pause();
    }
  });

  // Play the video when the seek handle is dropped
  this.eleSeekBar.addEventListener('mouseup', function() {
    self.player._boolManualSeek = false;
    if (self.player._boolPlaying) {
      self.eleVideo.play();
    }
  });

  this.eleVideo.addEventListener('ended', function() {
    self.player._boolPlaying = false;
    self.player.updateFromDynamicState();
  });

  this.eleVideo.addEventListener('pause', function() {
    // this is a pause that is fired from the video player itself and not from
    // the user clicking the play/pause button.
    // Noting the checkForFragmentReset function calls updateFromDynamicState
    self.player.checkForFragmentReset(self.player.computeFrameNumber());
  });

  // Update the seek bar as the video plays
  this.eleVideo.addEventListener('timeupdate', function() {
    // Calculate the slider value
    const value = (100 / self.eleVideo.duration) * self.eleVideo
        .currentTime;
    // Update the slider value
    self.eleSeekBar.value = value;
  });

  this.eleVideo.addEventListener('play', function() {
    self.player.timerCallback();
  }, false);

  this.parent.addEventListener('mouseenter', function() {
    // Two different behaviors.
    // 1.  Regular Mode: show controls.
    // 2.  Thumbnail Mode: play video
    if (!self.player._isDataLoaded) {
      return;
    }

    if (self.player._boolThumbnailMode) {
      self.player._boolPlaying = true;
    } else {
      self.player._boolShowControls = true;
    }
    self.player.updateFromDynamicState();
  });

  this.parent.addEventListener('mouseleave', function() {
    if (!self.player._isDataLoaded) {
      return;
    }
    if (self.player._boolThumbnailMode) {
      self.player._boolPlaying = false;
      // clear things we do not want to render any more
      self.setupCanvasContext().clearRect(0, 0, self
          .canvasWidth, self
          .canvasHeight);
    } else {
      self.player._boolShowControls = false;
    }
    self.player.updateFromDynamicState();
  });

  this.player.updateFromLoadingState();
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
 * Resizes controls
 *
 * @member resizeControls
 * @required initPlayer() to be called
 */
VideoRenderer.prototype.resizeControls = function() {
  if (this._boolBorderBox) {
    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + 'px');
    this.eleDivVideoControls.style.height = (
      Math.min(60 + this.paddingBottomN, 0.1 * this.height +
        this.paddingBottomN) + 'px'
    );

    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = (this.paddingBottomN -
      2) + 'px';
    this.eleDivVideoControls.style.left = this.paddingLeft;
  } else {
    // need to size the controls too.
    // The controls are tuned using margins when padding exists.
    this.eleDivVideoControls.style.width = (this.width + 'px');
    this.eleDivVideoControls.style.height = (
      Math.min(80, 0.1 * this.height) + 'px'
    );
    // controls have 0 padding because we want them only to show
    // on the video, this impacts their left location too.
    this.eleDivVideoControls.style.paddingLeft = 0;
    this.eleDivVideoControls.style.paddingRight = 0;
    this.eleDivVideoControls.style.bottom = this.paddingBottom;
    this.eleDivVideoControls.style.left = this.paddingLeft;
  }
};
