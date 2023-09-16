/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react/destructuring-assignment */
import type { ServiceInfo } from 'types/service';
import { useState } from 'react';
import path from 'path';
import clsx from 'clsx';
import Dropdown from '../dropdown';

export default function ServicePlayground(props: {
  basePath: string;
  serviceInfo: ServiceInfo;
}) {
  const [loading, setLoading] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const e = props.serviceInfo.examples[0];

  const [selectedEndpoint, setSelectedEndpoint] = useState(
    `${0}: ${e?.urlPath} (${e?.title})`
  );

  const selectedExample =
    props.serviceInfo.examples[
      parseInt(selectedEndpoint.split(': ')[0] || '0', 10)
    ];

  const url =
    selectedExample?.urlPath &&
    new URL(
      path.join(new URL(props.basePath).pathname, selectedExample.urlPath),
      props.basePath
    ).href;

  const method = selectedExample?.method || 'POST';

  return (
    <div className="flex flex-col gap-4 w-full">
      <button
        className="btn btn-sm w-fit"
        onClick={() => setShowPlayground((o) => !o)}
      >
        Playground
      </button>
      {showPlayground && (
        <div className="flex flex-col gap-3 w-full">
          {/* select endpoint */}
          <div className="flex gap-3 items-center w-full">
            <div>Example:</div>
            <Dropdown
              values={
                props.serviceInfo?.examples.map(
                  (e, i) =>
                    `${i}: ${e.method?.toUpperCase() || 'POST'}: ${
                      e.urlPath
                    } (${e.title})`
                ) || []
              }
              value={selectedEndpoint}
              setValue={setSelectedEndpoint}
            />
          </div>
          {selectedExample && (
            <form
              className="w-full"
              action={url}
              method={method}
              encType={selectedExample.enctype}
              onSubmit={async (e) => {
                setLoading(true);
                e.preventDefault(); // Prevent the default form submission behavior (page refresh)
                setError('');
                const formData = new FormData(e.target as any);

                try {
                  const response = await fetch(url, {
                    method,
                    body: formData,
                  });

                  Object.entries(selectedExample.body || {}).forEach(
                    ([key, val]) => {
                      if (val.type === 'object') {
                        const str = formData.get(key);
                        if (!str) return;
                        const data = JSON.parse(`${str}`);
                        formData.delete(key);
                        formData.append(key, data);
                        console.log(data, formData);
                      }
                      // formData.set(key, JSON.parse);
                    }
                  );

                  if (response.ok) {
                    const data = await response.json();
                    setResponse(JSON.stringify(data, null, 2));
                  } else {
                    setError(await response.text());
                  }
                } catch (error: any) {
                  setError(error.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {/* body object */}
              {Object.entries(selectedExample.body || {}).map(([key, val]) => (
                <div>
                  <label>{key}:</label>
                  {val.type === 'object' ? (
                    <textarea
                      className="w-full p-2 rounded-md overflow-hidden"
                      key={selectedExample.urlPath + key}
                      name={key}
                      id={key}
                      defaultValue={JSON.stringify(val.defaultValue, null, 2)}
                      rows={7}
                    />
                  ) : (
                    <input
                      className="w-full"
                      type={val.type || 'text'}
                      key={selectedExample.urlPath + key}
                      name={key}
                      id={key}
                      defaultValue={val.defaultValue as any}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end">
                <input
                  className={clsx('btn btn-primary', {
                    loading,
                  })}
                  type="submit"
                  value={selectedExample.method || 'POST'}
                />
              </div>
            </form>
          )}

          <div>{error ? 'Error' : 'Response'}:</div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-60">
            <div className="select-text">{error || response}</div>
          </div>
        </div>
      )}
    </div>
  );
}
