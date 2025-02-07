'use client';

import type { NextPage } from 'next';
import { Suspense } from 'react';

import { annotationsAtom, manifestUrlAtom } from '@/app/atoms/infoPanelAtom';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import Info3 from '@/app/components/viewer/layout/panels/info3';
import { fetchManifest } from '@/lib/services/utils';
import { annotationService } from '@/lib/services/annotation';
import { manifestAtom } from '@/app/atoms/infoPanelAtom';
import CanvasComponent from '@/app/components/viewer/three/Canvas';
import ManifestInput from '@/app/components/viewer/input';
import Header3 from '@/app/components/viewer/header3';
import Footer3 from '@/app/components/viewer/footer3';

const Home: NextPage = () => {
  const [manifestUrl, setManifestUrl] = useAtom(manifestUrlAtom);
  const [, setManifest] = useAtom(manifestAtom);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [, setViewerHeight] = useState('100vh');
  const [, setAnnotations] = useAtom(annotationsAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (!manifestParam) return;
    setManifestUrl(manifestParam);
  }, []);

  useEffect(() => {
    if (!manifestUrl) return;
    fetchManifest(manifestUrl).then((manifest) => {
      setGlbUrl(manifest.items[0].items[0].items[0].body.id);

      setManifest(manifest);
    });

    annotationService.getAnnotationsByManifestId(manifestUrl).then((annotations) => {
      setAnnotations(annotations);
    });
  }, [manifestUrl]);

  // ウィンドウサイズとデバイスに応じてレイアウトを変更
  useEffect(() => {
    const handleResize = () => {
      // レイアウトの設定
      setLayout(window.innerWidth < 768 ? 'vertical' : 'horizontal');

      // モバイルデバイスでのビューポートの高さ調整
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      // ビューワーの高さ調整
      if (window.innerWidth < 768) {
        setViewerHeight(`${window.innerHeight * 0.6}px`);
      } else {
        setViewerHeight('100vh');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleManifestSubmit = async (manifestUrl: string) => {
    setManifestUrl(manifestUrl);
  };

  return (
    <>
      <div className="flex flex-col h-screen">
        <Header3 />
        <main className="flex-1 flex overflow-hidden">
          {manifestUrl ? (
            <div className="flex flex-col sm:flex-row w-full">
              <div className="h-[50vh] sm:h-full sm:w-[70%] relative bg-gray-100">
                {glbUrl && <CanvasComponent glbUrl={glbUrl} />}
              </div>
              <div className="flex-1 sm:w-[30%] bg-white shadow-lg overflow-y-auto border-t sm:border-t-0 sm:border-l border-gray-200">
                <Suspense
                  fallback={
                    <div className="p-6 animate-pulse">
                      <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-20 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  }
                >
                  <Info3 />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ManifestInput onSubmit={handleManifestSubmit} />
            </div>
          )}
        </main>
        {!manifestUrl && <Footer3 />}
      </div>
    </>
  );
};

export default Home;
