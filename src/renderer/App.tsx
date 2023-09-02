import React, { useState, useEffect } from 'react';
import icon from '../../assets/icon.svg';
import './App.css';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

declare global {
  interface Window {
    myAPI: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: any) => void;
    };
  }
}

function Hello() {
  const [port, setPort] = useState(3005);
  const [serverStatus, setServerStatus] = useState('Stopped');

  useEffect(() => {
    window.myAPI.receive('server-status', (message) => {
      setServerStatus(message);
    });

    // Clean-up function
    return () => {
      // Unsubscribe any IPC event listeners if needed
    };
  }, []);

  const handleStartServer = () => {
    window.myAPI.send('start-server', port);
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server');
  };

  const handlePortChange = (e) => {
    setPort(Number(e.target.value));
  };

  return (
    <div>
      <div>
        <label>
          Port:
          <input type="number" value={port} onChange={handlePortChange} />
        </label>
        <button onClick={handleStartServer}>Start Server</button>
        <button onClick={handleStopServer}>Stop Server</button>
      </div>
      <div>
        <p>Server Status: {serverStatus}</p>
      </div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="folded hands">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
