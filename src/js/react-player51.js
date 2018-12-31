import PropTypes from 'prop-types';
import React from 'react';
import Player51 from './player51';

class ReactPlayer51 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      canvasWidth: 0,
      canvasHeight: 0,
    };

    this.frameOverlay = {};

    this.player = new Player51(
      {
        src: props.src,
        type: props.type,
      },
      props.overlay, 
      props.fps
    );
  }

  componentDidMount = () => {
    this.parentContainer = document.getElementById('output-preview-container');
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.playButton = document.getElementById('play-pause');
    this.seekBar = document.getElementById('seekbar');
    this.controls = document.getElementById('controls');
    this.player.render('output-preview-container');
  }

  handleLoadedMetadata = () => {
    this.parentContainer.style.width = (this.video.videoWidth + 'px');
    this.parentContainer.style.height = (this.video.videoHeight + 'px');
    if (this.video.videoWidth >= 1440) {
      this.parentContainer.style.width = '1280px';
      this.parentContainer.style.height = '720px';
      this.canvas.width = '1280';
      this.canvas.height = '720';
      this.video.width = '1280';
      this.video.height = '720';
      this.setState({
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
      });
    } else {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.frameDuration = 1.0 / this.props.fps;
      this.setState({
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
      });
    }

    if (Object.keys(this.props.overlay).length > 0) {
      this.player.prepareOverlay(this.props.overlay);
    }
    
  }


  render() {
    return (
      <div id='output-preview-container' className='output-preview-container'>
        <div id='video-container' className='p51-contained-video'>
          <video onLoadedMetadata={this.handleLoadedMetadata} id='video' muted>
            <source id='video-source' src={this.props.src} type={this.props.type} />
          </video>
        </div>
        <div id='canvas-container' className='p51-contained-canvas'>
          <canvas id='canvas'></canvas>
        </div>
        <div id='controls' className='p51-video-controls'>
          <button className='p51-play-pause'  id='play-pause' type='button'>Play</button>
          <input className='p51-seek-bar' id='seekbar' type='range' defaultValue='0'/>
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
