/* eslint-disable no-console */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react/button-has-type */
import { useState, useEffect } from 'react';
import { ExtractorStatus } from 'types/extractor-status';
import Models from '../consts/models';

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

  const [selectedModel, setSelectedModel] = useState(Models[0]);

  const [status, setStatus] = useState<ExtractorStatus | null>(null);

  useEffect(() => {
    window.myAPI.receive('server-status', (message: string) => {
      setServerStatus(message);
    });

    window.myAPI.receive('error', (message: string) => {
      console.log(message);
    });

    window.myAPI.receive('status', (message: ExtractorStatus) => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      setStatus((status) => ({ ...status, ...message }));
      console.log(message);
    });
    return () => {};
  }, []);

  const handleStartServer = () => {
    window.myAPI.send('start-server', { port, selectedModel });
  };

  const handleLoadModel = () => {
    window.myAPI.send('load-model', { selectedModel });
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server', null);
  };

  const handlePortChange = (e: any) => {
    setPort(Number(e.target.value));
  };

  return (
    <div className="App">
      <div>
        <p className="status-text">Repo: {status?.name}</p>
        {status?.total && (
          <p className="status-text">
            Total: {(status.total * 10 ** -6).toFixed(2)}MB
          </p>
        )}
        <p
          className="status-text"
          style={{
            color: status?.status === 'ready' ? 'green' : undefined,
          }}
        >
          Status:{' '}
          {status?.status === 'progress' ? (
            <>progress ({status?.progress.toFixed(2)})</>
          ) : (
            status?.status || 'Not Ready'
          )}
        </p>
      </div>
      <div className="label-input">
        <label>
          Port:
          <input type="number" value={port} onChange={handlePortChange} />
        </label>
      </div>
      <div className="label-input">
        <label>
          Model:
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
            }}
          >
            {Models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-group">
        <button onClick={handleLoadModel}>Load Model</button>
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
  return <LocalEmbeddingAPI />;
}
