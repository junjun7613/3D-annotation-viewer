'use client';

import { Html } from '@react-three/drei';
import { useState } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import AnnotationMarker from '@/app/components/viewer/three/AnnotationMarker';
import { useAtom } from 'jotai';
import { annotationsAtom } from '@/app/atoms/infoPanelAtom';
import { selectedAnnotationIdAtom } from '@/app/atoms/infoPanelAtom';
import { useEffect } from 'react';
import { Vector3 } from 'three';
export default function Annotations() {
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useAtom(selectedAnnotationIdAtom);

  const [annotations] = useAtom(annotationsAtom);

  const { camera } = useThree();

  const focusOnAnnotation = (annotationId: string) => {
    const annotation = annotations.find((a) => a.id === annotationId);
    if (!annotation) return;

    const rawEndPosition = annotation.data.target.selector.camPos;

    const endPosition = new Vector3(rawEndPosition[0], rawEndPosition[1], rawEndPosition[2]);

    gsap.to(camera.position, {
      x: endPosition.x,
      y: endPosition.y,
      z: endPosition.z,
      duration: 1,
      ease: 'power2.inOut',
    });
  };

  useEffect(() => {
    if (selectedAnnotationId) {
      setOpenAnnotationId(selectedAnnotationId);
      focusOnAnnotation(selectedAnnotationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnnotationId]);

  return (
    <>
      {annotations.map((annotation, index) => (
      // annotation.data.target.selector.valueが存在する場合のみ表示
      annotation.data.target.selector.value && (
        <Html
          key={annotation.id}
          position={[
            annotation.data.target.selector.value[0],
            annotation.data.target.selector.value[1],
            annotation.data.target.selector.value[2],
          ]}
        >
          <AnnotationMarker
            number={(index + 1).toString()}
            content={/*annotation.content*/ annotation.data.body.label}
            isOpen={openAnnotationId === annotation.id}
            onClick={() => {
              setSelectedAnnotationId(annotation.id);
            }}
          />
        </Html>
      )
      ))}
    </>
  );
}
