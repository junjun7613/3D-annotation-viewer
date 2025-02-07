'use client';

import { Clone, useGLTF, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import Annotations from '@/app/components/viewer/three/Annotations';
import { useRef } from 'react';

export default function Scene({ glbUrl }: { glbUrl: string }) {
  const controlsRef = useRef<OrbitControlsType>(null);

  const model = useGLTF(glbUrl);
  return (
    <>
      <OrbitControls ref={controlsRef} />
      <Clone object={model.scene} />
      <Annotations />
    </>
  );
}
