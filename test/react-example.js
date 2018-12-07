import ReactPlayer51 from "../src/js/react-player51";
import React from "react";
import ReactDOM from "react-dom";


class App extends React.Component {
  render() {
    return (
      <ReactPlayer51 src="" overlay="" fps={29} />
    );
  }
}

export default App;

ReactDOM.render(
  <App />,
  document.getElementById("root")
);