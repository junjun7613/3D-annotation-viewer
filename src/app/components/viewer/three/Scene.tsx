'use client';

import { useLoader } from '@react-three/fiber';

// @ts-expect-error todo
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-expect-error todo
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function Scene({ glbUrl }: { glbUrl: string }) {
  const gltf: GLTF = useLoader(GLTFLoader, glbUrl);
  return <primitive object={gltf.scene} />;
}
