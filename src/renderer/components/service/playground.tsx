/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-undef */
/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react/destructuring-assignment */
import type { ServiceInfo } from 'types/service';
import { useState, useRef, useEffect, useId } from 'react';
import path from 'path';
import clsx from 'clsx';
import { useToggle } from 'usehooks-ts';
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
                <div key={selectedExample.urlPath + key}>
                  <label>{key}:</label>
                  {val.type === 'object' ? (
                    <textarea
                      className="w-full p-2 rounded-md overflow-hidden"
                      name={key}
                      defaultValue={JSON.stringify(val.defaultValue, null, 2)}
                      rows={7}
                    />
                  ) : val.type === 'file' ? (
                    <FileInput
                      key={selectedExample.urlPath + key}
                      name={key}
                      className="w-full"
                      accept={val.accept}
                      multiple={val.multiple}
                    />
                  ) : (
                    <input
                      className="w-full"
                      type={val.type || 'text'}
                      key={selectedExample.urlPath + key}
                      name={key}
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

function FileInput(props: {
  name: string;
  multiple?: boolean;
  accept?: string;
  className?: string;
}) {
  const dropareaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const [_, triggerReload] = useToggle();
  const id = `input-${useId()}`;

  function preventDefaults(e: any) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(e: any) {
    preventDefaults(e);
    setDropping(true);
  }

  function unhighlight(e: any) {
    preventDefaults(e);
    setDropping(false);
  }

  useEffect(() => {
    if (!dropareaRef.current) return;

    function handleDrop(e: any) {
      preventDefaults(e);

      setDropping(false);

      if (inputRef.current) inputRef.current.files = e.dataTransfer.files;
    }

    dropareaRef.current.addEventListener('drop', handleDrop, false);

    return () => {
      dropareaRef.current?.removeEventListener('drop', handleDrop, false);
    };
  }, [dropareaRef.current]);
  return (
    <div
      ref={dropareaRef}
      className={clsx(
        'border border-opacity-60 m-2 p-4',
        {
          'border-yellow-300 border-opacity-100 hover:cursor-grabbing':
            dropping,
        },
        props.className
      )}
      onDragEnter={highlight}
      onDragOver={highlight}
      onDragLeave={unhighlight}
    >
      <div className="flex flex-col gap-2 p-4 cursor-pointer min-h-16">
        {inputRef.current?.files?.length ? (
          Object.entries(inputRef.current?.files || {}).map(([i, file]) => (
            <div className="flex justify-between items-center" key={file.path}>
              <div>{file.name}</div>

              <div
                className="btn"
                onClick={() => {
                  if (!inputRef.current) return;

                  const fileListArr = Array.from(inputRef.current.files || []);
                  fileListArr.splice(parseInt(i, 10), 1); // here u remove the file
                  const dt = new DataTransfer();
                  fileListArr.forEach((file) => dt.items.add(file));

                  inputRef.current.files = dt.files;

                  triggerReload();
                }}
              >
                x
              </div>
            </div>
          ))
        ) : (
          <div
            className="text-center w-full"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Drag & Drop
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="hidden"
        name={props.name}
        multiple={props.multiple}
        accept={props.accept}
        onChange={() => {
          triggerReload();
        }}
      />
    </div>
  );
}
