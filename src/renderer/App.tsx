import * as React from 'react';

const App: React.FC = () => {
  return (
    <div className="app">
      <div className="left-pane">
        <div className="pane-header">
          <span>Terminals</span>
          <button className="add-btn">+</button>
        </div>
        <div className="pane-content">
          <p>No terminals open</p>
        </div>
      </div>
      <div className="center-pane">
        <div className="pane-content">
          <p>Select or create a terminal</p>
        </div>
      </div>
      <div className="right-pane">
        <div className="pane-header">
          <span>Files</span>
        </div>
        <div className="pane-content">
          <p>No directory selected</p>
        </div>
      </div>
    </div>
  );
};

export default App;
