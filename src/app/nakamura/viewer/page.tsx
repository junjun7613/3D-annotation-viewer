'use client';

import type { NextPage } from 'next';
import { Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import Scene from '@/app/components/viewer/three/Scene';
import { annotationsAtom3 } from '@/app/atoms/infoPanelAtom';
import { useAtom } from 'jotai';
import type { Annotation3 } from '@/types/main';
import { useEffect } from 'react';
import AnnotationList3 from '@/app/components/viewer/annotation/annotationList3';
const Home: NextPage = () => {
  const glbUrl =
    'https://sukilam.aws.ldas.jp/files/original/253efdf34478459954ae04f6b3befa5f3822ed59.glb';

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
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* 3Dビューワー */}
      <div
        style={{
          flex: '0 0 70%', // 幅70%で固定
          height: '100%',
          backgroundColor: '#f5f5f5',
          position: 'relative',
        }}
      >
        <Canvas
          camera={{
            position: [0, 2, 5],
            fov: 50,
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

      {/* サイドパネル */}
      <div
        style={{
          flex: '0 0 30%', // 幅30%で固定
          height: '100%',
          backgroundColor: '#ffffff',
          padding: '20px',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
          overflowY: 'auto', // コンテンツが多い場合にスクロール可能
        }}
      >
        <AnnotationList3 />
      </div>
    </div>
  );
};

export default Home;
