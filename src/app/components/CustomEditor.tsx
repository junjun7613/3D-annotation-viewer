'use client'

import {CKEditor} from '@ckeditor/ckeditor5-react';
import {ClassicEditor, Essentials, Paragraph, Bold, Italic} from 'ckeditor5';
import { FormatPainter } from 'ckeditor5-premium-features';

import 'ckeditor5/ckeditor5.css';
import 'ckeditor5-premium-features/ckeditor5-premium-features.css';

function CustomEditor() {
    return (
        <CKEditor
            editor={ ClassicEditor }
            config={ {
                licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
                plugins: [ Essentials, Paragraph, Bold, Italic, FormatPainter ],
                toolbar: [ 'undo', 'redo', '|', 'bold', 'italic', '|', 'formatPainter' ],
                initialData: '<p>Hello from CKEditor 5 in React!</p>'
            } }
        />
    );
}

export default CustomEditor;