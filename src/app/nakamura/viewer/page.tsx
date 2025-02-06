'use client';

import type { NextPage } from 'next';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import Scene from '@/app/components/viewer/three/Scene';

const Home: NextPage = () => {
  const glbUrl = '/models/253efdf34478459954ae04f6b3befa5f3822ed59.glb';

  return (
    <div style={{ width: '80vw', height: '80vh', backgroundColor: 'lightgray' }}>
      <Canvas
        camera={{
          position: [0, 2, 5],
          fov: 50,
        }}
      >
        <Suspense fallback={null}>
          <Scene glbUrl={glbUrl} />
          <OrbitControls
            enableDamping={true} // 慣性効果の追加
            dampingFactor={0.05} // 慣性の強さ
            rotateSpeed={0.5} // 回転速度
            zoomSpeed={0.8} // ズーム速度
            panSpeed={0.5} // パン速度
            minPolarAngle={0} // 垂直回転の最小角度
            maxPolarAngle={Math.PI} // 垂直回転の最大角度
          />
          <gridHelper />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Home;
