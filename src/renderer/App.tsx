/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable no-use-before-define */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/button-has-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import './App.css';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ExtractorStatus } from '../types/extractor-status';
import { ServiceInfo } from '../types/service';
import ServiceExamples from './components/service/examples';

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

  const basePath = `http://localhost:${serverPort || 'PORT'}/api`;

  return (
    <div className="App bg-gray-100 dark:bg-black select-none flex flex-col md:flex-row w-screen h-screen overflow-hidden">
      <div className="w-full md:max-w-xs">
        <div className="flex p-3 gap-4 flex-col">
          <div className="stat-title">API Server</div>
          <div className="stat-value">{serverStatus}</div>
          <div className="flex items-end flex-wrap md:items-start justify-between gap-3 md:flex-col w-full">
            <div className="form-control">
              <span>Basepath</span>
              <label className="input-group">
                <input
                  type="text"
                  className="input input-sm select-all input-bordered"
                  value={basePath}
                  readOnly
                  onChange={handlePortChange}
                />
              </label>
            </div>
            <div className="form-control">
              <span>Port</span>
              <label className="input-group">
                <input
                  type="text"
                  placeholder="3005"
                  className="input input-sm input-bordered"
                  value={port}
                  onChange={handlePortChange}
                />
              </label>
            </div>
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
      <div className="w-full bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-2 flex flex-col gap-2 w-full">
          <div className="w-full text-center text-lg font-bold">Services</div>
          <div className="p-3 border-black rounded-md flex flex-col gap-2">
            {availableServices.map((service) => (
              <ServiceItem key={service} name={service} url={basePath} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceItem(props: { name: string; url: string }) {
  const [info, setInfo] = useState<ServiceInfo>({
    description: '',
    examples: [],
    models: [],
  });
  const models = info.models || [];
  const [selectedModel, setSelectedModel] = useState(models[0]?.name);
  const [status, setStatus] = useState<ExtractorStatus | null>(null);

  const handleLoadModel = () => {
    window.myAPI.send(`${props.name}-load`, { selectedModel });
  };

  useEffect(() => {
    // get service info
    window.myAPI?.receive(`${props.name}-info`, (info: ServiceInfo) => {
      console.log(info);
      setInfo(info);
      setSelectedModel(info.models[0].name);
    });

    // get errors
    window.myAPI?.receive(`${props.name}-error`, (message: string) => {
      console.log(message);
    });

    // get status
    window.myAPI?.receive(
      `${props.name}-status`,
      (newStatus: ExtractorStatus) => {
        setStatus((status) => ({ ...status, ...newStatus }));
      }
    );

    // request models
    window.myAPI?.send(`${props.name}-info`, true);

    // send ping (to receive status)
    const pingIntr = setInterval(() => {
      window.myAPI.send(`${props.name}-ping`, true);
    }, 500);
    return () => {
      clearInterval(pingIntr);
    };
  }, [props.name]);

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

        <div className="card-actions w-full items-center justify-between">
          <div className="flex items-center">
            <label>Model:</label>
            <select
              className="select w-full select-ghost"
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
          </div>
          <button
            className={clsx('btn btn-sm', {
              disabled: status?.loaded && status.name === selectedModel,
            })}
            disabled={!!status?.loaded && status.name === selectedModel}
            onClick={handleLoadModel}
          >
            Load Model
          </button>
        </div>
      </div>
      <ServiceExamples examples={info.examples} url={props.url} />
    </div>
  );
}

export default function App() {
  return <LocalEmbeddingAPI />;
}
