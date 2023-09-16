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
import ServiceItem from './components/service';

declare global {
  interface Window {
    myAPI: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: any) => void;
    };
  }
}

function LocalModel2API() {
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

  const basePath = `http://localhost:${serverPort || port}/api`;

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
                onClick={() => copyToClipboard(basePath)}
              />
            </label>
          </div>
        </div>
      </div>
      <div className="w-full bg-white dark:bg-gray-900 overflow-hidden">
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="w-full p-3 pl-10 text-lg font-bold bg-gray-100 dark:bg-black">
            <div className="stat-title">Services</div>
          </div>
          <div className="p-3 border-black rounded-md h-full flex flex-col gap-4 overflow-y-auto">
            {availableServices.map((service) => (
              <ServiceItem key={service} name={service} basePath={basePath} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function copyToClipboard(text: string) {
  // Create a textarea element to temporarily hold the text
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Set the textarea to be invisible
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';

  // Append the textarea to the document
  document.body.appendChild(textarea);

  // Select the text in the textarea
  textarea.select();

  // Copy the selected text to the clipboard
  document.execCommand('copy');

  // Remove the textarea from the document
  document.body.removeChild(textarea);
}

export default function App() {
  return <LocalModel2API />;
}
