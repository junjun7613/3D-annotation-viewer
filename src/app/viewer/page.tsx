'use client';

import { useEffect, useState } from 'react';
import type { NextPage } from 'next';

import Header from '@/app/components/viewer/header';
import Viewer from '@/app/components/viewer/viewer';
import Footer from '@/app/components/viewer/footer';
import InfoPanel from '@/app/components/viewer/infoPanel';
import Metadata from '@/app/components/viewer/metadata';

const Home: NextPage = () => {
  const [manifestUrl, setManifestUrl] = useState<string>('');

  // URLからマニフェストURLを取得して設定するuseEffect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) {
      setManifestUrl(manifestParam);
    }
  }, []);

  /*
  const handleManifestUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setManifestUrl(event.target.value)
  }
  */

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
        <Header />
        <div style={{ display: 'flex', flex: 1 }}>
          <Viewer manifestUrl={manifestUrl} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                borderBottom: '1px solid #ccc',
              }}
            >
              <Metadata />
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
              }}
            >
              <InfoPanel />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Home;
