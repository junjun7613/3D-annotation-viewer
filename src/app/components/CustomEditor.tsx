'use client'

import React, { useRef, useEffect } from 'react';
import {CKEditor} from '@ckeditor/ckeditor5-react';
import {ClassicEditor, Essentials, Paragraph, Bold, Italic} from 'ckeditor5';
import { FormatPainter } from 'ckeditor5-premium-features';

import 'ckeditor5/ckeditor5.css';
import 'ckeditor5-premium-features/ckeditor5-premium-features.css';

interface CustomEditorProps {
    value: string;
  }

const CustomEditor: React.FC<CustomEditorProps> = ({value}) => {
    const editorRef = useRef<ClassicEditor | null>(null);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setData(value);
        }
    }, [value]);

    return (
        <CKEditor
            editor={ ClassicEditor }
            data={value}
            onReady={(editor) => {
                editorRef.current = editor;
              }}
            config={ {
                licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY, // 環境変数からライセンスキーを取得
                plugins: [ Essentials, Paragraph, Bold, Italic, FormatPainter ],
                toolbar: [ 'undo', 'redo', '|', 'bold', 'italic', '|', 'formatPainter' ],
                initialData: value
            } }
        />
    );
}

export default CustomEditor;