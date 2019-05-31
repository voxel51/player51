/**
 * @module renderer51.js
 * @summary Defines a client-side library that renders and sizes different
 * media players.
 *
 * @desc Renderer51 is a javascript based rendering library that loads different
 * media types into a parentElement and also initializes UI controls.
 *
 * Copyright 2017-2019, Voxel51, Inc.
 * Jason Corso, jason@voxel51.com
 * Brandon Paris, brandon@voxel51.com
 * Kevin Qi, kevin@voxel51.com
 */


// ES6 module export
export {
  Renderer51,
};


/**
 * Renderer51 Class Definition
 *
 * INHERITS:  None
 * F-MIXINS:  None
 * @constructor
 */
function Renderer51() {
  this.player = undefined;
  this.parent = undefined;
  this.media = undefined;
  // View attributes
  this.width = -1;
  this.height = -1;
  this.paddingLeft = 0;
  this.paddingRight = 0;
  this.paddingTop = 0;
  this.paddingBottom = 0;
  this._boolBorderBox = false; // is the container a border-box?
  this.metadataOverlayBGColor = 'hsla(210, 20%, 10%, 0.8)';
  // Rendering options
  this._boolBorderBox = false;
}


/**
 * This function checks if player is set
 *
 * @member checkPlayer
 */
Renderer51.prototype.checkPlayer = function() {
  if (typeof this.player === 'undefined') {
    throw new TypeError('Player not set.');
  }
};


/**
 * This function sets the player
 *
 * @member setPlayer
 * @param {player} player
 */
Renderer51.prototype.setPlayer = function(player) {
  this.player = player;
};


/**
 * This function checks if parent and media are set
 *
 * @member checkParentandMedia
 */
Renderer51.prototype.checkParentandMedia = function() {
  if (typeof this.parent === 'undefined') {
    throw new TypeError('Parent not set.');
  }

  if (typeof this.media === 'undefined') {
    throw new TypeError('Media not set.');
  }
};


/**
 * This function sets the parent of the media to be loaded.
 *
 * @member setParentandMedia
 * @param {domElement} parentElement String Id of the parentElement or actual
 * Div object.
 * @param {media} media is the media to be rendered
 */
Renderer51.prototype.setParentandMedia = function(parentElement, media) {
  if (typeof parentElement === 'string') {
    this.parent = document.getElementById(parentElement);
  } else {
    this.parent = parentElement;
  }

  this.media = media;
};


/**
 * This function checks if parent is borderBox
 *
 * @member checkBorderBox
 */
Renderer51.prototype.checkBorderBox = function() {
  const cBS = window.getComputedStyle(this.parent, null).getPropertyValue(
      'box-sizing');
  if (cBS === 'border-box') {
    this._boolBorderBox = true;
  }
};


/**
 * This function loads a canvas in parent
 *
 * @member initCanvas
 * @required setParentandMedia called beforehand
 */
Renderer51.prototype.initCanvas = function() {
  this.checkParentandMedia();
  this.eleDivCanvas = document.createElement('div');
  this.eleDivCanvas.className = 'p51-contained-canvas';
  this.eleCanvas = document.createElement('canvas');
  this.eleCanvas.className = 'p51-contained-canvas';
  this.eleDivCanvas.appendChild(this.eleCanvas);
  this.parent.appendChild(this.eleDivCanvas);
};


/**
 * Set up the canvas context for default styles.
 *
 * @member setupCanvasContext
 * @required the viewer needs to be rendered
 * @return {canvas} context
 */
Renderer51.prototype.setupCanvasContext = function() {
  this.checkPlayer();
  if (!this.player._isRendered) {
    console.log(
        'WARN: trying to set up canvas context but player not rendered'
    );
    return;
  }
  const canvasContext = this.eleCanvas.getContext('2d');
  canvasContext.strokeStyle = '#fff';
  canvasContext.fillStyle = '#fff';
  canvasContext.lineWidth = 3;
  canvasContext.font = '14px sans-serif';
  // easier for setting offsets
  canvasContext.textBaseline = 'bottom';
  return canvasContext;
};


/**
 * This function creates an image and canvas in parent
 *
 * @member initImageViewer
 * @required setParentandMedia called beforehand
 */
Renderer51.prototype.initImageViewer = function() {
  this.checkParentandMedia();
  this.checkBorderBox();
  this.eleDivImage = document.createElement('div');
  this.eleDivImage.className = 'p51-contained-image';
  this.eleImage = document.createElement('img');
  this.eleImage.className = 'p51-contained-image';
  this.eleImage.setAttribute('src', this.media.src);
  this.eleImage.setAttribute('type', this.media.type);
  this.eleDivImage.appendChild(this.eleImage);
  this.parent.appendChild(this.eleDivImage);
  this.mediaElement = this.eleImage;
  this.mediaDiv = this.eleDivImage;
  this.mediaType = 'image';
  this.initCanvas();
};


/**
 * This function loads shared UI controls
 *
 * @member initSharedControls
 * @required player to be set
 */
Renderer51.prototype.initSharedControls = function() {
  this.checkPlayer();
  if (typeof this.player._thumbnailClickAction !== 'undefined') {
    this.parent.addEventListener('click', this.player._thumbnailClickAction);
  }
};


/**
 * This function loads controls for imageviewer51
 *
 * @member initImageViewerControls
 * @required player to be set
 */
Renderer51.prototype.initImageViewerControls = function() {
  this.checkPlayer();
  const self = this;

  // Update size
  this.eleImage.addEventListener('load', function() {
    self.player._isImageLoaded = true;
    self.updateSizeAndPadding();
    self.player.annotate(self.player._overlayURL);
  });

  this.parent.addEventListener('mouseenter', function() {
    if (self.player._boolThumbnailMode) {
      self.player._boolThumbnailMode = false;
      if (self.player._overlayURL) {
        // Handle null overlays
        self.player.annotate(self.player._overlayURL);
      }
      self.player._boolThumbnailMode = true;
    }
  });

  this.parent.addEventListener('mouseleave', function() {
    if (self.player._boolThumbnailMode) {
      self.setupCanvasContext().clearRect(0, 0, self
          .canvasWidth, self.canvasHeight);
    }
  });
};


/**
 * This function creates a video and canvas in parent
 *
 * @member initVideoPlayer
 * @required setParentandMedia called beforehand
 */
Renderer51.prototype.initVideoPlayer = function() {
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
  this.mediaType = 'video';
  this.initCanvas();
};


/**
 * This function loads controls for videoplayer51
 *
 * @member initVideoPlayerControls
 * @required player to be set
 */
Renderer51.prototype.initVideoPlayerControls = function() {
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
    if ((!self.player._boolThumbnailMode) && (!self.player._boolAutoplay)) {
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
 * This function updates the size and padding based on the configuration
 *
 * @member updateSizeAndPadding
 * @required the viewer must be rendered.
 */
Renderer51.prototype.updateSizeAndPadding = function() {
  this.checkPlayer();
  this.checkParentandMedia();
  this.handleWidthAndHeight();
  this.resizeCanvas();
  this.player._isSizePrepared = true;
};


/**
 * This method is a helper function that computes necessary padding and
 * width/height and sets the media element.
 *
 * @member handleWidthAndHeight
 * @required the viewer must be rendered.
 */
Renderer51.prototype.handleWidthAndHeight = function() {
  if (!this.player._isRendered) {
    console.log(
        'WARN: Player51 trying to update size, but it is not rendered.'
    );
    return;
  }

  if (this.mediaType === 'image') {
    this.mediaHeight = this.mediaElement.height;
    this.mediaWidth = this.mediaElement.width;
  } else if (this.mediaType === 'video') {
    this.mediaHeight = this.mediaElement.videoHeight;
    this.mediaWidth = this.mediaElement.videoWidth;
  }

  this.paddingLeft = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-left');
  this.paddingRight = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-right');
  this.paddingTop = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-top');
  this.paddingBottom = window.getComputedStyle(this.parent, null)
      .getPropertyValue('padding-bottom');
  this.paddingLeftN = parseInt(this.paddingLeft.substr(0, this.paddingLeft
      .length - 2));
  this.paddingRightN = parseInt(this.paddingRight.substr(0, this
      .paddingRight.length - 2));
  this.paddingTopN = parseInt(this.paddingTop.substr(0, this.paddingTop
      .length - 2));
  this.paddingBottomN = parseInt(this.paddingBottom.substr(0, this
      .paddingBottom.length - 2));


  // Preservation is based on maintaining the height of the parent.
  // Try to maintain height of container first.  If fails, then set width.
  // Fails means that the width of the video is too wide for the container.
  this.height = this.parent.offsetHeight - this.paddingTopN - this
      .paddingBottomN;
  this.width = this.height * this.mediaWidth / this.mediaHeight;

  if (this.width > this.parent.offsetWidth - this.paddingLeftN - this
      .paddingRightN) {
    this.width = this.parent.offsetWidth - this.paddingLeftN - this
        .paddingRightN;
    this.height = this.width * this.mediaHeight / this.mediaWidth;
  }

  // if the caller wants to maximize to native pixel resolution
  if (this.player._boolForcedMax) {
    this.width = this.mediaWidth;
    this.height = this.mediaHeight;

    if (this.width >= 1440) {
      this.width = 1280;
      this.height = 720;
    }
  }

  // height priority in sizing is a forced size.
  if (this.player._boolForcedSize) {
    this.width = this.player._forcedWidth;
    this.height = this.player._forcedHeight;
  }

  // Set width and height
  this.mediaElement.setAttribute('width', this.width);
  this.mediaElement.setAttribute('height', this.height);
};


/**
 * This method is a helper function that aligns canvas dimensions
 * with image dimensions.
 *
 * @member resizeCanvas
 * @required the viewer must be rendered
 */
Renderer51.prototype.resizeCanvas = function() {
  // NOTE:: Legacy
  // Current functionality is to set a fixed size canvas so that we can
  // guarantee of consistent L&F for the overlays.
  // But, the right way to do this is probably define an abstraction to the
  // canvas size and then make the canvas the closest match to the actual
  // display size so that we do not kill so much member in creating the video
  // player.
  // this.eleCanvas.setAttribute("width", this.width);
  // this.eleCanvas.setAttribute("height", this.height);
  // this.canvasWidth = this.width;
  // this.canvasHeight = this.height;

  const canvasWidth = 1280;
  const canvasHeight = canvasWidth * this.mediaHeight / this.mediaWidth;
  this.eleCanvas.setAttribute('width', canvasWidth);
  this.eleCanvas.setAttribute('height', canvasHeight);
  this.canvasWidth = canvasWidth;
  this.canvasHeight = canvasHeight;
  this.canvasMultiplier = canvasWidth / this.width;

  this.parent.setAttribute('width', this.width);
  this.parent.setAttribute('height', this.height);

  if (this._boolBorderBox) {
    const widthstr =
      `${this.width + this.paddingLeftN + this.paddingRightN}px`;
    const heightstr =
      `${this.height + this.paddingTopN + this.paddingBottomN}px`;

    this.parent.style.width = widthstr;
    this.parent.style.height = heightstr;

    this.mediaDiv.style.width = widthstr;
    this.mediaDiv.style.height = heightstr;
    this.mediaDiv.style.paddingLeft = this.paddingLeft;
    this.mediaDiv.style.paddingRight = this.paddingRight;
    this.mediaDiv.style.paddingTop = this.paddingTop;
    this.mediaDiv.style.paddingBottom = this.paddingBottom;

    this.mediaElement.style.width = widthstr;
    this.mediaElement.style.height = heightstr;
    this.mediaElement.style.paddingLeft = this.paddingLeft;
    this.mediaElement.style.paddingRight = this.paddingRight;
    this.mediaElement.style.paddingTop = this.paddingTop;
    this.mediaElement.style.paddingBottom = this.paddingBottom;

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

    if (this.mediaType === 'video') {
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
    }
  } else {
    this.parent.style.width = (this.width + 'px');
    this.parent.style.height = (this.height + 'px');

    this.mediaDiv.style.width = (this.width + 'px');
    this.mediaDiv.style.height = (this.height + 'px');
    this.mediaDiv.style.paddingLeft = this.paddingLeft;
    this.mediaDiv.style.paddingRight = this.paddingRight;
    this.mediaDiv.style.paddingTop = this.paddingTop;
    this.mediaDiv.style.paddingBottom = this.paddingBottom;

    this.mediaElement.style.width = (this.width + 'px');
    this.mediaElement.style.height = (this.height + 'px');
    this.mediaElement.style.paddingLeft = this.paddingLeft;
    this.mediaElement.style.paddingRight = this.paddingRight;
    this.mediaElement.style.paddingTop = this.paddingTop;
    this.mediaElement.style.paddingBottom = this.paddingBottom;

    this.eleDivCanvas.style.width = (this.width + 'px');
    this.eleDivCanvas.style.height = (this.height + 'px');
    this.eleDivCanvas.style.paddingLeft = this.paddingLeft;
    this.eleDivCanvas.style.paddingRight = this.paddingRight;
    this.eleDivCanvas.style.paddingTop = this.paddingTop;
    this.eleDivCanvas.style.paddingBottom = this.paddingBottom;

    this.eleCanvas.style.width = (this.width + 'px');
    this.eleCanvas.style.height = (this.height + 'px');
    this.eleCanvas.style.paddingLeft = this.paddingLeft;
    this.eleCanvas.style.paddingRight = this.paddingRight;
    this.eleCanvas.style.paddingTop = this.paddingTop;
    this.eleCanvas.style.paddingBottom = this.paddingBottom;

    if (this.mediaType === 'video') {
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
  }
};
