'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
//import { useAuth } from "@/context/auth"; // AuthProviderとuseAuthをインポート
import type { NextPage } from 'next';
//import ThreeCanvas from './components/ThreeCanvas'
import SignIn from './components/SignIn';
import ThreeCanvas from './components/ThreeCanvasManifest';
import SwitchButton from './components/SwitchButton';
// import CustomEditor from './components/CustomEditor';
//import DisplayTEI from './components/DisplayTEI';
import { FaPencilAlt, FaBook, FaRegFilePdf, FaTrashAlt } from 'react-icons/fa';
import { FaLink } from 'react-icons/fa6';
import { PiShareNetwork } from 'react-icons/pi';
//import { FiUpload } from 'react-icons/fi';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { LiaMapMarkedSolid } from "react-icons/lia";
import { useAtom } from 'jotai';
import { infoPanelAtom } from '@/app/atoms/infoPanelAtom';

import {v4 as uuidv4} from 'uuid';

const Editor = dynamic(() => import('./components/Editor'), { ssr: false });
import { OutputData } from '@editorjs/editorjs'; // OutputDataをインポート

import db from '@/lib/firebase/firebase';
import { deleteDoc, doc, getDoc, getDocs, updateDoc, collection } from 'firebase/firestore';

const Home: NextPage = () => {
  const [user] = useAuthState(auth);

  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  // sprite annotationとpolygon annotationの表示を切り替える
  const [annotationMode, setAnnotationMode] = useState(false);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  // infoPanelContentという連想配列を作成

  const [editorData, setEditorData] = useState<OutputData | undefined>();

  interface MediaItem {
    id: string;
    type: string;
    source: string;
    caption: string;
  }

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

  interface Annotation {
    id: string;
    type: string;
    motivation: string;
    //body: { value: string; label: string; type: string };
    body: { value: Record<string, any>; label: string; type: string };
    target: { source: string; selector: { value: string; type: string } };
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
      setDesc(infoPanelContent.description);
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
    } else {
      setDesc('');
      setEditorData(undefined);
    }
  }, [infoPanelContent]);

  const handleEditorChange = (data: OutputData) => {
    console.log(data);
    setEditorData(data);
    // Editor.jsのデータをdescに変換してセット
    const updatedDesc = data.blocks.map((block) => block.data.text).join('\n');
    console.log(updatedDesc);
    setDesc(updatedDesc);
  };

  console.log(infoPanelContent)

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
    const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
    if (infoPanelContent){
      infoPanelContent.media = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const media = []

    for (const item of rows) {
      const media_id = item.split(',')[0];
      const media_type = item.split(',')[1];
      const media_source = item.split(',')[2];
      const media_caption = item.split(',')[3].replace("\r", "");

      let data = {
        id: '',
        source: '',
        type: '',
        caption: '',
      };

      if (media_id !== ''){
        // idがすでに存在する場合には、既存のidを使う
        //console.log(media_id, media_type, media_source, media_caption);
        data = {
          id: media_id,
          source: media_source,
          type: media_type,
          caption: media_caption,
        }
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
        }
        //console.log(data);
        infoPanelContent?.media.push(data);
        media.push(data);
      };

      // firebaseのannotationsコレクションのidを持つdocのmediaフィールド(Array)のdataをfirebaseから取得
      const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
    const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
    if (infoPanelContent){
      infoPanelContent.wikidata = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const authority = []

    for (const item of rows) {
      const authority_type = item.split(',')[0];
      const authority_uri = item.split(',')[1].replace("\r", "");
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
    const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
    const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
    if (infoPanelContent){
      infoPanelContent.bibliography = [];
    } else {
      alert('Please choose an annotation first.');
    }
    const bibliography = []

    for (const item of rows) {
      const bib_id = item.split(',')[0];
      const bib_title = item.split(',')[1];
      const bib_author = item.split(',')[2];
      const bib_year = item.split(',')[3];
      const bib_uri = item.split(',')[4];
      const bib_pdf = item.split(',')[5].replace("\r", "");

      let data = {
        id: '',
        title: '',
        author: '',
        year: '',
        page: '',
        pdf: '',
      };

      if (bib_id !== ''){
        // idがすでに存在する場合には、既存のidを使う
        //console.log(media_id, media_type, media_source, media_caption);
        data = {
          id: bib_id,
          title: bib_title,
          author: bib_author,
          year: bib_year,
          page: bib_uri,
          pdf: bib_pdf,
        }
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
        }
        //console.log(data);
        infoPanelContent?.bibliography.push(data);
        bibliography.push(data);
      };

      // firebaseのannotationsコレクションのidを持つdocのmediaフィールド(Array)のdataをfirebaseから取得
      const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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

  }

  
  const saveDesc = async () => {
    console.log(desc);
    // descriptionの情報をfirebaseのannotationsコレクションのidを持つdocのdata/body/valueに保存
    const docRef = doc(db, 'annotations', infoPanelContent?.id || '');
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
        deleteDoc(doc(db, 'annotations', id));
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const downloadAnnotation = (id: string) => {
    // idのdocをfirebaseデータベースから取得
    const docRef = doc(db, 'annotations', id);
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
    console.log(id);
    // firebaseのannotationsコレクションのすべてのDocの中から、targetmanifestの値がidと一致するものを取得
    const querySnapshot = getDocs(collection(db, 'annotations'));
    querySnapshot.then((snapshot) => {
      let turtleData = '@prefix : <https://www.example.com/vocabulary/> .\n@prefix schema: <https://schema.org/> .\n@prefix dc: <http://purl.org/dc/elements/1.1/> .'; // ベースURIを定義
      turtleData += '\n';

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.target_manifest === id) {
          console.log(data);
          // 以下でannotationごとにTutleを生成・ダウンロード
          turtleData += `\n<${IRI}${doc.id}> a :Annotation ;\n`;
          const properties = [];

          // labelおよびdescriptionの情報を追加
          properties.push(
            `  rdfs:label "${data.data.body.label}"`,
          );
          properties.push(
            `  schema:description "${data.data.body.value}"`,
          );

          // manifestおよびcanvasの情報を追加
          properties.push(
            `  :targetManifest <${data.target_manifest}>`,
          );
          properties.push(
            `  :targetCanvas <${data.target_canvas}>`,
          );

          // wikidataの情報を追加
          if (data.wikidata) {
            data.wikidata.forEach((item: WikidataItem) => {
              properties.push(
                `  :wikidata <${item.uri}>`,
              );
            });
          }

          // mediaの情報を追加
          if (data.media) {
            data.media.forEach((item: MediaItem) => {
              properties.push(
                `  :media <${IRI}${item.id}>`,
              );
            });
          }

          // bibliographyの情報を追加
          if (data.bibliography) {
            data.bibliography.forEach((item: BibItem) => {
              properties.push(
                `  :bibliography <${IRI}${item.id}>`,
              );
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
    console.log(manifestUrl);
    // manifestUrlを/でsplitして最後の要素を削除
    const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

    const annotations: Annotation[] = [];

    const querySnapshot = getDocs(collection(db, 'annotations'));
    querySnapshot.then((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.target_manifest === manifestUrl) {
          console.log(data);
          const annotation = {
            "id": `${newUrl}/annotation/${doc.id}`,
            "type": "Annotation",
            "motivation": "painting",
            "body": data.data.body,
            "target": data.data.target
          };
          annotations.push(annotation);
        }
      });
    });
    //console.log(manifestUrl);
    // menifestUrlの中身を取得
    const url = manifestUrl;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {

        //console.log(data);
        const newData = {
          "id": `${newUrl}/annotationPage/${uuidv4()}`,
          "type": "AnnotationPage",
          "items": annotations
        }
        data.items[0].items[0].items.push(newData);
        console.log(data)

        // manifestをjson形式でダウンロード
        const element = document.createElement('a');
        const file = new Blob([JSON.stringify(data)], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = 'manifest.json';
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
      
      });
  };

  const deleteMedia = (id: string, index: number) => {
    if (infoPanelContent?.creator == user?.uid) {
      const confirmed = confirm('Are you sure you want to delete this Wiki Item?');
      if (confirmed) {
        //idのdocのBibliographyフィールドのindexの要素を削除
        const docRef = doc(db, 'annotations', id);
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
        const docRef = doc(db, 'annotations', id);
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
        const docRef = doc(db, 'annotations', id);
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
    console.log("media uploaded");
    setIsMediaUploadDialogOpen(true);
  }
  

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
  }
  const handleBibUpload = () => {
    console.log("bib uploaded");
    setIsBibUploadDialogOpen(true);
  }

  const handleDescOpenDialog = () => {
    if (infoPanelContent?.creator == user?.uid) {
      setDesc(infoPanelContent?.description || '');
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
  }
  const ShowMap = (lat: string, lng: string) => {
    console.log(lat, lng);
  }

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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <header
          style={{
            backgroundColor: '#333',
            color: 'white',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0 }}>Semantic 3D Annotation Editor</h1>
          <nav>
            <a href="#home" style={{ color: 'white', marginRight: '20px' }}>
              Home
            </a>
            <a href="#about" style={{ color: 'white', marginRight: '20px' }}>
              About
            </a>
            {/*<a href="#contact" style={{ color: 'white' }}>Contact</a>*/}
            <SignIn />
            {/*{user && <span style={{ color: 'white', marginLeft: '20px' }}>logged in</span>}*/}
          </nav>
        </header>
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ flex: 1, borderRight: '1px solid #ccc', position: 'relative' }}>
            <ThreeCanvas
              annotationsVisible={annotationsVisible}
              annotationMode={annotationMode}
              manifestUrl={manifestUrl}
            />
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 100,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '10px',
                borderRadius: '5px',
              }}
            >
              <div style={{ flex: '1 1 45%' }}>
                <p>Display annotations</p>
                <SwitchButton checked={annotationsVisible} onChange={handleSwitchChange} />
              </div>
              <div style={{ flex: '1 1 45%' }}>
                <p>Polygon annotation mode</p>
                <SwitchButton checked={annotationMode} onChange={handleAnnotationModeChange} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div
              style={{
                flex: 0.2,
                display: 'flex',
                borderBottom: '2px solid #ccc',
                paddingBottom: '10px',
              }}
            >
              {/* user && <input type="text" value={manifestUrl} onChange={handleManifestUrlChange} placeholder="Enter IIIF Manifest URL" style={{ 
                width: '100%',
                padding: '10px',
                border: '2px solid #333',
                borderRadius: '5px',
                marginBottom: '10px',
                fontSize: '16px'
                }} />*/}
              <input
                type="text"
                value={manifestUrl}
                onChange={handleManifestUrlChange}
                placeholder="Enter IIIF Manifest URL"
                style={{
                  width: '70%',
                  height: '50px',
                  padding: '10px',
                  border: '2px solid #333',
                  borderRadius: '5px',
                  marginBottom: '10px',
                  fontSize: '16px',
                }}
              />
              {/*<button onClick={handleButtonClick} style={{
                 marginTop: '10px', 
                 padding: '10px 20px',
                 backgroundColor: '#333',
                 color: 'white',
                 border: 'none',
                 borderRadius: '5px',
                 cursor: 'pointer',
                 fontSize: '16px'
                 }}>Load Manifest</button>
              */}
              <button
                onClick={() => handleRDFOpenDialog()}
                style={{
                  marginLeft: '30px',
                  height: '50px',
                  padding: '10px 20px',
                  backgroundColor: '#006400',
                  color: 'white',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                RDF
              </button>
              <button
                onClick={() => downloadIIIFManifest(manifestUrl)}
                style={{
                  marginLeft: '15px',
                  height: '50px',
                  padding: '10px 20px',
                  backgroundColor: '#006400',
                  color: 'white',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                IIIF
              </button>
            </div>
            <div
              style={{
                flex: 0.8,
                display: 'flex',
                borderBottom: '2px solid #ccc',
                paddingBottom: '20px',
                marginTop: '10px',
              }}
            >
              {/* 上側のコンテンツをここに追加 */}
              {/*
              <div style={{ flex: 1, borderRight: '2px solid #ccc', paddingRight: '20px' }}>
                <DisplayTEI />
              </div>
              */}
              <div
                style={{
                  flex: 0.3,
                  height: '270px',
                  borderRight: '2px solid #ccc',
                  paddingRight: '20px',
                  marginTop: '10px',
                }}
              >
                {infoPanelContent?.title || ''}
              </div>
              <div
                style={{
                  flex: 0.7,
                  height: '270px',
                  paddingLeft: '20px',
                  marginTop: '10px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <button
                    onClick={handleDescOpenDialog}
                    style={{
                      padding: '5px 10px',
                      marginBottom: '10px',
                      backgroundColor: '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    <FaPencilAlt />
                  </button>
                </div>
                <div
                  dangerouslySetInnerHTML={{ __html: infoPanelContent?.description || '' }}
                  // infoPanelContent?.descriptionのマークダウンをHTMLに変換
                ></div>
              </div>
            </div>
            <div style={{ flex: 1.2, paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #ccc',
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '5px',
                    height: '320px',
                  }}
                >
                  <div
                    style={{
                      borderBottom: '2px solid #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
                      Media
                    </h3>
                    <div>
                    <button
                      onClick={handleMediaOpenDialog}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <img
                      src="/images/queue.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    <button
                      onClick={handleMediaUpload}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                        alignItems: 'center', // ボタン内のコンテンツを中央揃え
                      }}
                    >
                    <img
                      src="/images/upload.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: '10px',
                      overflowY: 'auto',
                      maxHeight: '200px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '5px',
                    }}
                  >
                    {infoPanelContent?.media && infoPanelContent.media.length > 0
                      ? infoPanelContent.media.map((mediaItem, index) => (
                          <div key={index}>
                            {mediaItem.type === 'img' && (
                              <img
                                src={mediaItem.source}
                                alt={mediaItem.caption}
                                style={{ width: '100%' }}
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
                                style={{ width: '100%' }}
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
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #ccc',
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '5px',
                    height: '320px',
                  }}
                >
                  <div
                    style={{
                      borderBottom: '2px solid #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
                      Authority
                    </h3>
                    <div>
                    <button
                      onClick={handleWikidataOpenDialog}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <img
                      src="/images/queue.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    <button
                      onClick={handleAuthorityUpload}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                        alignItems: 'center', // ボタン内のコンテンツを中央揃え
                      }}
                    >
                    <img
                      src="/images/upload.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {infoPanelContent?.wikidata && infoPanelContent.wikidata.length > 0
                      ? infoPanelContent.wikidata.map((wikiItem, index) => (
                          <div key={index}>

                            {wikiItem.type === 'wikidata' && (
                            <button
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#333',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginBottom: '5px',
                                marginTop: '10px',
                              }}
                            >
                              <span>{wikiItem.label}</span>
                            </button>
                            )}
                            {wikiItem.type === 'geonames' && (
                              <span>{wikiItem.label}</span>
                            )}

                            {/*<div>*/}
                            <a href={wikiItem.uri} target="_blank" rel="noopener noreferrer">
                              <PiShareNetwork style={{ marginLeft: '5px', display: 'inline' }} />
                            </a>
                            {wikiItem.wikipedia && (
                              <a
                                href={wikiItem.wikipedia}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <IoDocumentTextOutline
                                  style={{ marginLeft: '5px', display: 'inline' }}
                                />
                              </a>
                            )}
                            {wikiItem.type === "geonames" && wikiItem.lat && (
                              <button
                              onClick={() => {
                                if (wikiItem.lat !== undefined && wikiItem.lng !== undefined) {
                                  ShowMap(wikiItem.lat, wikiItem.lng);
                                }
                              }}
                              >
                                <LiaMapMarkedSolid
                                  style={{ marginLeft: '5px', display: 'inline' }}
                                />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                infoPanelContent?.id && deleteWiki(infoPanelContent.id, index)
                              }
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#8b0000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                marginBottom: '5px',
                                marginLeft: '5px',
                              }}
                            >
                              <FaTrashAlt />
                            </button>
                            {/*</div>*/}
                          </div>
                        ))
                      : null}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #ccc',
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '5px',
                    height: '320px',
                  }}
                >
                  <div
                    style={{
                      borderBottom: '2px solid #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
                      Literature
                    </h3>
                    <div>
                    <button
                      onClick={handleBibOpenDialog}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <img
                      src="/images/queue.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    <button
                      onClick={handleBibUpload}
                      style={{
                        padding: '5px 10px',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                        alignItems: 'center', // ボタン内のコンテンツを中央揃え
                      }}
                    >
                    <img
                      src="/images/upload.png"
                      alt="Upload"
                      style={{ width: '16px', height: '16px', verticalAlign: 'middle'}} // アイコンのサイズを調整
                    />
                    </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {infoPanelContent?.bibliography && infoPanelContent.bibliography.length > 0
                      ? infoPanelContent.bibliography.map((bibItem, index) => (
                          <div key={index}>
                            <div>
                              <FaBook style={{ marginRight: '5px', display: 'inline' }} />
                              <span style={{ fontSize: '12px' }}>
                                {bibItem.author} ({bibItem.year}): {bibItem.title}
                              </span>
                              <div>
                                {bibItem.page && (
                                  <a href={bibItem.page} target="_blank" rel="noopener noreferrer">
                                    <FaLink style={{ marginLeft: '5px', display: 'inline' }} />
                                  </a>
                                )}
                                {bibItem.pdf && (
                                  <a href={bibItem.pdf} target="_blank" rel="noopener noreferrer">
                                    <FaRegFilePdf
                                      style={{ marginLeft: '5px', display: 'inline' }}
                                    />
                                  </a>
                                )}
                                <button
                                  onClick={() =>
                                    infoPanelContent?.id && deleteBib(infoPanelContent.id, index)
                                  }
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#8b0000',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    marginBottom: '5px',
                                    marginLeft: '5px',
                                  }}
                                >
                                  <FaTrashAlt />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      : null}
                  </div>
                </div>
              </div>
              <button
                onClick={() => infoPanelContent?.id && deleteAnnotation(infoPanelContent.id)}
                style={{
                  marginTop: '40px',
                  padding: '10px 20px',
                  backgroundColor: '#8b0000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Delete Annotation
              </button>
              <button
                onClick={() => infoPanelContent?.id && downloadAnnotation(infoPanelContent.id)}
                style={{
                  marginTop: '40px',
                  marginLeft: '20px',
                  padding: '10px 20px',
                  backgroundColor: '#006400',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                JSON Download
              </button>
            </div>
          </div>
        </div>
        <footer
          style={{
            backgroundColor: '#333',
            color: 'white',
            padding: '10px 20px',
            textAlign: 'center',
          }}
        >
          &copy; 2025 Semantic 3D Annotatino Editor. All rights reserved.
        </footer>
      </div>

      {isRDFDialogOpen && (
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              IRI:
              <input
                name="IRI"
                value={IRI}
                required
                onChange={(e) => setIRI(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={() => downloadRDF(manifestUrl)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Download
              </button>
              <button
                type="button"
                onClick={handleRDFCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isMediaUploadDialogOpen && (
        //csvファイルのアップロードダイアログ
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Upload CSV File:
              <input
                type="file"
                accept=".csv"
                onChange={uploadMediaCSV}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <p>【注意】既存のデータは上書きされます。</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveMediaUpload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={handleMediaUploadCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isMediaDialogOpen && (
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Source URI:
              <input
                name="source"
                value={source}
                required
                onChange={(e) => setSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Type:
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              >
                <option value="img">Image</option>
                <option value="video">Youtube</option>
              </select>
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Caption:
              <textarea
                name="caption"
                value={caption}
                required
                onChange={(e) => setCaption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveMedias}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleMediaCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isAuthorityUploadDialogOpen && (
        //csvファイルのアップロードダイアログ
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Upload CSV File:
              <input
                type="file"
                accept=".csv"
                onChange={uploadAuthorityCSV}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <p>【注意】既存のデータは上書きされます。</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveAuthorityUpload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={handleAuthorityUploadCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isWikidataDialogOpen && (
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Type:
              <select
                name="type"
                value={wikiType}
                onChange={(e) => setWikiType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              >
                <option value="wikidata">Wikidata</option>
                <option value="geonames">GeoNames</option>
              </select>
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              URI:
              <input
                name="wikidata"
                value={wikidata}
                required
                onChange={(e) => setWikidata(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveWikidata}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleWikidataCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isBibUploadDialogOpen && (
        //csvファイルのアップロードダイアログ
        <div
          style={{
            position: 'fixed',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Upload CSV File:
              <input
                type="file"
                accept=".csv"
                onChange={uploadBibCSV}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <p>【注意】既存のデータは上書きされます。</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveBibUpload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={handleBibUploadCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isBibDialogOpen && (
        <div
          style={{
            width: '500px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Author:
              <input
                name="bibAuthor"
                value={bibAuthor}
                required
                onChange={(e) => setBibAuthor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Title:
              <textarea
                name="bibTitle"
                value={bibTitle}
                required
                onChange={(e) => setBibTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Year:
              <input
                name="bibYear"
                value={bibYear}
                required
                onChange={(e) => setBibYear(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Page URL:
              <input
                name="bibPage"
                value={bibPage}
                required
                onChange={(e) => setBibPage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              PDF:
              <input
                name="bibPDF"
                value={bibPDF}
                required
                onChange={(e) => setBibPDF(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveBib}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleBibCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {isDescDialogOpen && (
        <div
          style={{
            position: 'fixed',
            height: '300px',
            width: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            zIndex: 1000,
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Description:
              <textarea
                name="description"
                value={desc}
                required
                onChange={(e) => setDesc(e.target.value)}
                style={{
                  height: '150px',
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            
            {/*
            <label style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Description:
              <Editor data={editorData} onChange={handleEditorChange} />
            </label>
            */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={saveDesc}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleDescCloseDialog}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.source}
            alt={selectedImage.caption}
            style={{ maxWidth: '90%', maxHeight: '90%' }}
          />
          <br />
          <p style={{ color: 'white', marginTop: '5px', fontSize: '24px' }}>
            {selectedImage.caption}
          </p>
          <button
            onClick={() =>
              infoPanelContent?.id && deleteMedia(infoPanelContent.id, selectedImage.index)
            }
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '5px 10px',
              backgroundColor: '#8b0000',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginBottom: '5px',
              marginTop: '10px',
              marginRight: '10px',
            }}
          >
            <FaTrashAlt />
          </button>
        </div>
      )}

      {selectedVideo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <iframe
            style={{ width: '100%', height: '70%' }}
            src={selectedVideo.source}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          />
          <br />
          <p style={{ color: 'white', marginTop: '5px', fontSize: '24px' }}>
            {selectedVideo.caption}
          </p>
          <button
            onClick={() =>
              infoPanelContent?.id && deleteMedia(infoPanelContent.id, selectedVideo.index)
            }
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '5px 10px',
              backgroundColor: '#8b0000',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginBottom: '5px',
              marginTop: '10px',
              marginRight: '10px',
            }}
          >
            <FaTrashAlt />
          </button>
        </div>
      )}
    </>
  );
};

export default Home;
