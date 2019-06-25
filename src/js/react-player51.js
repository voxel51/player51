import PropTypes from "prop-types";
import React from "react";
import Player51 from "./player51";

class ReactPlayer51 extends React.Component {
  constructor(props) {
    super(props);

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
    this.player.render("output-preview-container");
  }

  render() {
    return (
      <div id='output-preview-container' className='output-preview-container'>
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
