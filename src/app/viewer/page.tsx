'use client';

import type { NextPage } from 'next';
import { Suspense } from 'react';

import { annotationsAtom } from '@/app/atoms/infoPanelAtom';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import Info3 from '@/app/components/viewer/layout/panels/info3';
import { fetchManifest } from '@/lib/services/utils';
import { annotationService } from '@/lib/services/annotation';
import { manifestAtom } from '@/app/atoms/infoPanelAtom';
import CanvasComponent from '@/app/components/viewer/three/Canvas';

// Info3コンポーネントのラッパー
const InfoWrapper = () => {
  return (
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
  );
};

const Home: NextPage = () => {
  const [, setManifest] = useAtom(manifestAtom);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [viewerHeight, setViewerHeight] = useState('100vh');
  const [, setAnnotations] = useAtom(annotationsAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (!manifestParam) return;
    fetchManifest(manifestParam).then((manifest) => {
      setGlbUrl(manifest.items[0].items[0].items[0].body.id);

      setManifest(manifest);
    });

    annotationService.getAnnotationsByManifestId(manifestParam).then((annotations) => {
      console.log(annotations);
      setAnnotations(annotations);
    });
  }, [setManifest, setAnnotations]);

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: layout === 'horizontal' ? 'row' : 'column',
        width: '100%',
        height: layout === 'horizontal' ? '100vh' : 'auto',
        maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* 3Dビューワー */}
      <div
        style={{
          flex: layout === 'horizontal' ? '0 0 70%' : 'none',
          height: layout === 'horizontal' ? '100%' : viewerHeight,
          position: 'relative',
          backgroundColor: '#f5f5f5',
        }}
      >
        {glbUrl && <CanvasComponent glbUrl={glbUrl} />}
      </div>

      {/* アノテーションリスト */}
      <div
        style={{
          flex: layout === 'horizontal' ? '0 0 30%' : '1 0 auto',
          height: layout === 'horizontal' ? '100vh' : 'auto',
          maxHeight: layout === 'horizontal' ? '100vh' : '40vh',
          backgroundColor: '#ffffff',
          boxShadow:
            layout === 'horizontal' ? '-2px 0 10px rgba(0,0,0,0.1)' : '0 -2px 10px rgba(0,0,0,0.1)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', // iOSのスムーズスクロール
        }}
      >
        <InfoWrapper />
      </div>
    </div>
  );
};

export default Home;
