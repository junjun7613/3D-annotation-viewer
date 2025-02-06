'use client';

import { Html } from '@react-three/drei';
import { useState } from 'react';
import type { Vector3 } from 'three';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import AnnotationMarker from '@/app/components/viewer/three/AnnotationMarker';
type Annotation = {
  id: string;
  position: Vector3;
  content: string;
};

export default function Annotations({ annotations }: { annotations: Annotation[] }) {
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);

  const { camera, controls } = useThree();

  const focusOnAnnotation = (position: Vector3) => {
    // カメラの現在位置を保存
    // const startPosition = camera.position.clone();
    const startTarget = new THREE.Vector3(0, 0, 0);
    if (controls) {
      console.log(controls);
      // @ts-expect-error - controls.target exists but TypeScript doesn't know about it
      startTarget.copy(controls.target);
    }

    // アノテーションの位置から少し離れた視点を計算
    const endPosition = position.clone().add(new THREE.Vector3(2, 1, 2));

    // カメラのアニメーション
    gsap.to(camera.position, {
      x: endPosition.x,
      y: endPosition.y,
      z: endPosition.z,
      duration: 1,
      ease: 'power2.inOut',
    });
  };

  return (
    <>
      {annotations.map((annotation) => (
        <Html
          key={annotation.id}
          position={[annotation.position.x, annotation.position.y, annotation.position.z]}
        >
          <AnnotationMarker
            number={annotation.id}
            content={annotation.content}
            isOpen={openAnnotationId === annotation.id}
            onClick={() => {
              setOpenAnnotationId(openAnnotationId === annotation.id ? null : annotation.id);
              focusOnAnnotation(annotation.position);
            }}
          />
        </Html>
      ))}
    </>
  );
}
