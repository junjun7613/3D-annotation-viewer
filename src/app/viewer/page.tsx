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

  return (
    <div className="flex flex-col h-screen w-full">
      <Header />

      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
          <Viewer manifestUrl={manifestUrl} />
        </div>
        <div className="w-full lg:w-1/3 h-[50vh] lg:h-full flex flex-col">
          <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
            <Metadata manifestUrl={manifestUrl} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <InfoPanel />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
