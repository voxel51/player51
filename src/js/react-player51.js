import PropTypes from 'prop-types';
import React from 'react';

class ReactPlayer51 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      canvasWidth: null,
      canvasHeight: null,
      frameNumber: 0,
      frameZeroOffset: 1, // 1 if frame counting starts at 1; 0 otherwise
      videoIsPlaying: false,
      boolDrawFrameNumber: false,
    };

    this.parentContainerRef = React.createRef();
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.controls = React.createRef();
    this.playPauseButton = React.createRef();
    this.seekBar = React.createRef();
    this.frameOverlay = {};
  }

  handleLoadedMetadata = () => {
    this.parentContainerRef.current.style.width = (this.videoRef.current.videoWidth + 'px');
    this.parentContainerRef.current.style.height = (this.videoRef.current.videoHeight + 'px');
    if (this.videoRef.current.videoWidth >= 1440) {
      this.parentContainerRef.current.style.width = '1280px';
      this.parentContainerRef.current.style.height = '720px';
      this.canvasRef.current.width = '1280';
      this.canvasRef.current.height = '720';
      this.videoRef.current.width = '1280';
      this.videoRef.current.height = '720';
      this.setState({
        canvasWidth: this.canvasRef.current.width,
        canvasHeight: this.canvasRef.current.height,
      });
    } else {
      this.canvasRef.current.width = this.videoRef.current.videoWidth;
      this.canvasRef.current.height = this.videoRef.current.videoHeight;
      this.frameDuration = 1.0 / this.props.fps;
      this.setState({
        canvasWidth: this.canvasRef.current.width,
        canvasHeight: this.canvasRef.current.height,
      });
    }

    this.ctx = this.canvasRef.current.getContext('2d');
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.font = '14px sans-serif';
    if (Object.keys(this.props.overlay).length > 0) {
      this.prepareOverlay(this.props.overlay);
    }
  }

  prepareOverlay = (rawjson) => {
    for (let len = rawjson.objects.length, i=0; i < len; i++) {
      let o = rawjson.objects[i];
      if (o.frame_number in this.frameOverlay) {
        let thelist = this.frameOverlay[o.frame_number];
        thelist.push(o);
        this.frameOverlay[o.frame_number] = thelist;
      } else {
        // this the first time we are seeing the frame
        let newlist = [o];
        this.frameOverlay[o.frame_number] = newlist;
      }
    }
  }

  handlePlay = () => {
    if (this.playPauseButton.current) {
      if (this.videoRef.current.paused) {
        this.videoRef.current.play();
        if (Object.keys(this.props.overlay).length > 0) {
          this.setState({
            videoIsPlaying: true,
          }, this.timerCallBack);
        } else {
          this.setState({
            videoIsPlaying: true,
          });
        }
      } else {
        // Pause the video
        this.videoRef.current.pause();
        this.setState({
          videoIsPlaying: false,
        });
      }
    }
  }

  handleSeek = () => {
    if (this.seekBar.current) {
      let time = this.videoRef.current.duration * (this.seekBar.current.valueAsNumber / 100.0);
      this.videoRef.current.currentTime = time;
    }
  }

  handleMouseDown = () => {
    this.videoRef.current.pause();
  }

  handleMouseUp = () => {
    if (this.state.videoIsPlaying) {
      this.videoRef.current.play();
    }
  }

  handleMouseEnter = () => {
    this.controls.current.style.opacity = '0.9';
  }

  handleMouseLeave = () => {
    this.controls.current.style.opacity = '0';
  }

  handleEndVideo = () => {
    this.setState({
      videoIsPlaying: false,
    });
  }

  handleTimeUpdate = () => {
    let value = (100 / this.videoRef.current.duration) * this.videoRef.current.currentTime;
    // Update the slider value
    this.seekBar.current.value = value;
  }

  timerCallBack = () => {
    let self = this;
    if (!this.videoRef.current || this.videoRef.current.paused || this.videoRef.current.ended) {
      return;
    }
    let cfn = this.computeFrameNumber();
    if (cfn !== this.state.frameNumber) {
      this.setState({
        frameNumber: cfn,
      }, this.processFrame);
    }
    setTimeout(function() {
      self.timerCallBack();
    }, self.frameDuration * 500); // `* 500` is `* 1000 / 2`
  }

  computeFrameNumber = () => {
    let currentFrameNumber = this.videoRef.current.currentTime * this.props.fps +
    this.state.frameZeroOffset;
    return Math.floor(currentFrameNumber);
  }

  processFrame = () => {
    // Since we are rendering on a transparent canvas, we need to clean it
    // every time.
    this.ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    // @todo give a css class to the frame number so its positioning and format
    // can be controlled easily from the css
    if (this.state.boolDrawFrameNumber) {
      this.ctx.fillText(this.state.frameNumber, 15, 30, 70);
    }
    if (this.state.frameNumber in this.frameOverlay) {
      let fm = this.frameOverlay[this.state.frameNumber];
      for (let len = fm.length, i=0; i<len; i++) {
        let fmo = fm[i];

        let x = fmo.bounding_box.top_left.x * this.state.canvasWidth;
        let y = fmo.bounding_box.top_left.y * this.state.canvasHeight;
        let w = (fmo.bounding_box.bottom_right.x - fmo.bounding_box.top_left.x) * this.state.canvasWidth;
        let h = (fmo.bounding_box.bottom_right.y - fmo.bounding_box.top_left.y) * this.state.canvasHeight;

        this.ctx.strokeRect(x, y, w, h);
        let label = fmo.label + ' [' + fmo.index + ']';
        this.ctx.fillText(label, x, y+15);
      }
    }

    this.setState((prevState) => {
      return {
        frameNumber: prevState.frameNumber + 1,
      };
    });
  }

  render() {
    return (
      <div ref={this.parentContainerRef} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} className='output-preview-container'>
        <div id='video-container' className='p51-contained-video'>
          <video onLoadedMetadata={this.handleLoadedMetadata} onTimeUpdate={this.handleTimeUpdate} onEnded={this.handleEndVideo} ref={this.videoRef} muted>
            <source id='video-source' src={this.props.src} type={this.props.type} />
          </video>
        </div>
        <div id='canvas-container' className='p51-contained-canvas'>
          <canvas ref={this.canvasRef}></canvas>
        </div>
        <div className='p51-video-controls' ref={this.controls}>
          <button className='p51-play-pause'  ref={this.playPauseButton} onClick={this.handlePlay} type='button'>{this.state.videoIsPlaying ? 'Pause' : 'Play'}</button>
          <input className='p51-seek-bar' ref={this.seekBar} type='range' onMouseUp={this.handleMouseUp} onMouseDown={this.handleMouseDown} onChange={this.handleSeek} defaultValue='0'/>
        </div>
        <button onClick={this.props.onClose} id='close-button' className='btn close video-close-button'>&times;</button>
      </div>
    );
  }
}

ReactPlayer51.propTypes = {
  onClose: PropTypes.func,
  type: PropTypes.object,
  src: PropTypes.string.isRequired,
  overlay: PropTypes.object,
  fps: PropTypes.number.isRequired,
};

export default ReactPlayer51;
