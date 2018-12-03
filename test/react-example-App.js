import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import logo from './logo.svg';
import './App.css';

import { Player51 } from './player51.js';
import './player51.css';
import overlayData from './player51-test-data/8Xxvx8V-hnc-001.json';

//  XXX CHECK
// Integrating a non-react js module into a react one, requires poking some
// holes.
// See this article for using refs:
// https://reactjs.org/docs/integrating-with-other-libraries.html


        //src: "./player51-test-data/8Xxvx8V-hnc-001.mp4",
class Player51Component extends Component {
  constructor(props) {
    super(props);
    console.log('Player51Component constructor is being called.');
    this.player = new Player51(
      {
        src: "http://0.0.0.0:8000/test/player51-test-data/8Xxvx8V-hnc-001.mp4",
        type: "video/mp4"
      },
      overlayData,
      25,
    );
  }


  /** ComponentDidMoint
   *
   * @method: ComponentDidMount is called once after the React Component is
   * rendered (it is actually called after the component is passed to the HTML
   * DOM but maybe not before it is actually rendered) and this will be a safe
   * time to actually render our internal pieces.
   *
   * This approach will be confused when there are more than one Player51
   * components being rendered because it uses a unique id of the div.  This
   * would need to be extended to actually construct a unique key for the div
   * and store it as a variable to then attach the player render to.
   */
  componentDidMount() {
    console.log('ComponentDidMount is being called.');
    //this.player.render('player-container');
    console.log(this.el);
    this.player.render(this.el);
  }

  componentWillUnmount() {
    // need to destroy this.$el, the video player
  }


  render() {
    console.log('Render is being called.');
    return (
      <div
        id="player-container"
        ref={el => this.el = el}
        width="320px"
        height="180px"
        style={{width: '320px', height: '180px'}}
      >
      </div>
    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <Player51Component />
      </div>
    );
  }
}

export default App;
