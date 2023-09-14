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

  useEffect(() => {
    document.title = `${document.title.split('-')[0]}-${serverStatus}`;
  }, [serverStatus]);

  const basePath = `http://localhost:${serverPort || 'PORT'}/api`;

  return (
    <div className="App bg-gray-100 dark:bg-black select-none flex flex-col md:flex-row w-screen h-screen overflow-hidden">
      <div className="w-full h-full md:max-w-xs flex flex-col justify-between">
        <div className="flex p-2 px-10 gap-4 flex-col">
          <div className="stat-title p-2">
            API Server (
            <span
              className={clsx('status-text min-w-max', {
                'text-green-300': serverStatus === 'Running',
                'text-red-300': serverStatus === 'Stopped',
              })}
            >
              {serverStatus}
            </span>
            )
          </div>
          <div className="stat-value">{serverStatus}</div>
          <div className="flex items-end flex-wrap md:items-start justify-between gap-3 sm:flex-col w-full">
            <div className="form-control w-full xs:w-auto sm:w-full">
              <span>Port</span>
              <label className="input-group w-full">
                <input
                  type="text"
                  placeholder="3005"
                  className="input input-sm w-full xs:w-auto sm:w-full input-bordered"
                  value={port}
                  onChange={handlePortChange}
                />
              </label>
            </div>
            <div className="flex justify-center items-center w-full xs:w-auto sm:w-full py-5">
              {serverStatus === 'Running' ? (
                <button
                  className="btn w-full btn-md btn-error"
                  onClick={handleStopServer}
                >
                  Stop Server
                </button>
              ) : (
                <button
                  className="btn w-full btn-md btn-success"
                  onClick={handleStartServer}
                >
                  Start Server
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 px-10 flex flex-col">
          <div className="form-control w-full xs:w-auto sm:w-full">
            <span>Basepath</span>
            <label className="input-group w-full">
              <input
                type="text"
                className="input input-ghost input-sm select-all w-full xs:w-auto sm:w-full input-bordered"
                value={basePath}
                readOnly
                onChange={handlePortChange}
              />
            </label>
          </div>
        </div>{' '}
      </div>
      <div className="w-full bg-white dark:bg-gray-900 overflow-hidden">
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="w-full p-3 pl-10 text-lg font-bold bg-gray-100 dark:bg-black">
            <div className="stat-title">Services</div>
          </div>
          <div className="p-3 border-black rounded-md h-full flex flex-col gap-4 overflow-y-auto">
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
    <div className="card w-full shadow-xl dark:shadow-white/5 dark:bg-black">
      <div className="card-body flex flex-col gap-8">
        <div className="flex flex-col w-full gap-2">
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
        </div>
        <ServiceExamples examples={info.examples} url={props.url} />
        <div className="flex flex-col card-actions w-full">
          <div className="flex items-center justify-between w-full">
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
      </div>
    </div>
  );
}

export default function App() {
  return <LocalEmbeddingAPI />;
}
