import ReactPlayer51 from "../src/js/react-player51";
import React from "react";
import ReactDOM from "react-dom";
import Overlay from "./player51-test-data/video-labels.json";

class App extends React.Component {
  render() {
    return (
      <ReactPlayer51 src="http://0.0.0.0:8000/test/player51-test-data/video.mp4" type="video/mp4" overlay={Overlay} fps={29} />
    );
  }
}

export default App;

ReactDOM.render(
  <App />,
  document.getElementById("root")
);
