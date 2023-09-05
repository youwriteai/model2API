import './App.css';
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react/button-has-type */
import { useState, useEffect, useMemo } from 'react';
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

interface Service {
  name: string;
  status: ExtractorStatus | null;
  models: {
    name: string;
    loaded: boolean;
  }[];
}

function LocalEmbeddingAPI() {
  const [port, setPort] = useState(3005);
  const [serverStatus, setServerStatus] = useState('Stopped');

  const [selectedModel, setSelectedModel] = useState(Models[0]);

  const [availableModels] = useState<Record<string, true>>({});

  const [availableServices, setAvailableServices] = useState<string[]>([]);

  const [services, setServices] = useState<Record<string, Service>>({});

  const servicesArr = useMemo(() => Object.values(services), [services]);

  useEffect(() => {
    window.myAPI.receive('services', (services: string[]) => {
      setAvailableServices(services);
      setServices(() => {
        const ss: Record<string, Service> = {};
        services.forEach((service) => {
          ss[service] = {
            status: null,
            name: service,
            models: [],
          };
        });
        return ss;
      });
    });
    window.myAPI.send('services', true);
  }, []);

  useEffect(() => {
    window.myAPI.receive('server-status', (message: string) => {
      setServerStatus(message);
    });

    availableServices.forEach((service) => {
      window.myAPI.receive(`${service}-models`, (models: any) => {
        setServices((services) => {
          services[service].models = models;
          return { ...services };
        });
      });

      window.myAPI.send(`${service}-models`, true);

      window.myAPI.receive(`${service}-error`, (message: string) => {
        console.log(message);
      });

      window.myAPI.receive(
        `${service}-status`,
        (newStatus: ExtractorStatus) => {
          setServices((services) => {
            services[service].status = newStatus;
            return { ...services };
          });
        }
      );
    });
    return () => {};
  }, [availableServices]);

  const handleStartServer = () => {
    window.myAPI.send('start-server', { port, selectedModel });
  };

  const handleLoadModel = (name: string) => {
    window.myAPI.send(`${name}-load`, { selectedModel });
  };

  const handleStopServer = () => {
    window.myAPI.send('stop-server', null);
  };

  const handlePortChange = (e: any) => {
    setPort(Number(e.target.value));
  };

  return (
    <div className="App">
      {servicesArr.map((service) => (
        <div key={service.name}>
          <div>{service.name}</div>
          <div>
            <p className="status-text">Repo: {service.status?.name}</p>
            {service.status?.total && (
              <p className="status-text">
                Total: {(service.status.total * 10 ** -6).toFixed(2)}MB
              </p>
            )}
            <p
              className={clsx('status-text', {
                'text-green-300': service.status?.status === 'ready',
              })}
            >
              Status:{' '}
              {service.status?.status === 'progress' ? (
                <>progress ({service.status?.progress.toFixed(2)}%)</>
              ) : (
                service.status?.status || 'Not Ready'
              )}
            </p>
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
                    {model} {availableModels[model] ? '(Loaded)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button onClick={() => handleLoadModel(service.name)}>
            Load Model
          </button>
        </div>
      ))}

      <div>
        <div>Server</div>
        <div className="label-input">
          <label>
            Port:
            <input type="number" value={port} onChange={handlePortChange} />
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
    </div>
  );
}

export default function App() {
  return <LocalEmbeddingAPI />;
}
