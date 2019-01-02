import ReactPlayer51 from "../src/js/react-player51";
import React from "react";
import ReactDOM from "react-dom";
import Overlay from "./player51-test-data/8Xxvx8V-hnc-001.json";

class App extends React.Component {
  render() {
    return (
      <ReactPlayer51 src="http://0.0.0.0:8000/test/player51-test-data/8Xxvx8V-hnc-001.mp4" type="video/mp4" overlay={Overlay} fps={29} />
    );
  }
}

export default App;

ReactDOM.render(
  <App />,
  document.getElementById("root")
);