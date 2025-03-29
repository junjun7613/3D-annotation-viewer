import React, { useEffect, useRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import { on } from 'events';

interface EditorProps {
  data: OutputData | undefined;
  onChange: (data: OutputData) => void;
}

const Editor: React.FC<EditorProps> = ({ data, onChange }) => {
    console.log(data)
    const editorRef = useRef<EditorJS | null>(null);
    const editorContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!editorContainerRef.current) return;

        // Editor.jsのインスタンスを作成
        editorRef.current = new EditorJS({
            holder: editorContainerRef.current,
            data: data,
            onChange: async (api, event) => {
                //const savedData = await editorRef.current?.save();
                const savedData = await api.saver.save();
                if (savedData) {
                onChange(savedData); // 親コンポーネントにデータを渡す
                }
            },
            autofocus: true,
            tools: {
                header: Header,
                list: List,
                paragraph: Paragraph,
            },
        });

        return () => {
        // コンポーネントがアンマウントされたときにEditor.jsを破棄
        if (editorRef.current && typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy(); // destroyメソッドを安全に呼び出す
            editorRef.current = null;
        }
        };
    }, [onChange]);

    /*
    // dataが変更された場合にEditor.jsの内容を更新
    useEffect(() => {
        if (editorRef.current && data) {
            console.log(editorRef.current);
            console.log(data);
            //editorRef.current.render(data);
            if (editorRef.current && data?.blocks) {
                const blocks = editorRef.current.blocks;
                //const blocks = data.blocks;
            
                // blocksが存在するか確認してから操作
                if (blocks) {
                blocks.clear(); // 現在の内容をクリア
                blocks.render({ blocks: data.blocks }); // 新しいデータをレンダリング
                } else {
                console.error('Editor.js blocks object is not available.');
                }
            }
        }
    }, [data]);
    */

    useEffect(() => {
        if (editorRef.current && data?.blocks) {
          const blocks = editorRef.current.blocks;
      
          if (blocks) {
            try {
              blocks.clear(); // 現在の内容をクリア
              blocks.render(data.blocks); // 新しいデータをレンダリング
            } catch (error) {
              console.error('Error while updating blocks:', error);
            }
          } else {
            console.error('Editor.js blocks object is not available.');
          }
        }
      }, [data]); // `data`が変更された場合にのみ実行

    return (
        <div
        ref={editorContainerRef}
        style={{ height: '160px', border: '1px solid #ccc', borderRadius: '5px', padding: '2px' }}
        />
    );
    };

export default Editor;