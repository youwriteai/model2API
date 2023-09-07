/* eslint-disable no-use-before-define */
/* eslint-disable react/destructuring-assignment */
import './App.css';
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react/button-has-type */
import { useState, useEffect } from 'react';
import { ExtractorStatus } from 'types/extractor-status';
import clsx from 'clsx';
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
  const [serverStatus, setServerStatus] = useState<'Stopped' | 'Running'>(
    'Stopped'
  );

  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [serverPort, setServerPort] = useState<number>(0);

  useEffect(() => {
    window.myAPI.receive('services', (services: string[]) => {
      setAvailableServices(services);
    });
    window.myAPI.send('services', true);

    window.myAPI.receive('server-status', (message: string, port: number) => {
      setServerPort(port);
      setServerStatus(message as any);
    });
  }, []);

  const handleStartServer = () => {
    window.myAPI.send('start-server', { port });
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server', null);
  };

  const handlePortChange = (e: any) => {
    setPort(Number(e.target.value));
  };

  return (
    <div className="App bg-gray-100 select-none flex flex-col md:flex-row w-screen h-screen overflow-hidden">
      <div className="w-full md:max-w-xs">
        <div className="stat flex flex-col">
          <div className="stat-title">API Server</div>
          <div className="stat-value">{serverStatus}</div>
          <div className="stat-actions">
            {serverStatus === 'Running' ? (
              <button
                className="btn btn-sm btn-error"
                onClick={handleStopServer}
              >
                Stop Server
              </button>
            ) : (
              <button
                className="btn btn-sm btn-success"
                onClick={handleStartServer}
              >
                Start Server
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="w-full overflow-y-auto">
        {serverStatus === 'Running' && (
          <div className="flex justify-between items-center md:flex-col px-3 gap-2 w-full">
            <div className="font-bold text-lg">basePath</div>
            <div className="select-all">http://localhost:{serverPort}/v1</div>
          </div>
        )}
        <div className="p-2 flex flex-col gap-2 w-full">
          <div className="w-full text-center text-lg font-bold">Options</div>
          <div className="label-input">
            <label>
              Port:
              <input type="number" value={port} onChange={handlePortChange} />
            </label>
          </div>
        </div>
        <div className="divider" />
        <div className="p-2 flex flex-col gap-2 w-full">
          <div className="w-full text-center text-lg font-bold">Services</div>
          <div className="p-3 bg-white border-black rounded-md flex flex-col gap-2">
            {availableServices.map((service) => (
              <ServiceItem key={service} name={service} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
interface Model {
  name: string;
  loaded: boolean;
}
function ServiceItem(props: { name: string }) {
  const [selectedModel, setSelectedModel] = useState(Models[0]);

  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<ExtractorStatus | null>(null);

  const handleLoadModel = () => {
    window.myAPI.send(`${props.name}-load`, { selectedModel });
  };

  useEffect(() => {
    window.myAPI.receive(
      `${props.name}-models`,
      (options: { models: Model[] }) => {
        setModels(options.models);
      }
    );

    window.myAPI.send(`${props.name}-models`, true);

    window.myAPI.receive(`${props.name}-error`, (message: string) => {
      console.log(message);
    });

    window.myAPI.receive(
      `${props.name}-status`,
      (newStatus: ExtractorStatus) => {
        setStatus((status) => ({ ...status, ...newStatus }));
      }
    );
    return () => {};
  }, []);

  return (
    <div className="card w-full bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{props.name}</h2>
        <label>
          Model:
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
            }}
          >
            {models?.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name} {model.loaded ? '(Loaded)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="status-text">Repo: {status?.name}</p>
          {status?.total && (
            <p className="status-text">
              Total: {(status.total * 10 ** -6).toFixed(2)}MB
            </p>
          )}
          <p
            className={clsx('status-text', {
              'text-green-300': status?.status === 'ready',
            })}
          >
            Status:{' '}
            {status?.status === 'progress' ? (
              <>progress ({status?.progress.toFixed(2)}%)</>
            ) : (
              status?.status || 'Not Ready'
            )}
          </p>
        </div>
        <div className="card-actions justify-end">
          <button className="btn btn-primary" onClick={handleLoadModel}>
            Load Model
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <LocalEmbeddingAPI />;
}
