'use client';

import { useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { NextPage } from 'next';
import SignIn from './components/SignIn';
import ThreeCanvas from './components/ThreeCanvasManifest';
import SwitchButton from './components/SwitchButton';
import DisplayTEI from './components/DisplayTEI';
import { FaPencilAlt, FaBook, FaRegFilePdf, FaTrashAlt, FaList, FaUpload, FaBars } from 'react-icons/fa';
import { FaLink } from 'react-icons/fa6';
import { PiShareNetwork } from 'react-icons/pi';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { LiaMapMarkedSolid } from 'react-icons/lia';
import { useAtom } from 'jotai';
import { infoPanelAtom } from '@/app/atoms/infoPanelAtom';

//import dynamic from 'next/dynamic';

import EditorJSHtml from 'editorjs-html';
import Header from '@editorjs/header';
import List from '@editorjs/list';
//import ImageTools from '@editorjs/image';
//import LinkTool from '@editorjs/link';

// import HTMLViewer from './components/HTMLviewer';

import { createSlug } from '@/utils/converter';

import type { ToolConstructable } from '@editorjs/editorjs';

import { v4 as uuidv4 } from 'uuid';

// const Editor = dynamic(() => import('./components/Editor'), { ssr: false });
import { OutputData } from '@editorjs/editorjs'; // OutputDataをインポート

import db from '@/lib/firebase/firebase';
import { deleteDoc, doc, getDoc, getDocs, updateDoc, collection } from 'firebase/firestore';
import { createWikidataItem } from '@/lib/services/wikidata';
import { objectMetadataService } from '@/lib/services/objectMetadata';
import type { ObjectMetadata } from '@/types/main';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MediaItem, WikidataItem, BibliographyItem, LocationItem } from '@/types/main';

import type EditorJS from '@editorjs/editorjs';
// import { link } from 'fs';

const Home: NextPage = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const [user] = useAuthState(auth);

  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  // sprite annotationとpolygon annotationの表示を切り替える
  const [annotationMode, setAnnotationMode] = useState(false);
  const [compactMarkers, setCompactMarkers] = useState(false);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  // infoPanelContentという連想配列を作成

  const [, /*editorData*/ setEditorData] = useState<OutputData | undefined>();
  const [metaTab, setMetaTab] = useState<'object' | 'annotation'>('annotation');
  const [infoTab, setInfoTab] = useState<'resources' | 'linkedData' | 'references' | 'location'>('resources');
  const [objectTab, setObjectTab] = useState<'resources' | 'linkedData' | 'references' | 'location'>('resources');

  interface MediaItem {
    id: string;
    type: string;
    source: string;
    caption: string;
  }

  /*
  interface InfoPanelContent {
    title: string;
    description: OutputData | undefined; // descriptionをOutputData型に変更
    id: string;
    creator?: string;
    media?: MediaItem[];
    wikidata?: WikidataItem[];
    bibliography?: BibliographyItem[];
  }
  */

  const [infoPanelContent] = useAtom(infoPanelAtom);
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);

  const [uploadedAuthorityContent, setUploadedAuthorityContent] = useState('');
  const [uploadedMediaContent, setUploadedMediaContent] = useState('');
  const [uploadedBibContent, setUploadedBibContent] = useState('');

  const [isRDFDialogOpen, setIsRDFDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isBibDialogOpen, setIsBibDialogOpen] = useState(false);
  const [isDescDialogOpen, setIsDescDialogOpen] = useState(false);
  const [isWikidataDialogOpen, setIsWikidataDialogOpen] = useState(false);
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isAnnotationListOpen, setIsAnnotationListOpen] = useState(false);
  const [annotationList, setAnnotationList] = useState<{ id: string; title: string; createdAt: number }[]>([]);
  const [focusAnnotationId, setFocusAnnotationId] = useState<string | null>(null);

  const [isMediaUploadDialogOpen, setIsMediaUploadDialogOpen] = useState(false);
  const [isAuthorityUploadDialogOpen, setIsAuthorityUploadDialogOpen] = useState(false);
  const [isBibUploadDialogOpen, setIsBibUploadDialogOpen] = useState(false);
  const [isBulkWikidataDialogOpen, setIsBulkWikidataDialogOpen] = useState(false);

  // Object専用のダイアログ状態
  const [isObjectMediaDialogOpen, setIsObjectMediaDialogOpen] = useState(false);
  const [isObjectWikidataDialogOpen, setIsObjectWikidataDialogOpen] = useState(false);
  const [isObjectBibDialogOpen, setIsObjectBibDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isObjectMediaUploadDialogOpen, setIsObjectMediaUploadDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isObjectAuthorityUploadDialogOpen, setIsObjectAuthorityUploadDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isObjectBibUploadDialogOpen, setIsObjectBibUploadDialogOpen] = useState(false);
  const [bulkWikidataFile, setBulkWikidataFile] = useState<string>('');
  const [bulkWikidataResult, setBulkWikidataResult] = useState<{
    matched: { label: string; annotationTitle: string; wikidata: string }[];
    skipped: { label: string; reason: string }[];
    notFound: { label: string }[];
  } | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentLabel: '' });
  const [bulkWikidataLang, setBulkWikidataLang] = useState('ja');
  const [isViewerMenuOpen, setIsViewerMenuOpen] = useState(false);

  const [IRI, setIRI] = useState('');
  //mediaの情報をstateで管理
  const [source, setSource] = useState('');
  const [type, setType] = useState('img');
  const [wikiType, setWikiType] = useState('wikidata');
  const [caption, setCaption] = useState('');
  //bibliographyの情報をstateで管理
  const [bibAuthor, setBibAuthor] = useState('');
  const [bibTitle, setBibTitle] = useState('');
  const [bibYear, setBibYear] = useState('');
  const [bibPage, setBibPage] = useState('');
  const [bibPDF, setBibPDF] = useState('');
  //descriptionの情報をstateで管理
  const [desc, setDesc] = useState('');
  // wikidataの情報をstateで管理
  const [wikidata, setWikidata] = useState('');
  // locationの情報をstateで管理（annotation用）
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  // locationの情報をstateで管理（object用）
  const [objectLocationLat, setObjectLocationLat] = useState('');
  const [objectLocationLng, setObjectLocationLng] = useState('');

  // Object用の入力データ状態
  const [objectSource, setObjectSource] = useState('');
  const [objectType, setObjectType] = useState('img');
  const [objectCaption, setObjectCaption] = useState('');
  const [objectWikiType, setObjectWikiType] = useState('wikidata');
  const [objectIRI, setObjectIRI] = useState('');
  const [objectBibAuthor, setObjectBibAuthor] = useState('');
  const [objectBibTitle, setObjectBibTitle] = useState('');
  const [objectBibYear, setObjectBibYear] = useState('');
  const [objectBibPage, setObjectBibPage] = useState('');
  const [objectBibPDF, setObjectBibPDF] = useState('');

  const [selectedImage, setSelectedImage] = useState<{
    source: string;
    caption: string;
    index: number;
  } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{
    source: string;
    caption: string;
    index: number;
  } | null>(null);
  const [selectedIIIF, setSelectedIIIF] = useState<{
    manifestUrl: string;
    caption: string;
    index: number;
  } | null>(null);
  const [selectedSketchFab, setSelectedSketchFab] = useState<{
    modelId: string;
    caption: string;
    index: number;
  } | null>(null);

  // URLからマニフェストURLを取得して設定するuseEffect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) {
      setManifestUrl(manifestParam);
    }
  }, []);

  // manifestUrlが変更されたらobjectMetadataを取得
  useEffect(() => {
    const fetchObjectMetadata = async () => {
      if (manifestUrl) {
        const metadata = await objectMetadataService.getObjectMetadata(manifestUrl);
        setObjectMetadata(metadata);
        // objectMetadataのlocationをフォームに反映
        if (metadata?.location) {
          setObjectLocationLat(metadata.location.lat || '');
          setObjectLocationLng(metadata.location.lng || '');
        } else {
          setObjectLocationLat('');
          setObjectLocationLng('');
        }
      }
    };
    fetchObjectMetadata();
  }, [manifestUrl]);

  // description editor関連
  useEffect(() => {
    if (infoPanelContent?.description) {
      const parser = EditorJSHtml();
      const html = parser.parse(infoPanelContent.description as unknown as OutputData);

      //setDesc(infoPanelContent.description);
      setDesc(html);
      setEditorData(infoPanelContent.description as unknown as OutputData); // descriptionをOutputData型に変換してセット
      /*
      setEditorData({
        blocks: [
          {
            type: 'paragraph',
            data: {
              text: infoPanelContent.description,
            },
          },
        ],
      });
      */
    } else {
      setDesc('');
      setEditorData(undefined);
    }
    // locationの初期化
    if (infoPanelContent?.location) {
      setLocationLat(infoPanelContent.location.lat || '');
      setLocationLng(infoPanelContent.location.lng || '');
    } else {
      setLocationLat('');
      setLocationLng('');
    }
  }, [infoPanelContent]);

  // description editorの初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && isDescDialogOpen) {
      /*
      editorRef.current = new EditorJS({
        holder: 'editorJS',
        tools: {
          header: {
            class: Header as unknown as ToolConstructable,
            inlineToolbar: ['link'],
          },
          list: {
            class: List as unknown as ToolConstructable, // Block
            inlineToolbar: true,
          },
        },
        data: infoPanelContent?.description
          ? (infoPanelContent.description as unknown as OutputData)
          : undefined, // デフォルト値がない場合は空の状態にする
      });
      */

      const initEditor = async () => {
        const EditorJS = (await import('@editorjs/editorjs')).default;

        if (!editorRef.current) {
          editorRef.current = new EditorJS({
            holder: 'editorJS',
            tools: {
              header: {
                class: Header as unknown as ToolConstructable,
                inlineToolbar: ['link'],
              },
              list: {
                class: List as unknown as ToolConstructable, // Block
                inlineToolbar: true,
              },
              /*
              linkTool: {
                class: LinkTool,
                config: {
                  endpoint: '/api/fetch-link'
                }
              }
              */
            },
            data: infoPanelContent?.description
              ? (infoPanelContent.description as unknown as OutputData)
              : undefined, // デフォルト値がない場合は空の状態にする
          });
        }
      };

      initEditor();

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }
  }, [isDescDialogOpen, infoPanelContent?.description]);

  /*
  const handleEditorChange = (data: OutputData) => {
    console.log(data);
    setEditorData(data);
    // Editor.jsのデータをdescに変換してセット
    const updatedDesc = data.blocks.map((block) => block.data.text).join('\n');
    console.log(updatedDesc);
    setDesc(updatedDesc);
  };
  */

  const btnSaves = async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();

        // undefinedを削除
        const cleanedData = JSON.parse(JSON.stringify(outputData));

        const docRef = doc(db, 'test', infoPanelContent?.id || '');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const origData = docSnap.data();
          // origData.data.body.valueにoutputDataをセット
          await updateDoc(docRef, {
            data: {
              body: {
                value: cleanedData,
                label: origData.data.body.label,
                type: origData.data.body.type,
              },
              target: origData.data.target,
            },
          });
        } else {
          console.warn('No such document!');
        }

        handleDescCloseDialog();
      } catch {
        // Saving failed
      }
    }
  };

  const base64ToCsv = (base64: string): string => {
    const base64Data = base64.split(',')[1]; // `data:text/csv;base64,`の後ろの部分を取得
    const decodedData = atob(base64Data); // Base64デコード
    return decodedData;
  };

  const uploadAuthorityCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedAuthorityContent(e.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadMediaCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedMediaContent(e.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadBibCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedBibContent(e.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveMedias = async () => {
    // const mediaData = { source, type, caption };
    const data: {
      id: string;
      source: string;
      type: string;
      caption: string;
      manifestUrl?: string;
      canvasId?: string;
    } = {
      id: uuidv4(),
      source: source,
      type: type,
      caption: caption,
    };

    // If type is IIIF, fetch manifest and extract first canvas image
    if (type === 'iiif') {
      try {
        const response = await fetch(source);
        const manifest = await response.json();

        // Check for IIIF Presentation API 3.0 (items)
        if (manifest.items && manifest.items.length > 0) {
          const canvas = manifest.items[0];
          data.canvasId = canvas.id;

          // Get thumbnail or first image from canvas
          if (canvas.thumbnail && canvas.thumbnail.length > 0) {
            data.source = canvas.thumbnail[0].id;
          } else if (canvas.items && canvas.items.length > 0 &&
                     canvas.items[0].items && canvas.items[0].items.length > 0 &&
                     canvas.items[0].items[0].body) {
            data.source = canvas.items[0].items[0].body.id;
          }

          data.manifestUrl = source;
        }
        // Check for IIIF Presentation API 2.0 (sequences)
        else if (manifest.sequences && manifest.sequences.length > 0) {
          const sequence = manifest.sequences[0];

          // Get thumbnail from sequence or first canvas
          if (sequence.thumbnail && sequence.thumbnail['@id']) {
            data.source = sequence.thumbnail['@id'];
          } else if (sequence.canvases && sequence.canvases.length > 0) {
            const canvas = sequence.canvases[0];
            data.canvasId = canvas['@id'];

            // Try to get image from canvas
            if (canvas.images && canvas.images.length > 0 && canvas.images[0].resource) {
              data.source = canvas.images[0].resource['@id'];
            } else if (canvas.thumbnail && canvas.thumbnail['@id']) {
              data.source = canvas.thumbnail['@id'];
            }
          }

          data.manifestUrl = source;
        }
      } catch (error) {
        console.error('Failed to fetch IIIF manifest:', error);
        alert('Failed to load IIIF manifest. Please check the URL.');
        return;
      }
    }

    // If type is SketchFab, extract model ID from HTML embed code
    if (type === 'sketchfab') {
      try {
        let modelId = '';
        let modelTitle = caption; // Default to caption

        // Extract model ID from iframe src in embed code
        const iframeSrcMatch = source.match(/src="https:\/\/sketchfab\.com\/models\/([a-f0-9]+)\/embed/);
        if (iframeSrcMatch) {
          modelId = iframeSrcMatch[1];
        }

        // Try to extract title from iframe title attribute
        const titleMatch = source.match(/title="([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          modelTitle = titleMatch[1];
          data.caption = modelTitle; // Update caption with extracted title
        }

        if (modelId) {
          // SketchFab oEmbed API to get thumbnail
          const oembedUrl = `https://sketchfab.com/oembed?url=https://sketchfab.com/models/${modelId}`;
          const response = await fetch(oembedUrl);
          const oembedData = await response.json();

          if (oembedData.thumbnail_url) {
            data.source = oembedData.thumbnail_url;
          }

          // If oEmbed returned a title and we don't have one from HTML, use it
          if (!titleMatch && oembedData.title) {
            data.caption = oembedData.title;
          }

          data.manifestUrl = source; // Store original embed code
          data.canvasId = modelId; // Store model ID
        } else {
          alert('Could not extract model ID from SketchFab embed code. Please check the format.');
          return;
        }
      } catch (error) {
        console.error('Failed to process SketchFab embed code:', error);
        alert('Failed to process SketchFab embed code.');
        return;
      }
    }

    // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)のdataをfirebaseから取得
    //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        media: [...origData.media, data],
      });
    } else {
      console.warn('No such document!');
    }

    //console.log(updatedData?.wikidata);

    // infoPanelContentのwikidataにdataを追記
    infoPanelContent?.media.push(data);

    handleMediaCloseDialog();
  };

  const saveMediaUpload = async () => {
    // Base64デコードしてCSVデータを取得
    const csvData = base64ToCsv(uploadedMediaContent);
    //console.log(csvData);

    // CSVデータを行ごとに分割して、最初の行を削除
    const rows = csvData.split('\n').slice(1);
    //console.log(rows);

    //infoPanelContent.wikidataを一旦クリア
    if (infoPanelContent) {
      infoPanelContent.media = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const media = [];

    for (const item of rows) {
      const media_id = item.split(',')[0];
      const media_type = item.split(',')[1];
      const media_source = item.split(',')[2];
      const media_caption = item.split(',')[3].replace('\r', '');

      let data = {
        id: '',
        source: '',
        type: '',
        caption: '',
      };

      if (media_id !== '') {
        // idがすでに存在する場合には、既存のidを使う
        //console.log(media_id, media_type, media_source, media_caption);
        data = {
          id: media_id,
          source: media_source,
          type: media_type,
          caption: media_caption,
        };
        //console.log(data);
        infoPanelContent?.media.push(data);
        media.push(data);
      } else {
        // idが存在しない場合には、uuidを生成
        data = {
          id: uuidv4(),
          source: media_source,
          type: media_type,
          caption: media_caption,
        };
        //console.log(data);
        infoPanelContent?.media.push(data);
        media.push(data);
      }

      // firebaseのannotationsコレクションのidを持つdocのmediaフィールド(Array)のdataをfirebaseから取得
      //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
      const docRef = doc(db, 'test', infoPanelContent?.id || '');
      const docSnap = await getDoc(docRef);

      //既存のmediaのデータを、mediaデータで上書き
      if (docSnap.exists()) {
        //const origData = docSnap.data();
        // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
        await updateDoc(docRef, {
          media: media,
        });
      } else {
        console.warn('No such document!');
      }
    }

    handleMediaUploadCloseDialog();
  };

  const saveWikidata = async () => {
    let data: WikidataItem = {
      type: '',
      uri: '',
      label: '',
      wikipedia: '',
      lat: '',
      lng: '',
      thumbnail: '',
    };
    if (wikiType === 'wikidata') {
      // 共通ライブラリを使用してWikidata情報を取得
      data = await createWikidataItem(wikidata);
    } else if (wikiType === 'geonames') {
      const id = wikidata.split('/').pop();
      const url = `http://api.geonames.org/getJSON?geonameId=${id}&username=${process.env.NEXT_PUBLIC_GEONAMES_USERNAME}`;

      const result = await fetch(url).then((res) => res.json());

      const label = result.name;
      const wikipedia = `https://${result.wikipediaURL}`;
      const lat = result.lat;
      const lng = result.lng;

      data = {
        type: wikiType,
        uri: wikidata,
        label: label,
        lat: lat,
        lng: lng,
      };
      if (wikipedia) {
        data.wikipedia = wikipedia;
      }
    }

    // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)のdataをfirebaseから取得
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        wikidata: [...origData.wikidata, data],
      });
    } else {
      console.warn('No such document!');
    }

    // infoPanelContentのwikidataにdataを追記
    infoPanelContent?.wikidata.push(data);

    handleWikidataCloseDialog();
  };

  const saveAuthorityUpload = async () => {
    // Base64デコードしてCSVデータを取得
    const csvData = base64ToCsv(uploadedAuthorityContent);
    //console.log(csvData);

    // CSVデータを行ごとに分割して、最初の行を削除
    const rows = csvData.split('\n').slice(1);
    //console.log(rows);

    //infoPanelContent.wikidataを一旦クリア
    if (infoPanelContent) {
      infoPanelContent.wikidata = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const authority = [];

    for (const item of rows) {
      const authority_type = item.split(',')[0];
      const authority_uri = item.split(',')[1].replace('\r', '');

      let data: WikidataItem = {
        type: '',
        uri: '',
        label: '',
        wikipedia: '',
        lat: '',
        lng: '',
        thumbnail: '',
      };

      if (authority_type === 'wikidata') {
        // 共通ライブラリを使用してWikidata情報を取得
        data = await createWikidataItem(authority_uri);
        infoPanelContent?.wikidata.push(data);
        authority.push(data);
      } else if (authority_type === 'geonames') {
        const id = authority_uri.split('/').pop();
        const url = `http://api.geonames.org/getJSON?geonameId=${id}&username=${process.env.NEXT_PUBLIC_GEONAMES_USERNAME}`;

        //console.log(url);
        const result = await fetch(url).then((res) => res.json());
        //console.log(result);

        const label = result.name;
        const wikipedia = `https://${result.wikipediaURL}`;
        const lat = result.lat;
        const lng = result.lng;

        data = {
          type: authority_type,
          uri: authority_uri,
          label: label,
          lat: lat,
          lng: lng,
        };
        if (wikipedia) {
          data.wikipedia = wikipedia;
        }
        // infoPanelContentのwikidataにdataを追記
        infoPanelContent?.wikidata.push(data);
        authority.push(data);
      }
    }

    // firebaseのannotationsコレクションのidを持つdocのWikidataフィールド(Array)のdataをfirebaseから取得
    //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    //既存のWikidataのデータを、authorityデータで上書き
    if (docSnap.exists()) {
      //const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのWikidataフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        wikidata: authority,
      });
    } else {
      console.warn('No such document!');
    }

    /*
    if (docSnap.exists()) {
      const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        media: [...origData.media, data],
      });
    } else {
      console.warn('No such document!');
    }

    //console.log(updatedData?.wikidata);
    
    */

    setIsAuthorityUploadDialogOpen(false);
  };

  const saveBib = async () => {
    // const bibData = { bibAuthor, bibTitle, bibYear, bibPage, bibPDF };
    const data = {
      id: uuidv4(),
      author: bibAuthor,
      title: bibTitle,
      year: bibYear,
      page: bibPage,
      pdf: bibPDF,
    };

    // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)のdataをfirebaseから取得
    //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        bibliography: [...origData.bibliography, data],
      });
    } else {
      console.warn('No such document!');
    }

    //console.log(updatedData?.wikidata);

    // infoPanelContentのwikidataにdataを追記
    infoPanelContent?.bibliography.push(data);

    handleBibCloseDialog();
  };

  const saveLocation = async () => {
    const data = {
      lat: locationLat,
      lng: locationLng,
    };

    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        location: data,
      });
      // infoPanelContentのlocationを更新
      if (infoPanelContent) {
        infoPanelContent.location = data;
      }
    } else {
      console.warn('No such document!');
    }
  };

  // Object用の保存関数群
  const saveObjectLocation = async () => {
    if (!manifestUrl || !user) return;

    const data = {
      lat: objectLocationLat,
      lng: objectLocationLng,
    };

    await objectMetadataService.updateLocation(manifestUrl, data, user.uid);

    // objectMetadataを更新
    setObjectMetadata(prev => prev ? { ...prev, location: data } : null);

    alert('Location saved successfully!');
  };

  const saveObjectMedia = async () => {
    if (!manifestUrl || !user) return;

    const data: {
      id: string;
      source: string;
      type: string;
      caption: string;
      manifestUrl?: string;
      canvasId?: string;
    } = {
      id: uuidv4(),
      source: objectSource,
      type: objectType,
      caption: objectCaption,
    };

    // If type is IIIF, fetch manifest and extract first canvas image
    if (objectType === 'iiif') {
      try {
        const response = await fetch(objectSource);
        const manifest = await response.json();

        // Check for IIIF Presentation API 3.0 (items)
        if (manifest.items && manifest.items.length > 0) {
          const canvas = manifest.items[0];
          data.canvasId = canvas.id;

          // Get thumbnail or first image from canvas
          if (canvas.thumbnail && canvas.thumbnail.length > 0) {
            data.source = canvas.thumbnail[0].id;
          } else if (canvas.items && canvas.items.length > 0 &&
                     canvas.items[0].items && canvas.items[0].items.length > 0 &&
                     canvas.items[0].items[0].body) {
            data.source = canvas.items[0].items[0].body.id;
          }

          data.manifestUrl = objectSource;
        }
        // Check for IIIF Presentation API 2.0 (sequences)
        else if (manifest.sequences && manifest.sequences.length > 0) {
          const sequence = manifest.sequences[0];

          // Get thumbnail from sequence or first canvas
          if (sequence.thumbnail && sequence.thumbnail['@id']) {
            data.source = sequence.thumbnail['@id'];
          } else if (sequence.canvases && sequence.canvases.length > 0) {
            const canvas = sequence.canvases[0];
            data.canvasId = canvas['@id'];

            // Try to get image from canvas
            if (canvas.images && canvas.images.length > 0 && canvas.images[0].resource) {
              data.source = canvas.images[0].resource['@id'];
            } else if (canvas.thumbnail && canvas.thumbnail['@id']) {
              data.source = canvas.thumbnail['@id'];
            }
          }

          data.manifestUrl = objectSource;
        }
      } catch (error) {
        console.error('Failed to fetch IIIF manifest:', error);
        alert('Failed to load IIIF manifest. Please check the URL.');
        return;
      }
    }

    // If type is SketchFab, extract model ID from HTML embed code
    if (objectType === 'sketchfab') {
      try {
        let modelId = '';
        let modelTitle = objectCaption; // Default to caption

        // Extract model ID from iframe src in embed code
        const iframeSrcMatch = objectSource.match(/src="https:\/\/sketchfab\.com\/models\/([a-f0-9]+)\/embed/);
        if (iframeSrcMatch) {
          modelId = iframeSrcMatch[1];
        }

        // Try to extract title from iframe title attribute
        const titleMatch = objectSource.match(/title="([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          modelTitle = titleMatch[1];
          data.caption = modelTitle; // Update caption with extracted title
        }

        if (modelId) {
          // SketchFab oEmbed API to get thumbnail
          const oembedUrl = `https://sketchfab.com/oembed?url=https://sketchfab.com/models/${modelId}`;
          const response = await fetch(oembedUrl);
          const oembedData = await response.json();

          if (oembedData.thumbnail_url) {
            data.source = oembedData.thumbnail_url;
          }

          // If oEmbed returned a title and we don't have one from HTML, use it
          if (!titleMatch && oembedData.title) {
            data.caption = oembedData.title;
          }

          data.manifestUrl = objectSource; // Store original embed code
          data.canvasId = modelId; // Store model ID
        } else {
          alert('Could not extract model ID from SketchFab embed code. Please check the format.');
          return;
        }
      } catch (error) {
        console.error('Failed to process SketchFab embed code:', error);
        alert('Failed to process SketchFab embed code.');
        return;
      }
    }

    await objectMetadataService.addMedia(manifestUrl, data, user.uid);

    // objectMetadataを更新
    setObjectMetadata(prev => prev ? { ...prev, media: [...(prev?.media || []), data] } : null);

    // フォームをリセット
    setObjectSource('');
    setObjectCaption('');
    setIsObjectMediaDialogOpen(false);
  };

  const saveObjectWikidata = async () => {
    if (!manifestUrl || !user) return;

    const data = await createWikidataItem(objectIRI);

    await objectMetadataService.addWikidata(manifestUrl, data, user.uid);

    // objectMetadataを更新
    setObjectMetadata(prev => prev ? { ...prev, wikidata: [...(prev?.wikidata || []), data] } : null);

    // フォームをリセット
    setObjectIRI('');
    setIsObjectWikidataDialogOpen(false);
  };

  const saveObjectBibliography = async () => {
    if (!manifestUrl || !user) return;

    const data = {
      id: uuidv4(),
      author: objectBibAuthor,
      title: objectBibTitle,
      year: objectBibYear,
      page: objectBibPage,
      pdf: objectBibPDF,
    };

    await objectMetadataService.addBibliography(manifestUrl, data, user.uid);

    // objectMetadataを更新
    setObjectMetadata(prev => prev ? { ...prev, bibliography: [...(prev?.bibliography || []), data] } : null);

    // フォームをリセット
    setObjectBibAuthor('');
    setObjectBibTitle('');
    setObjectBibYear('');
    setObjectBibPage('');
    setObjectBibPDF('');
    setIsObjectBibDialogOpen(false);
  };

  const deleteObjectWikidata = async (index: number) => {
    if (!manifestUrl || !user) return;

    const confirmed = confirm('Are you sure you want to delete this Wikidata item?');
    if (confirmed) {
      await objectMetadataService.deleteWikidata(manifestUrl, index, user.uid);

      // objectMetadataを更新
      setObjectMetadata(prev => {
        if (!prev) return null;
        const newWikidata = prev.wikidata.filter((_, i) => i !== index);
        return { ...prev, wikidata: newWikidata };
      });
    }
  };

  const deleteObjectMedia = async (index: number) => {
    if (!manifestUrl || !user) return;

    const confirmed = confirm('Are you sure you want to delete this media item?');
    if (confirmed) {
      await objectMetadataService.deleteMedia(manifestUrl, index, user.uid);

      // objectMetadataを更新
      setObjectMetadata(prev => {
        if (!prev) return null;
        const newMedia = prev.media.filter((_, i) => i !== index);
        return { ...prev, media: newMedia };
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteObjectBibliography = async (index: number) => {
    if (!manifestUrl || !user) return;

    const confirmed = confirm('Are you sure you want to delete this reference?');
    if (confirmed) {
      await objectMetadataService.deleteBibliography(manifestUrl, index, user.uid);

      // objectMetadataを更新
      setObjectMetadata(prev => {
        if (!prev) return null;
        const newBibliography = prev.bibliography.filter((_, i) => i !== index);
        return { ...prev, bibliography: newBibliography };
      });
    }
  };

  const saveBibUpload = async () => {
    // Base64デコードしてCSVデータを取得
    const csvData = base64ToCsv(uploadedBibContent);
    //console.log(csvData);

    // CSVデータを行ごとに分割して、最初の行を削除
    const rows = csvData.split('\n').slice(1);
    //console.log(rows);

    //infoPanelContent.wikidataを一旦クリア
    if (infoPanelContent) {
      infoPanelContent.bibliography = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const bibliography = [];

    for (const item of rows) {
      const bib_id = item.split(',')[0];
      const bib_title = item.split(',')[1];
      const bib_author = item.split(',')[2];
      const bib_year = item.split(',')[3];
      const bib_uri = item.split(',')[4];
      const bib_pdf = item.split(',')[5].replace('\r', '');

      let data = {
        id: '',
        title: '',
        author: '',
        year: '',
        page: '',
        pdf: '',
      };

      if (bib_id !== '') {
        // idがすでに存在する場合には、既存のidを使う
        //console.log(media_id, media_type, media_source, media_caption);
        data = {
          id: bib_id,
          title: bib_title,
          author: bib_author,
          year: bib_year,
          page: bib_uri,
          pdf: bib_pdf,
        };
        //console.log(data);
        infoPanelContent?.bibliography.push(data);
        bibliography.push(data);
      } else {
        // idが存在しない場合には、uuidを生成
        data = {
          id: uuidv4(),
          title: bib_title,
          author: bib_author,
          year: bib_year,
          page: bib_uri,
          pdf: bib_pdf,
        };
        //console.log(data);
        infoPanelContent?.bibliography.push(data);
        bibliography.push(data);
      }

      // firebaseのannotationsコレクションのidを持つdocのmediaフィールド(Array)のdataをfirebaseから取得
      //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
      const docRef = doc(db, 'test', infoPanelContent?.id || '');
      const docSnap = await getDoc(docRef);

      //既存のmediaのデータを、mediaデータで上書き
      if (docSnap.exists()) {
        //const origData = docSnap.data();
        // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
        await updateDoc(docRef, {
          bibliography: bibliography,
        });
      } else {
        console.warn('No such document!');
      }
    }

    handleBibUploadCloseDialog();
  };

  /*
  const saveDesc = async () => {
    console.log(desc);
    // descriptionの情報をfirebaseのannotationsコレクションのidを持つdocのdata/body/valueに保存
    //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const origData = docSnap.data();
      // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)にdataを追記
      await updateDoc(docRef, {
        data: {
          body: {
            value: desc,
            label: origData.data.body.label,
            type: origData.data.body.type,
          },
          target: origData.data.target,
        },
      });
    } else {
      console.warn('No such document!');
    }

    handleDescCloseDialog();
  };
  */

  /*
  const saveDesc = async () => {
    if (editorData) {
      const description = editorData.blocks.map((block) => block.data.text).join('\n');
      console.log('Saving description:', description);

      // Firebaseに保存
      const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const origData = docSnap.data();
        await updateDoc(docRef, {
          data: {
            body: {
              value: description,
              label: origData.data.body.label,
              type: origData.data.body.type,
            },
            target: origData.data.target,
          },
        });
      } else {
        console.warn('No such document!');
      }

      alert('Description saved successfully!');
      handleDescCloseDialog();
    }
  };
  */

  const handleSwitchChange = (checked?: boolean) => {
    setAnnotationsVisible(checked !== undefined ? checked : !annotationsVisible);
  };

  const handleAnnotationModeChange = (mode?: boolean) => {
    setAnnotationMode(mode !== undefined ? mode : !annotationMode);
  };

  const handleManifestUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setManifestUrl(newUrl);

    // URLのgetパラメータに反映
    const url = new URL(window.location.href);
    if (newUrl) {
      url.searchParams.set('manifest', newUrl);
    } else {
      url.searchParams.delete('manifest');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const deleteAnnotation = (id: string) => {
    if (infoPanelContent?.creator == user?.uid) {
      const confirmed = confirm('Are you sure you want to delete this annotation?');
      if (confirmed) {
        //idのdocをfirebaseデータベースから削除
        //deleteDoc(doc(db, 'annotations', id));
        deleteDoc(doc(db, 'test', id));
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const downloadAnnotation = (id: string) => {
    // idのdocをfirebaseデータベースから取得
    //const docRef = doc(db, 'annotations', id);
    const docRef = doc(db, 'test', id);
    const download = async () => {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // dataをjson形式でダウンロード
        const element = document.createElement('a');
        const file = new Blob([JSON.stringify(data)], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${id}.json`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
      } else {
        console.warn('No such document!');
      }
    };
    if (infoPanelContent?.id) {
      download();
    }
  };

  const downloadRDF = async (id: string) => {
    // firebaseのannotationsコレクションのすべてのDocの中から、targetmanifestの値がidと一致するものを取得
    const querySnapshot = await getDocs(collection(db, 'test'));

    // Objectメタデータを取得
    const objectMetadata = await objectMetadataService.getObjectMetadata(id);

    let turtleData =
      '@prefix : <https://www.example.com/vocabulary/> .\n@prefix schema: <https://schema.org/> .\n@prefix dc: <http://purl.org/dc/elements/1.1/> .\n@prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .';
    turtleData += '\n';

    // Manifestエンティティを追加（Object level metadata）
    if (objectMetadata) {
      turtleData += `\n<${id}> a :Manifest ;\n`;
      const manifestProperties = [];

      // Wikidataエンティティへのリンクを追加
      if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
        objectMetadata.wikidata.forEach((item) => {
          manifestProperties.push(`  :relatedEntity <${item.uri}>`);
        });
      }

      // Mediaを追加
      if (objectMetadata.media && objectMetadata.media.length > 0) {
        objectMetadata.media.forEach((item) => {
          manifestProperties.push(`  :media <http://example.com/${item.id}>`);
        });
      }

      // Bibliographyを追加
      if (objectMetadata.bibliography && objectMetadata.bibliography.length > 0) {
        objectMetadata.bibliography.forEach((item) => {
          manifestProperties.push(`  :bibliography <http://example.com/${item.id}>`);
        });
      }

      // Manifest自体の直接的な位置情報（object.location）
      if (objectMetadata.location) {
        manifestProperties.push(`  geo:lat "${objectMetadata.location.lat}"`);
        manifestProperties.push(`  geo:long "${objectMetadata.location.lng}"`);
      }

      // プロパティを出力
      if (manifestProperties.length > 0) {
        manifestProperties.forEach((prop, index) => {
          if (index < manifestProperties.length - 1) {
            turtleData += prop + ' ;\n';
          } else {
            turtleData += prop + ' .\n';
          }
        });
      } else {
        turtleData += '.\n';
      }

      // Wikidataエンティティの詳細を独立したリソースとして追加
      if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
        objectMetadata.wikidata.forEach((item) => {
          turtleData += `\n<${item.uri}> a :WikidataEntity ;\n`;
          const wikiProperties = [];

          wikiProperties.push(`  rdfs:label "${item.label}"`);
          wikiProperties.push(`  :wikidataType "${item.type}"`);

          // 地理情報
          if (item.lat && item.lng) {
            wikiProperties.push(`  geo:lat "${item.lat}"`);
            wikiProperties.push(`  geo:long "${item.lng}"`);
          }

          // サムネイル
          if (item.thumbnail) {
            wikiProperties.push(`  foaf:depiction <${item.thumbnail}>`);
          }

          // Wikipedia
          if (item.wikipedia) {
            wikiProperties.push(`  rdfs:seeAlso <${item.wikipedia}>`);
          }

          wikiProperties.forEach((prop, index) => {
            if (index < wikiProperties.length - 1) {
              turtleData += prop + ' ;\n';
            } else {
              turtleData += prop + ' .\n';
            }
          });
        });
      }

      // Object Mediaの詳細を追加
      if (objectMetadata.media && objectMetadata.media.length > 0) {
        objectMetadata.media.forEach((item) => {
          turtleData += `\n<http://example.com/${item.id}> a :Media ;\n`;
          turtleData += `  schema:uri "${item.source}" ;\n`;
          turtleData += `  schema:description "${item.caption}" ;\n`;
          turtleData += `  schema:additionalType :${item.type}`;

          // IIIFタイプの場合、manifest URLとcanvas IDを追加
          if (item.type === 'iiif' && 'manifestUrl' in item && item.manifestUrl) {
            turtleData += ` ;\n`;
            turtleData += `  :iiifManifest <${item.manifestUrl}>`;
            if ('canvasId' in item && item.canvasId) {
              turtleData += ` ;\n`;
              turtleData += `  :iiifCanvas <${item.canvasId}>`;
            }
          }

          // SketchFabタイプの場合、model URLとmodel IDを追加
          if (item.type === 'sketchfab' && 'manifestUrl' in item && item.manifestUrl) {
            turtleData += ` ;\n`;
            turtleData += `  :sketchfabUrl <${item.manifestUrl}>`;
            if ('canvasId' in item && item.canvasId) {
              turtleData += ` ;\n`;
              turtleData += `  :sketchfabModelId "${item.canvasId}"`;
            }
          }

          turtleData += ` .\n`;
        });
      }

      // Object Bibliographyの詳細を追加
      if (objectMetadata.bibliography && objectMetadata.bibliography.length > 0) {
        objectMetadata.bibliography.forEach((item) => {
          turtleData += `\n<${IRI}object-bib-${item.id}> a :Bibliography ;\n`;
          const bibProperties = [];

          if (item.author) bibProperties.push(`  dc:creator "${item.author}"`);
          if (item.title) bibProperties.push(`  dc:title "${item.title}"`);
          if (item.year) bibProperties.push(`  dc:date "${item.year}"`);
          if (item.pdf) bibProperties.push(`  schema:uri <${item.pdf}>`);

          bibProperties.forEach((prop, index) => {
            if (index === bibProperties.length - 1) {
              turtleData += prop + ' .\n';
            } else {
              turtleData += prop + ' ;\n';
            }
          });
        });
      }
    }

    // 既存のAnnotation処理
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const parser = EditorJSHtml();
        const cleanedData = JSON.parse(JSON.stringify(data.data.body.value || { blocks: [] })); // デフォルト値を設定
        const html = parser.parse(cleanedData);
        if (data.target_manifest === id) {
          // 以下でannotationごとにTutleを生成・ダウンロード
          turtleData += `\n<${IRI}${doc.id}> a :Annotation ;\n`;
          const properties = [];

          // labelおよびdescriptionの情報を追加
          properties.push(`  rdfs:label "${data.data.body.label}"`);
          properties.push(
            //`  schema:description "${data.data.body.value}"`,
            `  schema:description "${html}"`
          );

          // manifestおよびcanvasの情報を追加
          properties.push(`  :targetManifest <${data.target_manifest}>`);
          properties.push(`  :targetCanvas <${data.target_canvas}>`);

          // wikidataの情報を追加
          if (data.wikidata) {
            (data.wikidata as WikidataItem[]).forEach((item: WikidataItem) => {
              properties.push(`  :wikidata <${item.uri}>`);
            });
          }

          // mediaの情報を追加
          if (data.media) {
            (data.media as MediaItem[]).forEach((item: MediaItem) => {
              properties.push(`  :media <${IRI}${item.id}>`);
            });
          }

          // bibliographyの情報を追加
          if (data.bibliography) {
            (data.bibliography as BibliographyItem[]).forEach((item: BibliographyItem) => {
              properties.push(`  :bibliography <${IRI}${item.id}>`);
            });
          }

          // 各プロパティをセミコロンで終わらせ、最後のプロパティにはピリオドを付ける
          properties.forEach((prop, index) => {
            if (index < properties.length - 1) {
              turtleData += prop + ';\n';
            } else {
              turtleData += prop + '.\n';
            }
          });

          // プロパティがない場合はピリオドを追加
          if (properties.length === 0) {
            turtleData += '.\n';
          }

          // mediaの情報を追加
          if (data.media) {
            (data.media as MediaItem[]).forEach((item: MediaItem) => {
              turtleData += `\n<${IRI}${item.id}> a :Media ;\n`;
              turtleData += `  schema:uri "${item.source}" ;\n`;
              turtleData += `  schema:description "${item.caption}" ;\n`;
              turtleData += `  schema:additionalType :${item.type}`;

              // IIIFタイプの場合、manifest URLとcanvas IDを追加
              if (item.type === 'iiif' && 'manifestUrl' in item && item.manifestUrl) {
                turtleData += ` ;\n`;
                turtleData += `  :iiifManifest <${item.manifestUrl}>`;
                if ('canvasId' in item && item.canvasId) {
                  turtleData += ` ;\n`;
                  turtleData += `  :iiifCanvas <${item.canvasId}>`;
                }
              }

              // SketchFabタイプの場合、model URLとmodel IDを追加
              if (item.type === 'sketchfab' && 'manifestUrl' in item && item.manifestUrl) {
                turtleData += ` ;\n`;
                turtleData += `  :sketchfabUrl <${item.manifestUrl}>`;
                if ('canvasId' in item && item.canvasId) {
                  turtleData += ` ;\n`;
                  turtleData += `  :sketchfabModelId "${item.canvasId}"`;
                }
              }

              turtleData += ` .\n`;
            });
          }

          // bibiographyの情報を追加
          if (data.bibliography) {
            data.bibliography.forEach((item: BibliographyItem) => {
              turtleData += `\n<${IRI}${item.id}> a :Bibliography ;\n`;
              const properties = [];

              if (item.author) {
                properties.push(`  dc:creator "${item.author}"`);
              }
              if (item.title) {
                properties.push(`  dc:title "${item.title}"`);
              }
              if (item.year) {
                properties.push(`  dc:date "${item.year}"`);
              }
              if (item.page) {
                properties.push(`  schema:uri <${item.page}>`);
              }

              // プロパティを追加し、最後のプロパティにはピリオドを付ける
              properties.forEach((prop, index) => {
                if (index === properties.length - 1) {
                  turtleData += prop + ' .\n';
                } else {
                  turtleData += prop + ' ;\n';
                }
              });
            });
          }
        }
      });

    const blob = new Blob([turtleData], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-data.ttl';
    a.click();
    URL.revokeObjectURL(url);

    handleRDFCloseDialog();
  };

  const downloadIIIFManifest = (manifestUrl: string) => {
    const slug = createSlug(manifestUrl);
    const url = `/api/3/${slug}/manifest`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const deleteMedia = (id: string, index: number) => {
    if (infoPanelContent?.creator == user?.uid) {
      const confirmed = confirm('Are you sure you want to delete this Wiki Item?');
      if (confirmed) {
        //idのdocのBibliographyフィールドのindexの要素を削除
        //const docRef = doc(db, 'annotations', id);
        const docRef = doc(db, 'test', id);
        const deleteField = async () => {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const origData = docSnap.data();
            const newMedia = origData.media.filter((_: MediaItem, i: number) => i !== index);
            await updateDoc(docRef, {
              media: newMedia,
            });
          } else {
            console.warn('No such document!');
          }
        };
        deleteField();

        //infoPanelContentのmediaからindexの要素を削除
        if (infoPanelContent?.media) {
          infoPanelContent.media.splice(index, 1);
        }
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const deleteBib = (id: string, index: number) => {
    if (infoPanelContent?.creator == user?.uid) {
      const confirmed = confirm('Are you sure you want to delete this bibliography?');
      if (confirmed) {
        //idのdocのBibliographyフィールドのindexの要素を削除
        //const docRef = doc(db, 'annotations', id);
        const docRef = doc(db, 'test', id);
        const deleteField = async () => {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const origData = docSnap.data();
            const newBib = origData.bibliography.filter((_: MediaItem, i: number) => i !== index);
            await updateDoc(docRef, {
              bibliography: newBib,
            });
          } else {
            console.warn('No such document!');
          }
        };
        deleteField();

        //infoPanelContentのbibliographyからindexの要素を削除
        if (infoPanelContent?.bibliography) {
          infoPanelContent.bibliography.splice(index, 1);
        }
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const deleteWiki = async (id: string, index: number) => {
    if (infoPanelContent?.creator == user?.uid) {
      const confirmed = confirm('Are you sure you want to delete this Wiki Item?');
      if (confirmed) {
        //idのdocのBibliographyフィールドのindexの要素を削除
        //const docRef = doc(db, 'annotations', id);
        const docRef = doc(db, 'test', id);
        const deleteField = async () => {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const origData = docSnap.data();
            const newWiki = origData.wikidata.filter((_: MediaItem, i: number) => i !== index);
            await updateDoc(docRef, {
              wikidata: newWiki,
            });
          } else {
            console.warn('No such document!');
          }
        };
        deleteField();

        // wikiの削除が直ちにブラウザに反映されるようにinfoPanelContentのwikidataからindexの要素を削除
        //if (infoPanelContent?.wikidata) {
        //infoPanelContent.wikidata.splice(index, 1);
        //}
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const handleRDFOpenDialog = () => {
    setIsRDFDialogOpen(true);
  };
  const handleRDFCloseDialog = () => {
    setIsRDFDialogOpen(false);
  };

  const handleMediaOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setIsMediaDialogOpen(true);
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleMediaCloseDialog = () => {
    setIsMediaDialogOpen(false);
  };
  const handleMediaUploadCloseDialog = () => {
    setIsMediaUploadDialogOpen(false);
  };
  const handleMediaUpload = () => {
    setIsMediaUploadDialogOpen(true);
  };

  const handleBibOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setIsBibDialogOpen(true);
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleBibCloseDialog = () => {
    setIsBibDialogOpen(false);
  };
  const handleBibUploadCloseDialog = () => {
    setIsBibUploadDialogOpen(false);
  };
  const handleBibUpload = () => {
    setIsBibUploadDialogOpen(true);
  };

  const handleDescOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      //setDesc(infoPanelContent?.description || '');
      setIsDescDialogOpen(true);
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleDescCloseDialog = () => {
    setIsDescDialogOpen(false);
  };

  const handleAnnotationListOpen = async () => {
    if (!manifestUrl) {
      alert('Please enter a manifest URL first.');
      return;
    }
    const querySnapshot = await getDocs(collection(db, 'test'));
    const list: { id: string; title: string; createdAt: number }[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.target_manifest === manifestUrl) {
        list.push({
          id: doc.id,
          title: data.data?.body?.label || 'Untitled',
          createdAt: data.createdAt || 0,
        });
      }
    });
    // 作成時間の昇順（古い順）にソート
    list.sort((a, b) => a.createdAt - b.createdAt);
    setAnnotationList(list);
    setIsAnnotationListOpen(true);
  };

  const handleTitleOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setEditTitle(infoPanelContent?.title || '');
      setIsTitleDialogOpen(true);
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleTitleCloseDialog = () => {
    setIsTitleDialogOpen(false);
  };
  const saveTitle = async () => {
    const docRef = doc(db, 'test', infoPanelContent?.id || '');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        'data.body.label': editTitle,
      });
      // infoPanelContentのtitleを更新
      if (infoPanelContent) {
        infoPanelContent.title = editTitle;
      }
    } else {
      console.warn('No such document!');
    }
    setIsTitleDialogOpen(false);
  };

  const handleWikidataOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setWikidata(infoPanelContent?.wikidata.join(',') || '');
      setIsWikidataDialogOpen(true);
      setWikidata('');
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleWikidataCloseDialog = () => {
    setIsWikidataDialogOpen(false);
  };
  const handleAuthorityUploadCloseDialog = () => {
    setIsAuthorityUploadDialogOpen(false);
  };
  const handleAuthorityUpload = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setIsAuthorityUploadDialogOpen(true);
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const ShowMap = (lat: string, lng: string) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // 一括Wikidata登録用のCSVアップロード
  const handleBulkWikidataFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBulkWikidataFile(e.target.result.toString());
        }
      };
      reader.readAsText(file);
    }
  };

  const processBulkWikidata = async () => {
    if (!bulkWikidataFile || !manifestUrl) {
      alert('Please select a CSV file and enter manifest URL first.');
      return;
    }

    setIsBulkProcessing(true);
    setBulkWikidataResult(null);
    setBulkProgress({ current: 0, total: 0, currentLabel: '' });

    try {
      // CSVをパース（ヘッダー行をスキップ）
      const lines = bulkWikidataFile.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // ヘッダーのインデックスを取得
      const labelIdx = headers.findIndex(h => h === 'label');
      const wikidataIdx = headers.findIndex(h => h === 'wikidata');

      if (labelIdx === -1 || wikidataIdx === -1) {
        alert('CSV must have "label" and "wikidata" columns.');
        setIsBulkProcessing(false);
        return;
      }

      // CSVデータをパース
      const csvData: { label: string; wikidata: string | null }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const label = values[labelIdx];
        const wikidata = values[wikidataIdx] || null;

        if (label) {
          csvData.push({ label, wikidata });
        }
      }

      // 進捗の総数を設定
      setBulkProgress({ current: 0, total: csvData.length, currentLabel: '' });

      // Firebaseからアノテーションを取得
      const querySnapshot = await getDocs(collection(db, 'test'));
      const annotations: { id: string; title: string; docRef: ReturnType<typeof doc> }[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.target_manifest === manifestUrl) {
          annotations.push({
            id: docSnap.id,
            title: data.data?.body?.label || '',
            docRef: doc(db, 'test', docSnap.id),
          });
        }
      });

      const matched: { label: string; annotationTitle: string; wikidata: string }[] = [];
      const skipped: { label: string; reason: string }[] = [];
      const notFound: { label: string }[] = [];

      // 各CSVエントリに対してマッチング
      for (let i = 0; i < csvData.length; i++) {
        const csvEntry = csvData[i];

        // 進捗を更新
        setBulkProgress({ current: i + 1, total: csvData.length, currentLabel: csvEntry.label });

        // アノテーションのタイトルとCSVのlabelをマッチング
        const matchedAnnotation = annotations.find(a => a.title === csvEntry.label);

        if (!matchedAnnotation) {
          notFound.push({ label: csvEntry.label });
          continue;
        }

        // wikidataがnullまたは空の場合は空配列で上書き
        if (!csvEntry.wikidata) {
          await updateDoc(matchedAnnotation.docRef, {
            wikidata: [],
          });
          matched.push({
            label: csvEntry.label,
            annotationTitle: matchedAnnotation.title,
            wikidata: '(cleared)',
          });
          continue;
        }

        // 共通ライブラリを使用してWikidata情報を取得
        let newWikidataEntry: WikidataItem;
        try {
          newWikidataEntry = await createWikidataItem(csvEntry.wikidata, bulkWikidataLang);
        } catch {
          newWikidataEntry = {
            type: 'wikidata',
            uri: csvEntry.wikidata,
            label: csvEntry.label,
            lat: '',
            lng: '',
            thumbnail: '',
          };
        }

        // 既存のwikidataを完全に上書き（新しいエントリのみ）
        await updateDoc(matchedAnnotation.docRef, {
          wikidata: [newWikidataEntry],
        });
        matched.push({
          label: csvEntry.label,
          annotationTitle: matchedAnnotation.title,
          wikidata: csvEntry.wikidata,
        });
      }

      setBulkWikidataResult({ matched, skipped, notFound });
    } catch (error) {
      console.error('Error processing bulk wikidata:', error);
      alert('Error processing CSV file.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkWikidataClose = () => {
    setIsBulkWikidataDialogOpen(false);
    setBulkWikidataFile('');
    setBulkWikidataResult(null);
  };

  return (
    <>
      <style jsx global>{`
        html,
        body,
        #__next {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div className="flex flex-col h-full w-full bg-[var(--background)]">
        <header className="bg-[var(--card-bg)] border-b border-[var(--border)] py-4 px-6 flex justify-between items-center shadow-sm">
          <h1 className="m-0 text-xl font-bold text-[var(--text-primary)]">IIIF 3D Editor</h1>
          <nav className="flex items-center gap-6">
            <a href="#home" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
              Home
            </a>
            <a href="/about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
              About
            </a>
            <SignIn />
          </nav>
        </header>
        <div className="flex flex-1">
          <div className="flex-1 border-r border-[var(--border)] relative">
            <ThreeCanvas
              annotationsVisible={annotationsVisible}
              annotationMode={annotationMode}
              manifestUrl={manifestUrl}
              compactMarkers={compactMarkers}
              focusAnnotationId={focusAnnotationId}
            />
            <div className="absolute top-4 left-4 z-[100]">
              <button
                onClick={() => setIsViewerMenuOpen(!isViewerMenuOpen)}
                className="p-3 bg-[var(--card-bg)]/95 rounded-lg shadow-lg backdrop-blur-sm border border-[var(--border)] hover:bg-[var(--secondary-bg)] transition-colors"
                title="Menu"
              >
                <FaBars className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
              {isViewerMenuOpen && (
                <div className="mt-2 bg-[var(--card-bg)]/95 p-4 rounded-lg shadow-lg backdrop-blur-sm border border-[var(--border)]">
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Display annotations</p>
                    <SwitchButton checked={annotationsVisible} onChange={handleSwitchChange} />
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Polygon annotation mode</p>
                    <SwitchButton checked={annotationMode} onChange={handleAnnotationModeChange} />
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Compact markers</p>
                    <SwitchButton checked={compactMarkers} onChange={() => setCompactMarkers(!compactMarkers)} />
                  </div>
                  <div>
                    <button
                      onClick={handleAnnotationListOpen}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--secondary-bg)] border border-[var(--border)] rounded-md transition-colors"
                    >
                      <FaList className="w-4 h-4" />
                      Annotation List
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-4 bg-[var(--secondary-bg)] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3 mb-3 flex-shrink-0">
              <input
                type="text"
                value={manifestUrl}
                onChange={handleManifestUrlChange}
                placeholder="Enter IIIF Manifest URL"
                className="input-field mb-0"
                style={{ width: '600px' }}
              />
              <button
                onClick={() => handleRDFOpenDialog()}
                className="ml-10 p-0 bg-transparent border-0 cursor-pointer hover:opacity-70 transition-opacity"
                title="Export RDF"
              >
                <img src="/images/rdf.png" alt="RDF" className="w-8 h-8 object-contain" />
              </button>
              <button
                onClick={() => downloadIIIFManifest(manifestUrl)}
                className="ml-4 p-0 bg-transparent border-0 cursor-pointer hover:opacity-70 transition-opacity"
                title="View IIIF Manifest"
              >
                <img src="/images/iiif.png" alt="IIIF" className="w-10 h-10 object-contain" />
              </button>
              <button
                onClick={() => setIsBulkWikidataDialogOpen(true)}
                className="ml-4 flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--secondary-bg)] border border-[var(--border)] rounded-md transition-colors"
                title="Bulk Wikidata Registration"
              >
                <FaUpload className="w-4 h-4" />
                Bulk Wikidata
              </button>
            </div>
            <div className="flex gap-4 border-b border-[var(--border)] pb-4 mb-4 flex-shrink-0" style={{ minHeight: '320px', maxHeight: '320px' }}>
              <div className="flex-1 card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg m-0 text-[var(--text-primary)]">
                      {infoPanelContent?.title || 'Annotation Details'}
                    </h3>
                    <button
                      onClick={handleTitleOpenDialog}
                      className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                      title="Edit title"
                    >
                      <FaPencilAlt className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={handleDescOpenDialog}
                    className="btn-icon btn-icon-sm btn-secondary"
                    title="Edit description"
                  >
                    <FaPencilAlt />
                  </button>
                </div>
                <div
                  className="description-content overflow-y-auto max-h-56 text-sm leading-relaxed text-[var(--text-secondary)]"
                  dangerouslySetInnerHTML={{ __html: desc || '' }}
                ></div>
              </div>
              <div className="flex-1 card">
                <DisplayTEI manifestUrl={manifestUrl} />
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="card flex-1 overflow-hidden flex flex-col">
                {/* Meta-level Tab Navigation: Object/Annotation */}
                <div className="flex gap-2 mb-3 border-b-2 border-[var(--border)] flex-shrink-0">
                  <button
                    className={`px-4 py-2 text-sm font-bold transition-colors ${
                      metaTab === 'object'
                        ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] -mb-[2px]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    onClick={() => setMetaTab('object')}
                  >
                    Object
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-bold transition-colors ${
                      metaTab === 'annotation'
                        ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] -mb-[2px]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    onClick={() => setMetaTab('annotation')}
                  >
                    Annotation
                  </button>
                </div>

                {/* Object Tab Content */}
                {metaTab === 'object' && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Sub-level Tab Navigation: Resources/Linked Data/References/Location */}
                    <div className="flex gap-2 mb-3 border-b border-[var(--border)] flex-shrink-0">
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          objectTab === 'resources'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setObjectTab('resources')}
                      >
                        Resources
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          objectTab === 'linkedData'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setObjectTab('linkedData')}
                      >
                        Linked Data
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          objectTab === 'references'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setObjectTab('references')}
                      >
                        References
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          objectTab === 'location'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setObjectTab('location')}
                      >
                        Location
                      </button>
                    </div>

                    {/* Resources Tab */}
                    {objectTab === 'resources' && (
                      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                          <button
                            onClick={() => setIsObjectMediaDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Add resource"
                          >
                            <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsObjectMediaUploadDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Upload CSV"
                          >
                            <FaUpload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto" style={{ height: '220px' }}>
                          <div className="flex flex-wrap gap-3">
                            {objectMetadata?.media && objectMetadata.media.length > 0 ? (
                              objectMetadata.media.map((mediaItem, index) => (
                                <div key={index} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow" style={{ width: 'calc(33.333% - 8px)' }}>
                                  {/* Thumbnail */}
                                  <div className="relative w-full h-32 bg-gray-100 cursor-pointer" onClick={() => {
                                    if (mediaItem.type === 'img') {
                                      setSelectedImage({
                                        source: mediaItem.source,
                                        caption: mediaItem.caption,
                                        index: index,
                                      });
                                    } else if (mediaItem.type === 'video') {
                                      setSelectedVideo({
                                        source: `https://www.youtube.com/embed/${mediaItem.source.split('/')[3]}`,
                                        caption: mediaItem.caption,
                                        index: index,
                                      });
                                    } else if (mediaItem.type === 'iiif' && mediaItem.manifestUrl) {
                                      setSelectedIIIF({
                                        manifestUrl: mediaItem.manifestUrl,
                                        caption: mediaItem.caption,
                                        index: index,
                                      });
                                    } else if (mediaItem.type === 'sketchfab' && mediaItem.canvasId) {
                                      setSelectedSketchFab({
                                        modelId: mediaItem.canvasId,
                                        caption: mediaItem.caption,
                                        index: index,
                                      });
                                    }
                                  }}>
                                    {mediaItem.type === 'img' && (
                                      <img src={mediaItem.source} alt={mediaItem.caption || 'Resource'} className="w-full h-full object-cover" />
                                    )}
                                    {mediaItem.type === 'video' && (
                                      <img
                                        src={`https://img.youtube.com/vi/${mediaItem.source.split('/')[3].split('?')[0]}/default.jpg`}
                                        alt={mediaItem.caption || 'Resource'}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    {mediaItem.type === 'iiif' && (
                                      <img src={mediaItem.source} alt={mediaItem.caption || 'Resource'} className="w-full h-full object-cover" />
                                    )}
                                    {mediaItem.type === 'sketchfab' && (
                                      <img src={mediaItem.source} alt={mediaItem.caption || 'Resource'} className="w-full h-full object-cover" />
                                    )}
                                  </div>

                                  {/* Caption and Type Badge */}
                                  <div className="p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{mediaItem.caption}</p>
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                                          mediaItem.type === 'iiif' ? 'bg-purple-100 text-purple-700' :
                                          mediaItem.type === 'video' ? 'bg-red-100 text-red-700' :
                                          mediaItem.type === 'sketchfab' ? 'bg-green-100 text-green-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {mediaItem.type === 'iiif' ? 'IIIF' : mediaItem.type === 'video' ? 'YouTube' : mediaItem.type === 'sketchfab' ? 'SketchFab' : 'Image'}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteObjectMedia(index);
                                        }}
                                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                                        title="Delete"
                                      >
                                        <FaTrashAlt className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="col-span-2 text-center text-sm text-[var(--text-secondary)] mt-4">No resources available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Linked Data Tab */}
                    {objectTab === 'linkedData' && (
                      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                          <button
                            onClick={() => setIsObjectWikidataDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Add linked data"
                          >
                            <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsObjectAuthorityUploadDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Upload CSV"
                          >
                            <FaUpload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto" style={{ height: '220px' }}>
                          <div className="flex flex-wrap gap-3">
                            {objectMetadata?.wikidata && objectMetadata.wikidata.length > 0 ? (
                              objectMetadata.wikidata.map((wikiItem, index) => (
                                <div key={index} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow" style={{ width: 'calc(33.333% - 8px)' }}>
                                  {/* Thumbnail Image */}
                                  {wikiItem.thumbnail && (
                                    <div className="mb-2 -mx-3 -mt-3">
                                      <img
                                        src={wikiItem.thumbnail}
                                        alt={wikiItem.label}
                                        className="w-full h-24 object-cover rounded-t-lg"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  {/* Header with Label and Type Badge */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                                        {wikiItem.label}
                                      </h4>
                                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                        wikiItem.type === 'wikidata'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {wikiItem.type === 'wikidata' ? 'Wikidata' : 'GeoNames'}
                                      </span>
                                      {wikiItem.lat && wikiItem.lng && (
                                        <span className="ml-2 text-xs text-[var(--text-secondary)]">
                                          {Math.abs(parseFloat(wikiItem.lat)).toFixed(2)}°{parseFloat(wikiItem.lat) >= 0 ? 'N' : 'S'}, {Math.abs(parseFloat(wikiItem.lng)).toFixed(2)}°{parseFloat(wikiItem.lng) >= 0 ? 'E' : 'W'}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => deleteObjectWikidata(index)}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                                      title="Delete"
                                    >
                                      <FaTrashAlt className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <a
                                      href={wikiItem.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                      title="View on external site"
                                    >
                                      <PiShareNetwork className="w-4 h-4" />
                                      View
                                    </a>
                                    {wikiItem.wikipedia && (
                                      <a
                                        href={wikiItem.wikipedia}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                        title="View on Wikipedia"
                                      >
                                        <IoDocumentTextOutline className="w-4 h-4" />
                                        Wikipedia
                                      </a>
                                    )}
                                    {wikiItem.lat && wikiItem.lng && (
                                      <button
                                        onClick={() => {
                                          if (wikiItem.lat !== undefined && wikiItem.lng !== undefined) {
                                            ShowMap(wikiItem.lat, wikiItem.lng);
                                          }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                        title="Show on map"
                                      >
                                        <LiaMapMarkedSolid className="w-4 h-4" />
                                        Map
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="col-span-2 text-center text-sm text-[var(--text-secondary)] mt-4">No linked data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* References Tab */}
                    {objectTab === 'references' && (
                      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                          <button
                            onClick={() => setIsObjectBibDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Add reference"
                          >
                            <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsObjectBibUploadDialogOpen(true)}
                            className="btn-icon btn-icon-sm btn-secondary"
                            title="Upload CSV"
                          >
                            <FaUpload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto" style={{ height: '220px' }}>
                          {objectMetadata?.bibliography && objectMetadata.bibliography.length > 0 ? (
                            objectMetadata.bibliography.map((bibItem, index) => (
                              <div key={index} className="p-3 border-b border-[var(--border)] hover:bg-[var(--secondary-bg)] transition-colors">
                                <p className="text-sm font-medium text-[var(--text-primary)]">{bibItem.title}</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                  {bibItem.author} ({bibItem.year})
                                  {bibItem.page && `, p. ${bibItem.page}`}
                                </p>
                                {bibItem.pdf && (
                                  <a href={bibItem.pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline mt-1 inline-block">
                                    View PDF
                                  </a>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-sm text-[var(--text-secondary)] mt-4">No references available</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location Tab */}
                    {objectTab === 'location' && (
                      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="mb-3 flex-shrink-0">
                          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Latitude</label>
                          <input
                            type="text"
                            value={objectLocationLat}
                            onChange={(e) => setObjectLocationLat(e.target.value)}
                            placeholder="Enter latitude"
                            className="input-field w-full"
                          />
                        </div>
                        <div className="mb-3 flex-shrink-0">
                          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Longitude</label>
                          <input
                            type="text"
                            value={objectLocationLng}
                            onChange={(e) => setObjectLocationLng(e.target.value)}
                            placeholder="Enter longitude"
                            className="input-field w-full"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={saveObjectLocation} className="btn-primary">
                            Save Location
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Annotation Tab Content */}
                {metaTab === 'annotation' && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Sub-level Tab Navigation: Resources/Linked Data/References */}
                    <div className="flex gap-2 mb-3 border-b border-[var(--border)] flex-shrink-0">
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          infoTab === 'resources'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setInfoTab('resources')}
                      >
                        Resources
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          infoTab === 'linkedData'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setInfoTab('linkedData')}
                      >
                        Linked Data
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          infoTab === 'references'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setInfoTab('references')}
                      >
                        References
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          infoTab === 'location'
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => setInfoTab('location')}
                      >
                        Location
                      </button>
                    </div>

                {/* Resources Tab */}
                {infoTab === 'resources' && (
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                      <button
                        onClick={handleMediaOpenDialog}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Add resource"
                      >
                        <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleMediaUpload}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Upload CSV"
                      >
                        <img src="/images/upload.png" alt="Upload" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto" style={{ height: '220px' }}>
                      <div className="flex flex-wrap gap-3">
                        {infoPanelContent?.media && infoPanelContent.media.length > 0
                          ? infoPanelContent.media.map((mediaItem, index) => (
                              <div key={index} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow" style={{ width: 'calc(33.333% - 8px)' }}>
                                {/* Thumbnail */}
                                <div className="relative w-full h-32 bg-gray-100 cursor-pointer" onClick={() => {
                                  if (mediaItem.type === 'img') {
                                    setSelectedImage({
                                      source: mediaItem.source,
                                      caption: mediaItem.caption,
                                      index: index,
                                    });
                                  } else if (mediaItem.type === 'video') {
                                    setSelectedVideo({
                                      source: `https://www.youtube.com/embed/${mediaItem.source.split('/')[3]}`,
                                      caption: mediaItem.caption,
                                      index: index,
                                    });
                                  } else if (mediaItem.type === 'iiif' && mediaItem.manifestUrl) {
                                    setSelectedIIIF({
                                      manifestUrl: mediaItem.manifestUrl,
                                      caption: mediaItem.caption,
                                      index: index,
                                    });
                                  } else if (mediaItem.type === 'sketchfab' && mediaItem.canvasId) {
                                    setSelectedSketchFab({
                                      modelId: mediaItem.canvasId,
                                      caption: mediaItem.caption,
                                      index: index,
                                    });
                                  }
                                }}>
                                  {mediaItem.type === 'img' && (
                                    <img src={mediaItem.source} alt={mediaItem.caption} className="w-full h-full object-cover" />
                                  )}
                                  {mediaItem.type === 'video' && (
                                    <img
                                      src={`https://img.youtube.com/vi/${mediaItem.source.split('/')[3].split('?')[0]}/default.jpg`}
                                      alt={mediaItem.caption}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  {mediaItem.type === 'iiif' && (
                                    <img src={mediaItem.source} alt={mediaItem.caption} className="w-full h-full object-cover" />
                                  )}
                                  {mediaItem.type === 'sketchfab' && (
                                    <img src={mediaItem.source} alt={mediaItem.caption} className="w-full h-full object-cover" />
                                  )}
                                </div>

                                {/* Caption and Type Badge */}
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{mediaItem.caption}</p>
                                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                                        mediaItem.type === 'iiif' ? 'bg-purple-100 text-purple-700' :
                                        mediaItem.type === 'video' ? 'bg-red-100 text-red-700' :
                                        mediaItem.type === 'sketchfab' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {mediaItem.type === 'iiif' ? 'IIIF' : mediaItem.type === 'video' ? 'YouTube' : mediaItem.type === 'sketchfab' ? 'SketchFab' : 'Image'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (infoPanelContent?.id) {
                                          deleteMedia(infoPanelContent.id, index);
                                        }
                                      }}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                                      title="Delete"
                                    >
                                      <FaTrashAlt className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          : <p className="col-span-2 text-center text-sm text-[var(--text-secondary)] mt-4">No resources available</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Linked Data Tab */}
                {infoTab === 'linkedData' && (
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                      <button
                        onClick={handleWikidataOpenDialog}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Add linked data"
                      >
                        <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleAuthorityUpload}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Upload CSV"
                      >
                        <img src="/images/upload.png" alt="Upload" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto" style={{ height: '220px' }}>
                      <div className="flex flex-wrap gap-3">
                    {infoPanelContent?.wikidata && infoPanelContent.wikidata.length > 0
                      ? infoPanelContent.wikidata.map((wikiItem, index) => (
                          <div key={index} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow" style={{ width: 'calc(33.333% - 8px)' }}>
                            {/* Thumbnail Image */}
                            {wikiItem.thumbnail && (
                              <div className="mb-2 -mx-3 -mt-3">
                                <img
                                  src={wikiItem.thumbnail}
                                  alt={wikiItem.label}
                                  className="w-full h-24 object-cover rounded-t-lg"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            {/* Header with Label and Type Badge */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                                  {wikiItem.label}
                                </h4>
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                  wikiItem.type === 'wikidata'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {wikiItem.type === 'wikidata' ? 'Wikidata' : 'GeoNames'}
                                </span>
                                {wikiItem.lat && wikiItem.lng && (
                                  <span className="ml-2 text-xs text-[var(--text-secondary)]">
                                    {Math.abs(parseFloat(wikiItem.lat)).toFixed(2)}°{parseFloat(wikiItem.lat) >= 0 ? 'N' : 'S'}, {Math.abs(parseFloat(wikiItem.lng)).toFixed(2)}°{parseFloat(wikiItem.lng) >= 0 ? 'E' : 'W'}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  if (infoPanelContent?.id) {
                                    deleteWiki(infoPanelContent.id, index);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                title="Delete"
                              >
                                <FaTrashAlt className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <a
                                href={wikiItem.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View on external site"
                              >
                                <PiShareNetwork className="w-4 h-4" />
                                View
                              </a>
                              {wikiItem.wikipedia && (
                                <a
                                  href={wikiItem.wikipedia}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="View on Wikipedia"
                                >
                                  <IoDocumentTextOutline className="w-4 h-4" />
                                  Wikipedia
                                </a>
                              )}
                              {wikiItem.lat && wikiItem.lng && (
                                <button
                                  onClick={() => {
                                    if (wikiItem.lat !== undefined && wikiItem.lng !== undefined) {
                                      ShowMap(wikiItem.lat, wikiItem.lng);
                                    }
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                  title="Show on map"
                                >
                                  <LiaMapMarkedSolid className="w-4 h-4" />
                                  Map
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* References Tab */}
                {infoTab === 'references' && (
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex justify-end gap-1.5 mb-3 flex-shrink-0">
                      <button
                        onClick={handleBibOpenDialog}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Add reference"
                      >
                        <img src="/images/queue.png" alt="Add" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleBibUpload}
                        className="btn-icon btn-icon-sm btn-secondary"
                        title="Upload CSV"
                      >
                        <img src="/images/upload.png" alt="Upload" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto space-y-3" style={{ height: '220px' }}>
                    {infoPanelContent?.bibliography && infoPanelContent.bibliography.length > 0
                      ? infoPanelContent.bibliography.map((bibItem, index) => (
                          <div key={index} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow">
                            {/* Header with Author and Year */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start gap-2 flex-1">
                                <FaBook className="text-gray-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                    {bibItem.author} ({bibItem.year})
                                  </h4>
                                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                    {bibItem.title}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (infoPanelContent?.id) {
                                    deleteBib(infoPanelContent.id, index);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors p-1 ml-2"
                                title="Delete"
                              >
                                <FaTrashAlt className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Actions */}
                            {(bibItem.page || bibItem.pdf) && (
                              <div className="flex gap-2 pt-2 border-t border-gray-100">
                                {bibItem.page && (
                                  <a
                                    href={bibItem.page}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="View page"
                                  >
                                    <FaLink className="w-3 h-3" />
                                    Page
                                  </a>
                                )}
                                {bibItem.pdf && (
                                  <a
                                    href={bibItem.pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="View PDF"
                                  >
                                    <FaRegFilePdf className="w-3 h-3" />
                                    PDF
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      : null}
                    </div>
                  </div>
                )}

                {/* Location Tab */}
                {infoTab === 'location' && (
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex flex-col gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={locationLat}
                          onChange={(e) => setLocationLat(e.target.value)}
                          placeholder="e.g. 35.6762"
                          className="px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={locationLng}
                          onChange={(e) => setLocationLng(e.target.value)}
                          placeholder="e.g. 139.6503"
                          className="px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveLocation}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md transition-colors"
                        >
                          Save
                        </button>
                        {locationLat && locationLng && (
                          <button
                            onClick={() => ShowMap(locationLat, locationLng)}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-300 rounded-md transition-colors"
                          >
                            <LiaMapMarkedSolid className="w-4 h-4" />
                            Open Map
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-3 flex-shrink-0">
                <button
                  onClick={() => infoPanelContent?.id && downloadAnnotation(infoPanelContent.id)}
                  className="btn-primary"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => infoPanelContent?.id && deleteAnnotation(infoPanelContent.id)}
                  className="btn-danger"
                >
                  Delete Annotation
                </button>
              </div>
            </div>
          </div>
        </div>
        <footer className="bg-[var(--card-bg)] border-t border-[var(--border)] py-3 px-6 text-center">
          <p className="text-sm text-[var(--text-secondary)] m-0">
            &copy; 2025 IIIF 3D Editor. All rights reserved.
          </p>
        </footer>
      </div>

      {isRDFDialogOpen && (
        <div className="dialog-overlay" onClick={handleRDFCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                IRI:
                <input
                  name="IRI"
                  value={IRI}
                  required
                  onChange={(e) => setIRI(e.target.value)}
                  className="input-field"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => downloadRDF(manifestUrl)} className="btn-info">
                  Download
                </button>
                <button type="button" onClick={handleRDFCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMediaUploadDialogOpen && (
        <div className="dialog-overlay" onClick={handleMediaUploadCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Upload CSV File:
                <input type="file" accept=".csv" onChange={uploadMediaCSV} className="input-field" />
              </label>
              <p className="text-red-600 font-medium">【注意】既存のデータは上書きされます。</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveMediaUpload} className="btn-info">
                  Upload
                </button>
                <button type="button" onClick={handleMediaUploadCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMediaDialogOpen && (
        <div className="dialog-overlay" onClick={handleMediaCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Source URI:
                <textarea
                  name="source"
                  value={source}
                  required
                  onChange={(e) => setSource(e.target.value)}
                  className="input-field resize-y min-h-24"
                  placeholder={type === 'sketchfab' ? 'Paste SketchFab HTML embed code here...' : 'Enter URL or embed code...'}
                />
              </label>
              <label className="font-bold text-lg">
                Type:
                <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input-field">
                  <option value="img">Image</option>
                  <option value="video">Youtube</option>
                  <option value="iiif">IIIF Manifest</option>
                  <option value="sketchfab">SketchFab</option>
                </select>
              </label>
              <label className="font-bold text-lg">
                Caption:
                <textarea
                  name="caption"
                  value={caption}
                  required
                  onChange={(e) => setCaption(e.target.value)}
                  className="input-field resize-y min-h-24"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveMedias} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={handleMediaCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAuthorityUploadDialogOpen && (
        <div className="dialog-overlay" onClick={handleAuthorityUploadCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Upload CSV File:
                <input type="file" accept=".csv" onChange={uploadAuthorityCSV} className="input-field" />
              </label>
              <p className="text-red-600 font-medium">【注意】既存のデータは上書きされます。</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveAuthorityUpload} className="btn-info">
                  Upload
                </button>
                <button type="button" onClick={handleAuthorityUploadCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isWikidataDialogOpen && (
        <div className="dialog-overlay" onClick={handleWikidataCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Type:
                <select
                  name="type"
                  value={wikiType}
                  onChange={(e) => setWikiType(e.target.value)}
                  className="input-field"
                >
                  <option value="wikidata">Wikidata</option>
                  <option value="geonames">GeoNames</option>
                </select>
              </label>
              <label className="font-bold text-lg">
                URI:
                <input
                  name="wikidata"
                  value={wikidata}
                  required
                  onChange={(e) => setWikidata(e.target.value)}
                  className="input-field"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveWikidata} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={handleWikidataCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBibUploadDialogOpen && (
        <div className="dialog-overlay" onClick={handleBibUploadCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Upload CSV File:
                <input type="file" accept=".csv" onChange={uploadBibCSV} className="input-field" />
              </label>
              <p className="text-red-600 font-medium">【注意】既存のデータは上書きされます。</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveBibUpload} className="btn-info">
                  Upload
                </button>
                <button type="button" onClick={handleBibUploadCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBibDialogOpen && (
        <div className="dialog-overlay" onClick={handleBibCloseDialog}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Author:
                <input
                  name="bibAuthor"
                  value={bibAuthor}
                  required
                  onChange={(e) => setBibAuthor(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Title:
                <textarea
                  name="bibTitle"
                  value={bibTitle}
                  required
                  onChange={(e) => setBibTitle(e.target.value)}
                  className="input-field resize-y min-h-20"
                />
              </label>
              <label className="font-bold text-lg">
                Year:
                <input
                  name="bibYear"
                  value={bibYear}
                  required
                  onChange={(e) => setBibYear(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Page URL:
                <input
                  name="bibPage"
                  value={bibPage}
                  required
                  onChange={(e) => setBibPage(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                PDF:
                <input
                  name="bibPDF"
                  value={bibPDF}
                  required
                  onChange={(e) => setBibPDF(e.target.value)}
                  className="input-field"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveBib} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={handleBibCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAnnotationListOpen && (
        <div className="dialog-overlay" onClick={() => setIsAnnotationListOpen(false)}>
          <div className="dialog w-[500px] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)] m-0">Annotation List</h2>
              <button
                onClick={() => setIsAnnotationListOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {annotationList.length > 0 ? (
                <ul className="space-y-2 m-0 p-0 list-none">
                  {annotationList.map((annotation) => (
                    <li
                      key={annotation.id}
                      className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-md hover:bg-[var(--secondary-bg)] cursor-pointer transition-colors"
                      onClick={() => {
                        // 一度nullにしてから設定することで、同じIDでも再度フォーカス可能にする
                        setFocusAnnotationId(null);
                        setTimeout(() => setFocusAnnotationId(annotation.id), 0);
                        setIsAnnotationListOpen(false);
                      }}
                    >
                      <p className="m-0 text-sm font-medium text-[var(--text-primary)]">{annotation.title}</p>
                      <p className="m-0 text-xs text-[var(--text-tertiary)] mt-1 truncate">{annotation.id}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-secondary)] text-center py-8">No annotations found for this manifest.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isTitleDialogOpen && (
        <div className="dialog-overlay" onClick={handleTitleCloseDialog}>
          <div className="dialog w-[400px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <label className="font-bold text-lg">
                Title:
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveTitle} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={handleTitleCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDescDialogOpen && (
        <div className="dialog-overlay" onClick={handleDescCloseDialog}>
          <div className="dialog w-[900px] h-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4 h-full">
              <div
                id="editorJS"
                className="h-[350px] min-h-[350px] mb-5 overflow-y-auto border border-[var(--border)] rounded-md p-3"
              />
              <div className="flex justify-end gap-3 mt-auto">
                <button type="button" onClick={btnSaves} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={handleDescCloseDialog} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="dialog-overlay" onClick={() => setSelectedImage(null)}>
          <div className="flex flex-col items-center justify-center max-w-[90%] max-h-[90%]">
            <img
              src={selectedImage.source}
              alt={selectedImage.caption}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
            />
            <p className="text-white mt-4 text-2xl font-medium">{selectedImage.caption}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (infoPanelContent?.id) {
                  deleteMedia(infoPanelContent.id, selectedImage.index);
                }
              }}
              className="btn-danger fixed top-4 right-4"
            >
              <FaTrashAlt />
            </button>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div className="dialog-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="flex flex-col items-center justify-center w-full h-full px-8">
            <iframe
              className="w-full h-[70%] rounded-lg shadow-2xl"
              src={selectedVideo.source}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
            <p className="text-white mt-4 text-2xl font-medium">{selectedVideo.caption}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (infoPanelContent?.id) {
                  deleteMedia(infoPanelContent.id, selectedVideo.index);
                }
              }}
              className="btn-danger fixed top-4 right-4"
            >
              <FaTrashAlt />
            </button>
          </div>
        </div>
      )}

      {isBulkWikidataDialogOpen && (
        <div className="dialog-overlay" onClick={handleBulkWikidataClose}>
          <div className="dialog w-[700px] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)] m-0">Bulk Wikidata Registration</h2>
              <button
                onClick={handleBulkWikidataClose}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Upload a CSV file with columns: label, wikidata
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkWikidataFileChange}
                className="input-field"
              />
              <div className="mt-3 p-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-md text-xs text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text-primary)] mb-1">Update behavior:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Wikidata will be <strong>completely replaced</strong> for matched annotations</li>
                  <li>If wikidata column is empty, existing wikidata will be cleared</li>
                  <li>Lat/Lng are automatically fetched from Wikidata</li>
                </ul>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Label Language:
                <select
                  value={bulkWikidataLang}
                  onChange={(e) => setBulkWikidataLang(e.target.value)}
                  className="ml-2 p-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--text-primary)]"
                >
                  <option value="ja">Japanese (ja)</option>
                  <option value="en">English (en)</option>
                  <option value="de">German (de)</option>
                  <option value="fr">French (fr)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="zh">Chinese (zh)</option>
                  <option value="ko">Korean (ko)</option>
                </select>
              </label>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={processBulkWikidata}
                disabled={isBulkProcessing || !bulkWikidataFile}
                className="btn-primary disabled:opacity-50"
              >
                {isBulkProcessing ? 'Processing...' : 'Process CSV'}
              </button>
            </div>

            {isBulkProcessing && bulkProgress.total > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex justify-between text-sm text-blue-800 mb-2">
                  <span>Processing: {bulkProgress.currentLabel}</span>
                  <span>{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {bulkWikidataResult && (
              <div className="overflow-y-auto max-h-[50vh] space-y-4">
                {/* Matched */}
                <div>
                  <h3 className="text-sm font-bold text-green-600 mb-2">
                    Matched ({bulkWikidataResult.matched.length})
                  </h3>
                  {bulkWikidataResult.matched.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {bulkWikidataResult.matched.map((item, idx) => (
                        <li key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-green-800">
                          {item.label} → {item.wikidata}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-tertiary)]">None</p>
                  )}
                </div>

                {/* Skipped */}
                <div>
                  <h3 className="text-sm font-bold text-yellow-600 mb-2">
                    Skipped ({bulkWikidataResult.skipped.length})
                  </h3>
                  {bulkWikidataResult.skipped.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {bulkWikidataResult.skipped.map((item, idx) => (
                        <li key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                          {item.label} - {item.reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-tertiary)]">None</p>
                  )}
                </div>

                {/* Not Found */}
                <div>
                  <h3 className="text-sm font-bold text-red-600 mb-2">
                    Not Found ({bulkWikidataResult.notFound.length})
                  </h3>
                  {bulkWikidataResult.notFound.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {bulkWikidataResult.notFound.map((item, idx) => (
                        <li key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-red-800">
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-tertiary)]">None</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Object用のダイアログ群 */}
      {isObjectMediaDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsObjectMediaDialogOpen(false)}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Object Media</h2>
              <label className="font-bold text-lg">
                Source URI:
                <textarea
                  name="source"
                  value={objectSource}
                  required
                  onChange={(e) => setObjectSource(e.target.value)}
                  className="input-field resize-y min-h-24"
                  placeholder={objectType === 'sketchfab' ? 'Paste SketchFab HTML embed code here...' : 'Enter URL or embed code...'}
                />
              </label>
              <label className="font-bold text-lg">
                Type:
                <select name="type" value={objectType} onChange={(e) => setObjectType(e.target.value)} className="input-field">
                  <option value="img">Image</option>
                  <option value="video">Youtube</option>
                  <option value="iiif">IIIF Manifest</option>
                  <option value="sketchfab">SketchFab</option>
                </select>
              </label>
              <label className="font-bold text-lg">
                Caption:
                <textarea
                  name="caption"
                  value={objectCaption}
                  required
                  onChange={(e) => setObjectCaption(e.target.value)}
                  className="input-field resize-y min-h-24"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveObjectMedia} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={() => setIsObjectMediaDialogOpen(false)} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isObjectWikidataDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsObjectWikidataDialogOpen(false)}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Object Linked Data</h2>
              <label className="font-bold text-lg">
                Type:
                <select
                  name="type"
                  value={objectWikiType}
                  onChange={(e) => setObjectWikiType(e.target.value)}
                  className="input-field"
                >
                  <option value="wikidata">Wikidata</option>
                  <option value="geonames">GeoNames</option>
                </select>
              </label>
              <label className="font-bold text-lg">
                IRI:
                <input
                  name="IRI"
                  value={objectIRI}
                  required
                  onChange={(e) => setObjectIRI(e.target.value)}
                  className="input-field"
                  placeholder="https://www.wikidata.org/wiki/Q..."
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveObjectWikidata} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={() => setIsObjectWikidataDialogOpen(false)} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isObjectBibDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsObjectBibDialogOpen(false)}>
          <div className="dialog w-[500px]" onClick={(e) => e.stopPropagation()}>
            <form className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Object Reference</h2>
              <label className="font-bold text-lg">
                Author:
                <input
                  name="author"
                  value={objectBibAuthor}
                  required
                  onChange={(e) => setObjectBibAuthor(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Title:
                <input
                  name="title"
                  value={objectBibTitle}
                  required
                  onChange={(e) => setObjectBibTitle(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Year:
                <input
                  name="year"
                  value={objectBibYear}
                  required
                  onChange={(e) => setObjectBibYear(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Page:
                <input
                  name="page"
                  value={objectBibPage}
                  onChange={(e) => setObjectBibPage(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                PDF URL:
                <input
                  name="pdf"
                  value={objectBibPDF}
                  onChange={(e) => setObjectBibPDF(e.target.value)}
                  className="input-field"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={saveObjectBibliography} className="btn-info">
                  Save
                </button>
                <button type="button" onClick={() => setIsObjectBibDialogOpen(false)} className="btn-primary">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IIIF Mirador Viewer Dialog */}
      {selectedIIIF && (
        <div className="dialog-overlay" onClick={() => setSelectedIIIF(null)}>
          <div className="w-[90vw] h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">{selectedIIIF.caption}</h3>
              <button
                onClick={() => setSelectedIIIF(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors text-2xl font-bold"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-[calc(100%-4rem)]">
              <iframe
                src={`https://projectmirador.org/embed/?iiif-content=${encodeURIComponent(selectedIIIF.manifestUrl)}`}
                className="w-full h-full border-0"
                title="IIIF Mirador Viewer"
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}

      {/* SketchFab Viewer Dialog */}
      {selectedSketchFab && (
        <div className="dialog-overlay" onClick={() => setSelectedSketchFab(null)}>
          <div className="w-[90vw] h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">{selectedSketchFab.caption}</h3>
              <button
                onClick={() => setSelectedSketchFab(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors text-2xl font-bold"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-[calc(100%-4rem)]">
              <iframe
                src={`https://sketchfab.com/models/${selectedSketchFab.modelId}/embed?autostart=1&ui_theme=dark`}
                className="w-full h-full border-0"
                title="SketchFab 3D Model Viewer"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
