'use client';

import { Clone, useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import Annotations from '@/app/components/viewer/three/Annotations';
import type { Vector3 as ThreeVector3 } from 'three';
import { Vector3 } from 'three';
import { useState } from 'react';
// アノテーションの型定義
type Annotation = {
  id: string;
  position: ThreeVector3;
  content: string;
};

export default function Scene({ glbUrl }: { glbUrl: string }) {
  const sampleAnnotations: Annotation[] = [
    { id: '1', position: new Vector3(0, 0, 0), content: '新しいアノテーション' },
  ];
  const [annotations, setAnnotations] = useState<Annotation[]>(sampleAnnotations);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // クリック位置のワールド座標を取得
    if (event.point) {
      // クリック位置のワールド座標を取得
      const clickedPosition = new Vector3(event.point.x, event.point.y, event.point.z);
      setAnnotations([
        ...annotations,
        {
          id: (annotations.length + 1).toString(),
          position: clickedPosition,
          content: '新しいアノテーション',
        },
      ]);
    }
  };

  const model = useGLTF(glbUrl);
  return (
    <>
      <Clone object={model.scene} onDoubleClick={handleClick} />
      <Annotations annotations={annotations} />
    </>
  );
}
