'use client';

import { useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { NextPage } from 'next';
import SignIn from './components/SignIn';
import ThreeCanvas from './components/ThreeCanvasManifest';
import SwitchButton from './components/SwitchButton';
import DisplayTEI from './components/DisplayTEI';
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
  const [metaTab, setMetaTab] = useState<'object' | 'annotation'>('annotation');
  const [infoTab, setInfoTab] = useState<'resources' | 'linkedData' | 'references' | 'location'>('resources');

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
  // locationの情報をstateで管理
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');

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
      } catch (error) {
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
    };
    if (wikiType === 'wikidata') {
      // wikidataのsparqlエンドポイントにアクセスして該当するデータのラベルを取得

      const query = `SELECT ?item ?itemLabel ?wikipediaUrl ?lat ?lng WHERE {
        VALUES ?item {wd:${wikidata.split('/').pop()}}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        OPTIONAL{
        ?wikipediaUrl schema:about ?item ;
        schema:inLanguage "en" ;
        schema:isPartOf <https://en.wikipedia.org/> .
    }
        OPTIONAL {
          ?item wdt:P625 ?coord .
          BIND(geof:latitude(?coord) AS ?lat)
          BIND(geof:longitude(?coord) AS ?lng)
        }
      }
      `; //wikidataのsparqlクエリ
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
        query
      )}&format=json`;
      const result = await fetch(url).then((res) => res.json());

      const label = result['results']['bindings'][0]['itemLabel']['value'];
      //もしbidingsの中にwikipediaUrlがあれば、その値を取得
      let wikipedia = '';
      if (result['results']['bindings'][0]['wikipediaUrl']) {
        wikipedia = result['results']['bindings'][0]['wikipediaUrl']['value'];
      }
      // 緯度経度が取得できる場合は取得
      let lat = '';
      let lng = '';
      if (result['results']['bindings'][0]['lat']) {
        lat = result['results']['bindings'][0]['lat']['value'];
      }
      if (result['results']['bindings'][0]['lng']) {
        lng = result['results']['bindings'][0]['lng']['value'];
      }

      data = {
        type: wikiType,
        uri: wikidata,
        label: label,
        //もしwikipediaがあれば、dataに追加
        wikipedia: wikipedia,
        lat: lat,
        lng: lng,
      };
    } else if (wikiType === 'geonames') {
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
      };

      if (authority_type === 'wikidata') {
        // wikidataのsparqlエンドポイントにアクセスして該当するデータのラベルを取得

        const query = `SELECT ?item ?itemLabel ?wikipediaUrl ?lat ?lng WHERE {
          VALUES ?item {wd:${authority_uri.split('/').pop()}}
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          OPTIONAL {
            ?wikipediaUrl schema:about ?item ;
            schema:inLanguage "en" ;
            schema:isPartOf <https://en.wikipedia.org/> .
          }
          OPTIONAL {
            ?item wdt:P625 ?coord .
            BIND(geof:latitude(?coord) AS ?lat)
            BIND(geof:longitude(?coord) AS ?lng)
          }
        }
        `; //wikidataのsparqlクエリ
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
          query
        )}&format=json`;
        const result = await fetch(url).then((res) => res.json());
        const label = result['results']['bindings'][0]['itemLabel']['value'];
        let wikipedia = '';
        if (result['results']['bindings'][0]['wikipediaUrl']) {
          wikipedia = result['results']['bindings'][0]['wikipediaUrl']['value'];
        }
        // 緯度経度が取得できる場合は取得
        let lat = '';
        let lng = '';
        if (result['results']['bindings'][0]['lat']) {
          lat = result['results']['bindings'][0]['lat']['value'];
        }
        if (result['results']['bindings'][0]['lng']) {
          lng = result['results']['bindings'][0]['lng']['value'];
        }
        data = {
          type: authority_type,
          uri: authority_uri,
          label: label,
          wikipedia: wikipedia,
          lat: lat,
          lng: lng,
        };
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
    // firebaseのannotationsコレクションのすべてのDocの中から、targetmanifestの値がidと一致するものを取得
    //const querySnapshot = getDocs(collection(db, 'annotations'));
    const querySnapshot = getDocs(collection(db, 'test'));
    querySnapshot.then((snapshot) => {
      let turtleData =
        '@prefix : <https://www.example.com/vocabulary/> .\n@prefix schema: <https://schema.org/> .\n@prefix dc: <http://purl.org/dc/elements/1.1/> .'; // ベースURIを定義
      turtleData += '\n';

      snapshot.forEach((doc) => {
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
                <img src="/images/rdf.png" alt="RDF" className="w-8 h-8" />
              </button>
              <button
                onClick={() => downloadIIIFManifest(manifestUrl)}
                className="ml-4 p-0 bg-transparent border-0 cursor-pointer hover:opacity-70 transition-opacity"
                title="View IIIF Manifest"
              >
                <img src="/images/iiif.png" alt="IIIF" className="w-10 h-10" />
              </button>
            </div>
            <div className="flex gap-4 border-b border-[var(--border)] pb-4 mb-4 flex-shrink-0" style={{ minHeight: '320px', maxHeight: '320px' }}>
              <div className="flex-1 card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg m-0 text-[var(--text-primary)]">
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
                  <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
                    <p className="text-sm">Object metadata coming soon...</p>
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
                    <div className="overflow-y-auto grid grid-cols-5 gap-2" style={{ height: '220px' }}>
                    {infoPanelContent?.media && infoPanelContent.media.length > 0
                      ? infoPanelContent.media.map((mediaItem, index) => (
                          <div key={index} className="cursor-pointer hover:opacity-80 transition-opacity rounded overflow-hidden aspect-square">
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
                          <div key={index} className="bg-white border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow" style={{ width: 'calc(50% - 6px)' }}>
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
                                    {parseFloat(wikiItem.lat).toFixed(2)}°N, {parseFloat(wikiItem.lng).toFixed(2)}°E
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
                          <div key={index} className="bg-white border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow">
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
                    <div className="flex flex-col gap-4 p-4 bg-white border border-[var(--border)] rounded-lg">
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
    </>
  );
};

export default Home;
