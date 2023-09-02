import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    myAPI: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: any) => void;
    };
  }
}

function LocalEmbeddingAPI() {
  const [port, setPort] = useState(3005);
  const [serverStatus, setServerStatus] = useState('Stopped');
  const [selectedModel, setSelectedModel] = useState('bge-large-en');

  const models = [
    'bge-large-en',
    'bge-base-en',
    'gte-large',
    'gte-base',
    'e5-large-v2',
    'bge-small-en',
    'instructor-xl',
    'instructor-large',
    'e5-base-v2',
    'multilingual-e5-large',
    'e5-large',
    'gte-small',
    'text-embedding-ada-002',
    'e5-base',
    'e5-small-v2',
    'instructor-base',
    'sentence-t5-xxl',
    'multilingual-e5-base',
    'XLM-3B5-embedding',
    'gtr-t5-xxl',
    'SGPT-5.8B-weightedmean-msmarco-specb-bitfit',
    'e5-small',
    'gtr-t5-xl',
    'gtr-t5-large',
    'XLM-0B6-embedding',
    'multilingual-e5-small',
    'sentence-t5-xl',
    'all-mpnet-base-v2',
    'sgpt-bloom-7b1-msmarco',
    'jina-embedding-l-en-v1',
    'SGPT-2.7B-weightedmean-msmarco-specb-bitfit',
    'sentence-t5-large',
    'MegatronBert-1B3-embedding',
    'all-MiniLM-L12-v2',
    'all-MiniLM-L6-v2',
    'jina-embedding-b-en-v1',
    'SGPT-1.3B-weightedmean-msmarco-specb-bitfit',
    'gtr-t5-base',
    'contriever-base-msmarco',
    // Add more models here if needed
  ];

  useEffect(() => {
    window.myAPI.receive('server-status', (message) => {
      setServerStatus(message);
    });
    return () => {};
  }, []);

  const handleStartServer = () => {
    window.myAPI.send('start-server', { port, selectedModel });
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server');
  };

  const handlePortChange = (e) => {
    setPort(Number(e.target.value));
  };

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  return (
    <div className="App">
      <div className="label-input">
        <label>
          Port:
          <input type="number" value={port} onChange={handlePortChange} />
        </label>
      </div>
      <div className="label-input">
        <label>
          Model:
          <select value={selectedModel} onChange={handleModelChange}>
            {models.map((model, index) => (
              <option key={index} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-group">
        <button onClick={handleStartServer}>Start Server</button>
        <button onClick={handleStopServer}>Stop Server</button>
      </div>
      <div>
        <p className="status-text">Server Status: {serverStatus}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LocalEmbeddingAPI />
  );
}
