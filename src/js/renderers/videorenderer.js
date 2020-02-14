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
 * @param {int} fps is the frame-rate of the media.
 */
function VideoRenderer(media, overlay, fps) {
  Renderer.call(this, media, overlay);

  // Player State Attributes
  this._boolAutoplay = false;
  this._boolLoop = false;
  this._boolPlaying = false;
  this._boolManualSeek = false;
  this._boolShowControls = false;
  this._boolShowVideoOptions = false;
  this._boolSingleFrame = false;
  // Content Attributes
  this.frameRate = fps;
  this.frameDuration = 1 / this.frameRate;
  this.frameZeroOffset = 1;
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
  this.eleVideo.muted =
    true; // this works whereas .setAttribute does not

  this.eleVideoSource = document.createElement('source');
  this.eleVideoSource.setAttribute('src', this.media.src);
  this.eleVideoSource.setAttribute('type', this.media.type);
  this.eleVideo.appendChild(this.eleVideoSource);
  this.eleDivVideo.appendChild(this.eleVideo);
  this.parent.appendChild(this.eleDivVideo);

  // Video controls
  this.initPlayerControlHTML(this.parent);
  this.initVideoOptionsPanelHTML(this.parent);
  this.mediaElement = this.eleVideo;
  this.mediaDiv = this.eleDivVideo;
  this.initCanvas();
};


VideoRenderer.prototype.initPlayerControlHTML = function(parent) {
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
  this.eleOptionsButton = document.createElement('button');
  this.eleOptionsButton.className = 'p51-video-options';
  this.eleOptionsButton.innerHTML = 'Options';
  this.eleDivVideoControls.appendChild(this.elePlayPauseButton);
  this.eleDivVideoControls.appendChild(this.eleSeekBar);
  this.eleDivVideoControls.appendChild(this.eleOptionsButton);
  this.parent.appendChild(this.eleDivVideoControls);
};


VideoRenderer.prototype.initVideoOptionsPanelHTML = function(parent) {
  this.eleDivVideoOpts = document.createElement('div');
  this.eleDivVideoOpts.className = 'p51-video-options-panel';
  this.eleDivVideoOpts.innerHTML = 'Display options';

  const makeWrapper = function(children) {
    const wrapper = document.createElement('div');
    wrapper.className = 'p51-video-opt-input';
    for (const child of children) { // eslint-disable-line no-unused-vars
      wrapper.appendChild(child);
    }
    return wrapper;
  };

  const makeCheckbox = function(id, checked) {
    const checkbox = document.createElement('input');
    checkbox.id = id;
    checkbox.setAttribute('type', 'checkbox');
    checkbox.checked = checked;
    return checkbox;
  };

  const makeLabel = function(inputId, text) {
    const label = document.createElement('label');
    label.innerHTML = text;
    label.setAttribute('for', inputId);
    return label;
  };

  // Checkbox for show label on click only
  this.eleOptHoverCtlShowLabel = makeCheckbox(
      'eleOptHoverCtlShowLabel', this.overlayOptions.labelsOnlyOnClick);
  this.eleOptHoverCtlShowLabelLabel = makeLabel(
      this.eleOptHoverCtlShowLabel.id, 'Only show clicked object');
  this.eleOptHoverCtlShowLabelWrapper = makeWrapper([
    this.eleOptHoverCtlShowLabelLabel,
    this.eleOptHoverCtlShowLabel,
  ]);

  // Checkbox for show attrs
  this.eleOptHoverCtlShowAttr = makeCheckbox(
      'eleOptHoverCtlShowAttr', this.overlayOptions.showAttrs);
  this.eleOptHoverCtlShowAttrLabel = makeLabel(
      this.eleOptHoverCtlShowAttr.id, 'Show attributes');
  this.eleOptHoverCtlShowAttrWrapper = makeWrapper([
    this.eleOptHoverCtlShowAttrLabel,
    this.eleOptHoverCtlShowAttr,
  ]);

  // Checkbox for show attrs on click only
  this.eleOptHoverCtlShowAttrClick = makeCheckbox(
      'eleOptHoverCtlShowAttrClick', this.overlayOptions.attrsOnlyOnClick);
  this.eleOptHoverCtlShowAttrClickLabel = makeLabel(
      this.eleOptHoverCtlShowAttrClick.id, 'Only show clicked attributes');
  this.eleOptHoverCtlShowAttrClickWrapper = makeWrapper([
    this.eleOptHoverCtlShowAttrClickLabel,
    this.eleOptHoverCtlShowAttrClick,
  ]);

  // Radio for how to show attrs
  this.eleOptHoverCtlAttrOptForm = document.createElement('form');
  this.eleOptHoverCtlAttrOptForm.className = 'p51-video-opt-input';
  const formTitle = document.createElement('div');
  formTitle.innerHTML = 'Attribute rendering mode:';
  this.eleOptHoverCtlAttrOptForm.appendChild(formTitle);
  this.eleOptHoverCtlAttrOptForm.appendChild(document.createElement('div'));
  for (const val of this._attrRenderModeOptions) { // eslint-disable-line no-unused-vars
    const radio = document.createElement('input');
    radio.id = `radio-${val}`;
    radio.setAttribute('type', 'radio');
    radio.name = 'attrRenderOpt';
    radio.value = val;
    radio.checked = this.overlayOptions.attrRenderMode===val;
    const label = document.createElement('label');
    label.setAttribute('for', radio.id);
    label.innerHTML = val;
    this.eleOptHoverCtlAttrOptForm.appendChild(label);
    this.eleOptHoverCtlAttrOptForm.appendChild(radio);
  }

  this.eleDivVideoOpts.appendChild(this.eleOptHoverCtlShowLabelWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptHoverCtlShowAttrWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptHoverCtlShowAttrClickWrapper);
  this.eleDivVideoOpts.appendChild(this.eleOptHoverCtlAttrOptForm);
  this.parent.appendChild(this.eleDivVideoOpts);
};


/**
 * This loads controls for videoplayer51
 *
 * @member initPlayerControls
 * @required player to be set
 */
VideoRenderer.prototype.initPlayerControls = function() {
  this.checkPlayer();

  if (this._boolAutoplay) {
    this.eleVideo.toggleAttribute('autoplay', true);
  }

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

  this.eleOptionsButton.addEventListener('click', function() {
    self._boolShowVideoOptions = !self._boolShowVideoOptions;
    self.updateFromDynamicState();
  });

  this.eleOptHoverCtlShowLabel.addEventListener('change', function() {
    self.overlayOptions.labelsOnlyOnClick = self.eleOptHoverCtlShowLabel.checked;
    self.updateFromDynamicState();
  });

  this.eleOptHoverCtlShowAttr.addEventListener('change', function() {
    self.overlayOptions.showAttrs = self.eleOptHoverCtlShowAttr.checked;
    self.updateFromDynamicState();
  });

  this.eleOptHoverCtlShowAttrClick.addEventListener('change', function() {
    self.overlayOptions.attrsOnlyOnClick = self.eleOptHoverCtlShowAttrClick.checked;
    self.updateFromDynamicState();
  });

  for (const radio of this.eleOptHoverCtlAttrOptForm) { // eslint-disable-line no-unused-vars
    radio.addEventListener('change', () => {
      if (radio.value !== this.overlayOptions.attrRenderMode) {
        this.overlayOptions.attrRenderMode = radio.value;
        this.updateFromDynamicState();
      }
    });
  }

  this.eleVideo.addEventListener('loadedmetadata', function() {
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
    } else if (self.player._boolHasPoster) {
      if (self._hasMediaFragment) {
        self.eleVideo.currentTime = self._mfBeginT;
        self._frameNumber = self._mfBeginF;
      } else {
        self.eleVideo.currentTime = 0;
        self._frameNumber = 1;
      }
    }

    self.updateFromLoadingState();

    if (self._boolSingleFrame ) {
      self.eleVideo.currentTime = self._mfBeginT;
      self._frameNumber = self._mfBeginF;
    }

    // so that we see overlay and time stamp now that we are ready
    if ((!self.player._boolThumbnailMode) && (!self
        ._boolAutoplay)) {
      self.processFrame();
    }
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
    const value = (100 / self.eleVideo.duration) * self.eleVideo
        .currentTime;
    // Update the slider value
    self.eleSeekBar.value = value;
  });

  this.eleVideo.addEventListener('play', function() {
    self.timerCallback();
  }, false);

  this.eleVideoSource.addEventListener('error', function() {
    if (self.player._boolNotFound) {
      self.eleVideo.setAttribute('poster', self.player._notFoundPosterURL);
    }
  });

  // Event listener for the play/pause button
  this.elePlayPauseButton.addEventListener('click', function() {
    if (self._boolPlaying !== true) {
      self._boolPlaying = true;
    } else {
      self._boolPlaying = false;
    }
    self.updateFromDynamicState();
  });

  // Event listener for the seek bar
  this.eleSeekBar.addEventListener('change', function() {
    // Calculate the new time
    const time = self.eleVideo.duration * (self.eleSeekBar
        .valueAsNumber / 100.0);
    // Update the video time
    self.eleVideo.currentTime = self.computeFrameTime(
      self.computeFrameNumber(time));
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
  this.eleSeekBar.addEventListener('mouseup', function() {
    self._boolManualSeek = false;
    if (self._boolPlaying && self.eleVideo.paused) {
      self.eleVideo.currentTime = self.computeFrameTime();
      self.eleVideo.play();
    }
  });

  const hideControls = function() {
    self._boolShowControls = false;
    self.updateFromDynamicState();
  };

  this.parent.addEventListener('mouseenter', function() {
    // Two different behaviors.
    // 1.  Regular Mode: show controls.
    // 2.  Thumbnail Mode: play video
    // 3.  Single Frame Mode: annotate
    if (!self._isDataLoaded) {
      return;
    }

    if (self.player._boolThumbnailMode) {
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
      if (!self.eleDivVideoControls.contains(e.target)) {
        self.setTimeout('hideControls', hideControls, 2.5 * 1000);
      } else {
        self.clearTimeout('hideControls');
      }
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener('mouseleave', function() {
    if (!self._isDataLoaded) {
      return;
    }
    if (self.player._boolThumbnailMode) {
      self._boolPlaying = false;
      // clear things we do not want to render any more
      self.setupCanvasContext().clearRect(0, 0, self
          .canvasWidth, self
          .canvasHeight);
    } else {
      hideControls();
      self.clearTimeout('hideControls');
    }
    self.updateFromDynamicState();
  });

  this.parent.addEventListener('keydown', function(e) {
    if (self.eleVideo.ended) {
      return;
    }
    if (self.eleVideo.paused) {
      if (e.keyCode === 37) { // left arrow
        self.eleVideo.currentTime = Math.max(
            0, self.computeFrameTime() - self.frameDuration);
      } else if (e.keyCode === 39) { // right arrow
        self.eleVideo.currentTime = Math.min(
            self.eleVideo.duration,
            self.computeFrameTime() + self.frameDuration);
      }
      self.updateStateFromTimeChange();
    }
  });

  this.updateFromLoadingState();
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

  if (this._boolPlaying) {
    if (this.eleVideo.paused && !this._boolSingleFrame && !this._boolManualSeek) {
      this.eleVideo.play();
    }
    this.elePlayPauseButton.innerHTML = 'Pause';
  } else {
    if (!this.eleVideo.paused && !this._boolSingleFrame) {
      this.eleVideo.pause();
      this.eleVideo.currentTime = this.computeFrameTime();
    }
    this.elePlayPauseButton.innerHTML = 'Play';
  }

  if (this._boolShowVideoOptions && this._boolShowControls) {
    this.eleDivVideoOpts.style.opacity = '0.9';
  } else {
    this.eleDivVideoOpts.style.opacity = '0.0';
    if (this.player._boolThumbnailMode) {
      this.eleDivVideoOpts.remove();
    }
  }

  if (this._boolShowControls) {
    this.eleDivVideoControls.style.opacity = '0.9';
  } else {
    this.eleDivVideoControls.style.opacity = '0.0';
    if (this.player._boolThumbnailMode) {
      this.eleDivVideoControls.remove();
    }
  }

  this.setAttributeControlsDisplay();
};

VideoRenderer.prototype.setAttributeControlsDisplay = function() {
  let func = (node) => node.hidden = false;
  this.eleOptHoverCtlShowAttrClickWrapper.className = 'p51-video-opt-input';
  this.eleOptHoverCtlAttrOptForm.className = 'p51-video-opt-input';
  if (!this.overlayOptions.showAttrs) {
    this.eleOptHoverCtlShowAttrClickWrapper.className = '';
    this.eleOptHoverCtlAttrOptForm.className = '';
    func = (node) => node.hidden = true;
  }
  recursiveMap(this.eleOptHoverCtlShowAttrClickWrapper, func);
  recursiveMap(this.eleOptHoverCtlAttrOptForm, func);
};

/**
 * Recursively map a function to all nodes in a tree
 * @param {Object} node - an object with children accessed by .childNodes
 * @param {Function} func - function that takes node as an argument
 */
function recursiveMap(node, func) {
  node.childNodes.forEach((n) => recursiveMap(n, func));
  func(node);
}


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
    // If we had to download the overlay data and it is ready
    if ((this._overlayData !== null) && (this._overlayURL !== null)) {
      this._overlayCanBePrepared = true;
    }
  }

  if (this._overlayCanBePrepared) {
    this.prepareOverlay(this._overlayData);
  }

  if ((!isFinite(this.frameRate) || !isFinite(this.frameDuration)) &&
      isFinite(this.eleVideo.duration)) {
    // FPS wasn't provided, so guess it from the labels. If we don't have labels
    // either, we can't determine anything, so fall back to FPS = 30.
    const numFrames = Object.keys(this.frameOverlay).length ||
        this.eleVideo.duration * 30;
    this.frameRate = numFrames / this.eleVideo.duration;
    this.frameDuration = 1 / this.frameRate;
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
  let cfn = this.computeFrameNumber();
  // check if we have a media fragment and should be looping
  // if so, reset the playing location appropriately
  cfn = this.checkForFragmentReset(cfn);
  this.updateFromDynamicState();
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
  // Since we are rendering on a transparent canvas, we need to clean it
  // every time.
  // @todo double-buffering
  context.clearRect(
      0, 0, this.canvasWidth, this.canvasHeight);

  // @todo give a css class to the frame number so its positioning and format
  // can be controlled easily from the css
  if (this.player.boolDrawFrameNumber) {
    context.fillText(this._frameNumber || 0, 15, 30, 70);
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
    context.font = `${fontheight}px sans-serif`;

    const hhmmss = this.currentTimestamp();
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
  const currentFrameNumber = time * this.frameRate + this.frameZeroOffset;
  return Math.floor(currentFrameNumber);
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
 * Retrieves the current time of the video being played in a human-readable
 * format.
 *
 * @member currentTimestamp
 * @param {int} decimals
 * @return {time}
 */
VideoRenderer.prototype.currentTimestamp = function(decimals = 1) {
  let numSeconds = this.eleVideo.currentTime;
  const hours = Math.floor(numSeconds / 3600);
  numSeconds = numSeconds % 3600;
  const minutes = Math.floor(numSeconds / 60);
  const seconds = numSeconds % 60;

  return this._seconds_to_hhmmss_aux(hours) + ':' +
    this._seconds_to_hhmmss_aux(minutes) + ':' +
    this._seconds_to_hhmmss_aux(seconds.toFixed(decimals));
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
