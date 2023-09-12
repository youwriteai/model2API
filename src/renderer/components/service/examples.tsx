/* eslint-disable react/no-array-index-key */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { ServiceExample } from '../../../types/service';

export default function ServiceExamples(props: {
  examples: ServiceExample[];
  url: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-2">
        {props.examples?.map((example) => (
          <div key={example.curl} className="mockup-code">
            {example.title && (
              <pre>
                <code className="select-all">{example.title}</code>
              </pre>
            )}
            {example.description && (
              <pre>
                <code className="select-all">{example.description}</code>
              </pre>
            )}
            {example.curl
              ?.replaceAll('{{URL}}', props.url)
              .split('\n')
              .map((s, i) => (
                <pre key={s + i} data-prefix={i === 0 ? '>' : '  '}>
                  <code className="select-text">{s.trim()}</code>
                </pre>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
