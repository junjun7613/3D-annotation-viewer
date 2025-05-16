'use client';

import { useEffect, useRef, useState } from 'react';
import type EditorJS from '@editorjs/editorjs';
import { OutputData } from '@editorjs/editorjs';
export default function TestPage() {
  const editorRef = useRef<EditorJS | null>(null);
  const [editorData, setEditorData] = useState<OutputData | undefined>();

  useEffect(() => {
    if (!editorRef.current) {
      Promise.all([import('@editorjs/editorjs')]).then(([EditorJS]) => {
        editorRef.current = new EditorJS.default({
          holder: 'editorjs',
          data: {
            blocks: [
              {
                type: 'paragraph',
                data: {
                  text: 'テキストを入力してください',
                },
              },
            ],
          },
          placeholder: 'テキストを入力してください',
          onChange: async () => {
            const savedData = await editorRef.current?.save();
            setEditorData(savedData);
          },
          onReady: () => {
            console.log('Editor.js is ready to work!');
          },
        });
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-screen">
      {/* エディタ側 */}
      <div className="w-1/2 p-4 border-r">
        <div id="editorjs" className="min-h-[200px]" />
      </div>

      {/* JSON表示側 */}
      <div className="w-1/2 p-4 bg-gray-50">
        <h2 className="text-lg font-bold mb-4">JSON Output</h2>
        <pre className="bg-white p-4 rounded shadow overflow-auto h-[calc(100%-2rem)]">
          {JSON.stringify(editorData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
