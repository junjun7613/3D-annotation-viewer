'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
//import { useAuth } from "@/context/auth"; // AuthProviderとuseAuthをインポート
import type { NextPage } from 'next';
//import ThreeCanvas from './components/ThreeCanvas'
import SignIn from './components/SignIn';
import ThreeCanvas from './components/ThreeCanvasManifest_copy';
import SwitchButton from './components/SwitchButton';
// import DisplayTEI from './components/DisplayTEI';
import { FaPencilAlt, FaBook, FaRegFilePdf, FaTrashAlt } from 'react-icons/fa';
import { FaLink } from 'react-icons/fa6';
import { PiShareNetwork } from 'react-icons/pi';
// import { FiUpload } from 'react-icons/fi';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { useAtom } from 'jotai';
import { infoPanelAtom } from '@/app/atoms/infoPanelAtom';

import db from '@/lib/firebase/firebase';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

const Home: NextPage = () => {
  const [user] = useAuthState(auth);

  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  // sprite annotationとpolygon annotationの表示を切り替える
  const [annotationMode, setAnnotationMode] = useState(false);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  // infoPanelContentという連想配列を作成

  interface MediaItem {
    type: string;
    source: string;
    caption: string;
  }

  const [infoPanelContent] = useAtom(infoPanelAtom);

  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isBibDialogOpen, setIsBibDialogOpen] = useState(false);
  const [isDescDialogOpen, setIsDescDialogOpen] = useState(false);
  const [isWikidataDialogOpen, setIsWikidataDialogOpen] = useState(false);

  //mediaの情報をstateで管理
  const [source, setSource] = useState('');
  const [type, setType] = useState('img');
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

  const saveMedias = async () => {
    // const mediaData = { source, type, caption };
    const data = {
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

    handleMediaCloseDialog();
  };

  const saveWikidata = async () => {
    // wikidataのsparqlエンドポイントにアクセスして該当するデータのラベルを取得

    const query = `SELECT ?item ?itemLabel ?wikipediaUrl WHERE {
      VALUES ?item {wd:${wikidata.split('/').pop()}}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      ?wikipediaUrl schema:about ?item ;
      schema:inLanguage "en" ;
      schema:isPartOf <https://en.wikipedia.org/> .
    }
    `; //wikidataのsparqlクエリ
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    const result = await fetch(url).then((res) => res.json());
    const label = result['results']['bindings'][0]['itemLabel']['value'];
    const wikipedia = result['results']['bindings'][0]['wikipediaUrl']['value'];

    const data = {
      uri: wikidata,
      label: label,
      wikipedia: wikipedia,
    };

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

    handleWikidataCloseDialog();
  };

  const saveBib = async () => {
    // const bibData = { bibAuthor, bibTitle, bibYear, bibPage, bibPDF };
    const data = {
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

    handleBibCloseDialog();
  };

  const saveDesc = async () => {
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
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
  };

  const deleteWiki = (id: string, index: number) => {
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
      }
    } else {
      alert('You are not the creator of this annotation.');
    }
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
    } else {
      alert('You are not the creator of this annotation.');
    }
  };
  const handleWikidataCloseDialog = () => {
    setIsWikidataDialogOpen(false);
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
          <h1 style={{ margin: 0 }}>3D Annotation Viewer</h1>
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
            <div style={{ flex: 0.2, borderBottom: '2px solid #ccc', paddingBottom: '20px' }}>
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
                  width: '100%',
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
            </div>
            <div
              style={{
                flex: 0.8,
                display: 'flex',
                borderBottom: '2px solid #ccc',
                paddingBottom: '20px',
                marginTop: '20px',
              }}
            >
              {/* 上側のコンテンツをここに追加 */}
              {/*
              <div style={{ flex: 1, borderRight: '2px solid #ccc', paddingRight: '20px' }}>
                <DisplayTEI />
              </div>
              */}
              <div style={{ flex: 1, paddingLeft: '20px' }}>
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
                ></div>
              </div>
            </div>
            <div style={{ flex: 1.2, paddingTop: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {infoPanelContent?.title || ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #ccc',
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '5px',
                    height: '300px',
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
                      Image & Video
                    </h3>
                    <button
                      onClick={handleMediaOpenDialog}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      +
                    </button>
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
                    height: '300px',
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
                      Wiki Items
                    </h3>
                    <button
                      onClick={handleWikidataOpenDialog}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {infoPanelContent?.wikidata && infoPanelContent.wikidata.length > 0
                      ? infoPanelContent.wikidata.map((wikiItem, index) => (
                          <div key={index}>
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
                    height: '300px',
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
                      Bibliography
                    </h3>
                    <button
                      onClick={handleBibOpenDialog}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      +
                    </button>
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
                Download
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
          &copy; 2023 3D Annotation Viewer. All rights reserved.
        </footer>
      </div>

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
                <option value="video">Video</option>
                <option value="audio">Audio</option>
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
              Wikidata URI:
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
              Page:
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
