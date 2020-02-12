import PropTypes from 'prop-types';
import React from 'react';
import Player51 from './player51';

/**
 * A Player51 React wrapper
 */
class ReactPlayer51 extends React.Component {
  /**
   * Constructs a new ReactPlayer51 instance.
   * @param {object} props See player51.js for details
   */
  constructor(props) {
    super(props);

    this.player = new Player51({
      media: {
        src: props.src,
        type: props.type,
      },
      overlay: props.overlay,
      fps: props.fps,
      isSequence: props.isSequence,
    });
  }

  /**
   * Sets up the player.
   */
  componentDidMount() {
    this.player.render('output-preview-container');
  }

  /**
   * Renders the player.
   * @return {element} rendered player
   */
  render() {
    return (
      <div id='output-preview-container' className='output-preview-container'>
        <button onClick={this.props.onClose}
          id='close-button'
          className='btn close video-close-button'>
          &times;
        </button>
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
  isSequence: PropTypes.bool,
};

export default ReactPlayer51;
