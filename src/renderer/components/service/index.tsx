/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react/destructuring-assignment */
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import type { ExtractorStatus } from 'types/extractor-status';
import type { ServiceInfo } from 'types/service';
import ServiceExamples from './examples';
import ServicePlayground from './playground';

export default function ServiceItem(props: { name: string; basePath: string }) {
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
    window.myAPI?.send(`${props.name}-status`, true);

    // send ping (to receive status)
    const pingIntr = setInterval(() => {
      window.myAPI.send(`${props.name}-ping`, true);
    }, 500);
    return () => {
      clearInterval(pingIntr);
    };
  }, [props.name]);

  return (
    <div className="card w-full shadow-md dark:shadow-white/5 dark:bg-black">
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
        <ServiceExamples examples={info.examples} basePath={props.basePath} />
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

          <ServicePlayground basePath={props.basePath} serviceInfo={info} />
        </div>
      </div>
    </div>
  );
}
