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
    window.myAPI?.receive('services', (services: string[]) => {
      setAvailableServices(services);
    });
    window.myAPI?.send('services', true);

    window.myAPI?.receive('server-status', (message: string, port: number) => {
      setServerPort(port);
      setServerStatus(message as any);
    });
  }, []);

  const handleStartServer = () => {
    window.myAPI?.send('start-server', { port });
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server', null);
  };

  const handlePortChange = (e: any) => {
    setPort(Number(e.target.value));
  };

  useEffect(() => {
    handleStartServer();
  }, []);

  return (
    <div className="App bg-gray-100 dark:bg-black select-none flex flex-col md:flex-row w-screen h-screen overflow-hidden">
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

        <div className="p-6 flex flex-col gap-4 w-full">
          <div className="w-full text-center text-lg font-bold">Options</div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Server Port</span>
            </label>
            <label className="input-group">
              <span>Port</span>
              <input
                type="text"
                placeholder="3005"
                className="input input-bordered"
                value={port}
                onChange={handlePortChange}
              />
            </label>
          </div>
          {serverStatus === 'Running' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">BasePath</span>
              </label>
              <label className="input-group">
                <span className="select-all">
                  http://localhost:{serverPort}/api
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="w-full bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-2 flex flex-col gap-2 w-full">
          <div className="w-full text-center text-lg font-bold">Services</div>
          <div className="p-3 border-black rounded-md flex flex-col gap-2">
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
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState(models[0]?.name);
  const [status, setStatus] = useState<ExtractorStatus | null>(null);

  const handleLoadModel = () => {
    window.myAPI.send(`${props.name}-load`, { selectedModel });
  };

  useEffect(() => {
    window.myAPI?.receive(
      `${props.name}-models`,
      (options: { models: Model[] }) => {
        console.log({ models });
        setModels(options.models);
        setSelectedModel(options.models[0].name);
      }
    );

    window.myAPI?.send(`${props.name}-models`, true);

    const pingIntr = setInterval(() => {
      window.myAPI.send(`${props.name}-ping`, true);
    }, 500);

    window.myAPI?.receive(`${props.name}-error`, (message: string) => {
      console.log(message);
    });

    window.myAPI?.receive(
      `${props.name}-status`,
      (newStatus: ExtractorStatus) => {
        setStatus((status) => ({ ...status, ...newStatus }));
      }
    );
    return () => {
      clearInterval(pingIntr);
    };
  }, []);

  return (
    <div className="card w-full shadow-xl dark:bg-black">
      <div className="card-body">
        <div className="w-full flex justify-between items-center">
          <h2 className="card-title w-full">{props.name}</h2>
          <p
            className={clsx('status-text min-w-max', {
              'text-green-300': status?.status === 'ready',
            })}
          >
            {status?.status === 'progress' ? (
              <>progress ({status?.progress.toFixed(2)}%)</>
            ) : (
              status?.status || 'Not Ready'
            )}
          </p>
        </div>
        <div>
          <p className="status-text">Repo: {status?.name}</p>
          {status?.total && (
            <p className="status-text">
              Size: {(status.total * 10 ** -6).toFixed(2)}MB
            </p>
          )}
        </div>
        <label className="flex flex-col gap-2">
          Model:
          <select
            className="select select-ghost"
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
        <div className="card-actions justify-between">
          <div className="btn rounded-full">?</div>
          <button
            className={clsx('btn btn-primary', {
              disabled: status?.loaded && status.name === selectedModel,
            })}
            disabled={!!status?.loaded && status.name === selectedModel}
            onClick={handleLoadModel}
          >
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
