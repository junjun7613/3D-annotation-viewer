'use client';

import { useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { NextPage } from 'next';
import SignIn from './components/SignIn';
import ThreeCanvas from './components/ThreeCanvasManifest';
import SwitchButton from './components/SwitchButton';
import TEIViewer from './components/TEIViewer';
import { FaPencilAlt, FaBook, FaRegFilePdf, FaTrashAlt } from 'react-icons/fa';
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

import type EditorJS from '@editorjs/editorjs';
// import { link } from 'fs';

const Home: NextPage = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const [user] = useAuthState(auth);

  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  // sprite annotationとpolygon annotationの表示を切り替える
  const [annotationMode, setAnnotationMode] = useState(false);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  // infoPanelContentという連想配列を作成

  const [, /*editorData*/ setEditorData] = useState<OutputData | undefined>();

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
    bibliography?: BibItem[];
  }
  */

  interface WikidataItem {
    type: string;
    uri: string;
    label: string;
    wikipedia?: string;
    lat?: string;
    lng?: string;
  }

  interface BibItem {
    id: string;
    author: string;
    title: string;
    year: string;
    page: string;
    pdf: string;
  }

  const [infoPanelContent] = useAtom(infoPanelAtom);

  const [uploadedAuthorityContent, setUploadedAuthorityContent] = useState('');
  const [uploadedMediaContent, setUploadedMediaContent] = useState('');
  const [uploadedBibContent, setUploadedBibContent] = useState('');

  const [isRDFDialogOpen, setIsRDFDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isBibDialogOpen, setIsBibDialogOpen] = useState(false);
  const [isDescDialogOpen, setIsDescDialogOpen] = useState(false);
  const [isWikidataDialogOpen, setIsWikidataDialogOpen] = useState(false);

  const [isMediaUploadDialogOpen, setIsMediaUploadDialogOpen] = useState(false);
  const [isAuthorityUploadDialogOpen, setIsAuthorityUploadDialogOpen] = useState(false);
  const [isBibUploadDialogOpen, setIsBibUploadDialogOpen] = useState(false);

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

  // URLからマニフェストURLを取得して設定するuseEffect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) {
      setManifestUrl(manifestParam);
    }
  }, []);

  // description editor関連
  useEffect(() => {
    if (infoPanelContent?.description) {
      console.log(infoPanelContent.description);

      const parser = EditorJSHtml();
      const html = parser.parse(infoPanelContent.description as unknown as OutputData);

      console.log(html);

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

  console.log(infoPanelContent);

  const btnSaves = async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        console.log('Article data: ', outputData);

        // undefinedを削除
        const cleanedData = JSON.parse(JSON.stringify(outputData));
        console.log('OutputData after cleaning:', cleanedData);

        const docRef = doc(db, 'test', infoPanelContent?.id || '');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const origData = docSnap.data();
          console.log(origData.data.body.value);
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
      } catch (error) {
        console.log('Saving failed: ', error);
      }
    } else {
      console.warn('Editor instance is not initialized.');
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
    const data = {
      id: uuidv4(),
      source: source,
      type: type,
      caption: caption,
    };

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
    console.log(infoPanelContent);

    handleMediaCloseDialog();
  };

  const saveMediaUpload = async () => {
    console.log(uploadedMediaContent);
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
    };
    if (wikiType === 'wikidata') {
      // wikidataのsparqlエンドポイントにアクセスして該当するデータのラベルを取得
      console.log(wikidata);

      const query = `SELECT ?item ?itemLabel ?wikipediaUrl WHERE {
        VALUES ?item {wd:${wikidata.split('/').pop()}}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        OPTIONAL{
        ?wikipediaUrl schema:about ?item ;
        schema:inLanguage "en" ;
        schema:isPartOf <https://en.wikipedia.org/> .
    }
      }
      `; //wikidataのsparqlクエリ
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
        query
      )}&format=json`;
      const result = await fetch(url).then((res) => res.json());
      console.log(result);

      const label = result['results']['bindings'][0]['itemLabel']['value'];
      //もしbidingsの中にwikipediaUrlがあれば、その値を取得
      let wikipedia = '';
      if (result['results']['bindings'][0]['wikipediaUrl']) {
        wikipedia = result['results']['bindings'][0]['wikipediaUrl']['value'];
      }

      data = {
        type: wikiType,
        uri: wikidata,
        label: label,
        //もしwikipediaがあれば、dataに追加
        wikipedia: wikipedia,
      };
    } else if (wikiType === 'geonames') {
      console.log(wikidata);
      const id = wikidata.split('/').pop();
      const url = `http://api.geonames.org/getJSON?geonameId=${id}&username=${process.env.NEXT_PUBLIC_GEONAMES_USERNAME}`;

      //console.log(url);
      const result = await fetch(url).then((res) => res.json());
      //console.log(result);

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

      console.log(data);
    }

    // firebaseのannotationsコレクションのidを持つdocのMediaフィールド(Array)のdataをfirebaseから取得
    //const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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

    //console.log(updatedData?.wikidata);

    // infoPanelContentのwikidataにdataを追記
    infoPanelContent?.wikidata.push(data);
    console.log(infoPanelContent);

    handleWikidataCloseDialog();
  };

  const saveAuthorityUpload = async () => {
    // const mediaData = { source, type, caption };
    console.log(uploadedAuthorityContent);
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
      console.log(authority_type, authority_uri);

      let data: WikidataItem = {
        type: '',
        uri: '',
        label: '',
        wikipedia: '',
        lat: '',
        lng: '',
      };

      if (authority_type === 'wikidata') {
        // wikidataのsparqlエンドポイントにアクセスして該当するデータのラベルを取得
        console.log(authority_uri);

        const query = `SELECT ?item ?itemLabel ?wikipediaUrl WHERE {
          VALUES ?item {wd:${authority_uri.split('/').pop()}}
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          ?wikipediaUrl schema:about ?item ;
          schema:inLanguage "en" ;
          schema:isPartOf <https://en.wikipedia.org/> .
        }
        `; //wikidataのsparqlクエリ
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
          query
        )}&format=json`;
        const result = await fetch(url).then((res) => res.json());
        const label = result['results']['bindings'][0]['itemLabel']['value'];
        const wikipedia = result['results']['bindings'][0]['wikipediaUrl']['value'];
        /*
        const data = {
          uri: wikidata,
          label: label,
          wikipedia: wikipedia,
        };
        */
        data = {
          type: authority_type,
          uri: authority_uri,
          label: label,
          wikipedia: wikipedia,
        };
        infoPanelContent?.wikidata.push(data);
        authority.push(data);
      } else if (authority_type === 'geonames') {
        console.log(authority_uri);
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

    console.log(authority);

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
    console.log(infoPanelContent);

    handleBibCloseDialog();
  };

  const saveBibUpload = async () => {
    console.log(uploadedBibContent);
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

  const handleSwitchChange = (checked: boolean) => {
    setAnnotationsVisible(checked);
  };

  const handleAnnotationModeChange = (mode: boolean) => {
    setAnnotationMode(mode);
  };

  const handleManifestUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setManifestUrl(event.target.value);
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

  const downloadRDF = (id: string) => {
    console.log('RDF download');
    console.log('Manifest URL (id):', id);
    console.log('IRI prefix:', IRI);
    // firebaseのannotationsコレクションのすべてのDocの中から、targetmanifestの値がidと一致するものを取得
    //const querySnapshot = getDocs(collection(db, 'annotations'));
    const querySnapshot = getDocs(collection(db, 'test'));
    querySnapshot.then((snapshot) => {
      let turtleData =
        '@prefix : <https://www.example.com/vocabulary/> .\n@prefix schema: <https://schema.org/> .\n@prefix dc: <http://purl.org/dc/elements/1.1/> .'; // ベースURIを定義
      turtleData += '\n';

      console.log(`Total documents in 'test' collection: ${snapshot.size}`);
      let matchedCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Document ${doc.id}:`, {
          target_manifest: data.target_manifest,
          matches: data.target_manifest === id,
        });
        //console.log(data);
        const parser = EditorJSHtml();
        const cleanedData = JSON.parse(JSON.stringify(data.data.body.value || { blocks: [] })); // デフォルト値を設定
        console.log(cleanedData);
        const html = parser.parse(cleanedData);
        if (data.target_manifest === id) {
          matchedCount++;
          console.log(`✓ Matched annotation ${matchedCount}:`, data);
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
            data.wikidata.forEach((item: WikidataItem) => {
              properties.push(`  :wikidata <${item.uri}>`);
            });
          }

          // mediaの情報を追加
          if (data.media) {
            data.media.forEach((item: MediaItem) => {
              properties.push(`  :media <${IRI}${item.id}>`);
            });
          }

          // bibliographyの情報を追加
          if (data.bibliography) {
            data.bibliography.forEach((item: BibItem) => {
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
            data.media.forEach((item: MediaItem) => {
              turtleData += `\n<${IRI}${item.id}> a :Media ;\n`;
              turtleData += `  schema:uri "${item.source}" ;\n`;
              turtleData += `  schema:description "${item.caption}" ;\n`;
              turtleData += `  schema:additionalType :${item.type} .\n`;
            });
          }

          // bibiographyの情報を追加
          if (data.bibliography) {
            data.bibliography.forEach((item: BibItem) => {
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

      console.log(`\n=== RDF Download Summary ===`);
      console.log(`Total annotations matched: ${matchedCount}`);
      console.log(`RDF data length: ${turtleData.length} characters`);
      console.log(`Preview of RDF data:\n${turtleData.substring(0, 500)}...`);

      if (matchedCount === 0) {
        console.warn('⚠ No annotations matched! Check if:');
        console.warn('1. manifestUrl matches target_manifest in Firebase');
        console.warn('2. Annotations exist in the "test" collection');
        console.warn('3. IRI is set correctly');
      }

      const blob = new Blob([turtleData], { type: 'text/turtle' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph-data.ttl';
      a.click();
      URL.revokeObjectURL(url);
    });

    handleRDFCloseDialog();
  };

  const downloadIIIFManifest = (manifestUrl: string) => {
    console.log('=== IIIF Manifest Download ===');
    console.log('Original manifest URL:', manifestUrl);

    const slug = createSlug(manifestUrl);
    console.log('Encoded slug:', slug);

    const url = `/api/3/${slug}/manifest`;
    console.log('API endpoint:', url);
    console.log('Opening in new tab...');

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
    console.log('media uploaded');
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
    console.log('bib uploaded');
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
    console.log(lat, lng);
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
        <header className="bg-white border-b border-[var(--border)] py-4 px-6 flex justify-between items-center shadow-sm">
          <h1 className="m-0 text-xl font-bold text-[var(--text-primary)]">IIIF 3D Viewer</h1>
          <nav className="flex items-center gap-6">
            <a href="#home" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
              Home
            </a>
            <a href="#about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
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
            />
            <div className="absolute top-4 left-4 z-[100] bg-white/95 p-4 rounded-lg shadow-lg backdrop-blur-sm border border-[var(--border)]">
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Display annotations</p>
                <SwitchButton checked={annotationsVisible} onChange={handleSwitchChange} />
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Polygon annotation mode</p>
                <SwitchButton checked={annotationMode} onChange={handleAnnotationModeChange} />
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 bg-[var(--secondary-bg)]">
            <div className="flex-[0.2] flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-5">
              <input
                type="text"
                value={manifestUrl}
                onChange={handleManifestUrlChange}
                placeholder="Enter IIIF Manifest URL"
                className="input-field flex-1 mb-0"
              />
              <button onClick={() => handleRDFOpenDialog()} className="btn-primary whitespace-nowrap">
                Export RDF
              </button>
              <button onClick={() => downloadIIIFManifest(manifestUrl)} className="btn-primary whitespace-nowrap">
                View Manifest
              </button>
            </div>
            <div className="flex-[0.8] flex gap-5 border-b border-[var(--border)] pb-6 mb-6">
              <div className="flex-1 card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold m-0 text-[var(--text-primary)]">
                    {infoPanelContent?.title || 'Annotation Details'}
                  </h3>
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
                <TEIViewer />
              </div>
            </div>
            <div className="flex-[1.2] pt-4">
              <div className="flex justify-between gap-5">
                <div className="flex-1 card h-80 overflow-hidden">
                  <div className="border-b border-[var(--border)] flex items-center justify-between mb-4 pb-3">
                    <h3 className="text-base font-semibold m-0 text-[var(--text-primary)]">Resources</h3>
                    <div className="flex gap-1.5">
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
                  </div>
                  <div className="overflow-y-auto max-h-52 grid grid-cols-2 gap-2">
                    {infoPanelContent?.media && infoPanelContent.media.length > 0
                      ? infoPanelContent.media.map((mediaItem, index) => (
                          <div key={index} className="cursor-pointer hover:opacity-80 transition-opacity rounded overflow-hidden">
                            {mediaItem.type === 'img' && (
                              <img
                                src={mediaItem.source}
                                alt={mediaItem.caption}
                                className="w-full h-full object-cover"
                                onClick={() =>
                                  setSelectedImage({
                                    source: mediaItem.source,
                                    caption: mediaItem.caption,
                                    index: index,
                                  })
                                }
                              />
                            )}

                            {mediaItem.type === 'video' && (
                              <img
                                src={`https://img.youtube.com/vi/${
                                  mediaItem.source.split('/')[3].split('?')[0]
                                }/default.jpg`}
                                alt={mediaItem.caption}
                                className="w-full h-full object-cover"
                                onClick={() =>
                                  setSelectedVideo({
                                    source: `https://www.youtube.com/embed/${
                                      mediaItem.source.split('/')[3]
                                    }`,
                                    caption: mediaItem.caption,
                                    index: index,
                                  })
                                }
                              />
                            )}
                          </div>
                        ))
                      : null}
                  </div>
                </div>
                <div className="flex-1 card h-80 overflow-hidden">
                  <div className="border-b border-[var(--border)] flex items-center justify-between mb-4 pb-3">
                    <h3 className="text-base font-semibold m-0 text-[var(--text-primary)]">Linked Data</h3>
                    <div className="flex gap-1.5">
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
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {infoPanelContent?.wikidata && infoPanelContent.wikidata.length > 0
                      ? infoPanelContent.wikidata.map((wikiItem, index) => (
                          <div key={index} className="mb-3 flex items-center gap-2 flex-wrap">
                            {wikiItem.type === 'wikidata' && (
                              <span className="btn-primary btn-sm inline-flex items-center">
                                {wikiItem.label}
                              </span>
                            )}
                            {wikiItem.type === 'geonames' && (
                              <span className="text-sm font-medium">{wikiItem.label}</span>
                            )}

                            <a
                              href={wikiItem.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                            >
                              <PiShareNetwork className="w-5 h-5" />
                            </a>
                            {wikiItem.wikipedia && (
                              <a
                                href={wikiItem.wikipedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                              >
                                <IoDocumentTextOutline className="w-5 h-5" />
                              </a>
                            )}
                            {wikiItem.type === 'geonames' && wikiItem.lat && (
                              <button
                                onClick={() => {
                                  if (wikiItem.lat !== undefined && wikiItem.lng !== undefined) {
                                    ShowMap(wikiItem.lat, wikiItem.lng);
                                  }
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors inline-flex items-center"
                              >
                                <LiaMapMarkedSolid className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                infoPanelContent?.id && deleteWiki(infoPanelContent.id, index)
                              }
                              className="btn-danger btn-icon"
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        ))
                      : null}
                  </div>
                </div>
                <div className="flex-1 card h-80 overflow-hidden">
                  <div className="border-b border-[var(--border)] flex items-center justify-between mb-4 pb-3">
                    <h3 className="text-base font-semibold m-0 text-[var(--text-primary)]">References</h3>
                    <div className="flex gap-1.5">
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
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {infoPanelContent?.bibliography && infoPanelContent.bibliography.length > 0
                      ? infoPanelContent.bibliography.map((bibItem, index) => (
                          <div key={index} className="mb-4 pb-3 border-b border-gray-200 last:border-0">
                            <div className="flex items-start gap-2">
                              <FaBook className="text-gray-600 mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-800 mb-2">
                                  {bibItem.author} ({bibItem.year}): {bibItem.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  {bibItem.page && (
                                    <a
                                      href={bibItem.page}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                                    >
                                      <FaLink className="w-4 h-4" />
                                    </a>
                                  )}
                                  {bibItem.pdf && (
                                    <a
                                      href={bibItem.pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-red-600 hover:text-red-800 transition-colors inline-flex items-center"
                                    >
                                      <FaRegFilePdf className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() =>
                                      infoPanelContent?.id && deleteBib(infoPanelContent.id, index)
                                    }
                                    className="btn-danger btn-icon"
                                  >
                                    <FaTrashAlt />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border)]">
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
        <footer className="bg-white border-t border-[var(--border)] py-3 px-6 text-center">
          <p className="text-sm text-[var(--text-secondary)] m-0">
            &copy; 2025 IIIF 3D Viewer. All rights reserved.
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
                <input
                  name="source"
                  value={source}
                  required
                  onChange={(e) => setSource(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="font-bold text-lg">
                Type:
                <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input-field">
                  <option value="img">Image</option>
                  <option value="video">Youtube</option>
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
                infoPanelContent?.id && deleteMedia(infoPanelContent.id, selectedImage.index);
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
                infoPanelContent?.id && deleteMedia(infoPanelContent.id, selectedVideo.index);
              }}
              className="btn-danger fixed top-4 right-4"
            >
              <FaTrashAlt />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
