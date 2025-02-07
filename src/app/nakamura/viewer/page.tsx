'use client';

import type { NextPage } from 'next';
import { Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import Scene from '@/app/components/viewer/three/editor/Scene';
import { annotationsAtom3 } from '@/app/atoms/infoPanelAtom';
import { useAtom } from 'jotai';
import type { Annotation3 } from '@/types/main';
import { useEffect, useState } from 'react';
import AnnotationList3 from '@/app/components/viewer/annotation/editor/annotationList3';

const Home: NextPage = () => {
  const glbUrl =
    'https://sukilam.aws.ldas.jp/files/original/253efdf34478459954ae04f6b3befa5f3822ed59.glb';

  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [viewerHeight, setViewerHeight] = useState('100vh');

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

  const [, setAnnotations] = useAtom(annotationsAtom3);

  useEffect(() => {
    const rawAnnotations = [
      {
        id: '1',
        position: {
          x: -0.5541943747725537,
          y: 0.7815753833759582,
          z: 0.27131468892661614,
        },
        content: '新しいアノテーション',
        cameraPosition: {
          x: -1.7704434379578085,
          y: 1.8532313548135637,
          z: 0.22529158074723332,
        },
        targetPosition: {
          x: 0,
          y: 0,
          z: 0,
        },
      },
    ];

    const annotations3: Annotation3[] = rawAnnotations.map((annotation) => ({
      id: annotation.id,
      position: new Vector3(annotation.position.x, annotation.position.y, annotation.position.z),
      content: annotation.content,
      cameraPosition: new Vector3(
        annotation.cameraPosition.x,
        annotation.cameraPosition.y,
        annotation.cameraPosition.z
      ),
      targetPosition: new Vector3(
        annotation.targetPosition.x,
        annotation.targetPosition.y,
        annotation.targetPosition.z
      ),
    }));
    setAnnotations(annotations3);
  }, [setAnnotations]);

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
        <Canvas
          camera={{
            position: [0, 2, 5],
            fov: 50,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <Suspense fallback={null}>
            <Scene glbUrl={glbUrl} />
            <OrbitControls
              enableDamping={true}
              dampingFactor={0.05}
              rotateSpeed={0.5}
              zoomSpeed={0.8}
              panSpeed={0.5}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
            />
            <gridHelper />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
          </Suspense>
        </Canvas>
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
        <AnnotationList3 />
      </div>
    </div>
  );
};

export default Home;
