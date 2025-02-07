'use client';

import { Html } from '@react-three/drei';
import { useState } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import AnnotationMarker from '@/app/components/viewer/three/AnnotationMarker';
import AreaMarker from '@/app/components/viewer/three/AreaMarker';
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
      {annotations.map((annotation, index) => {
        const selector = annotation.data?.target?.selector;
        const value = selector?.value;
        const type = selector?.type;

        return type === '3DSelector' ? (
          <Html key={annotation.id} position={[value[0], value[1], value[2]]}>
            <AnnotationMarker
              number={(index + 1).toString()}
              content={annotation.data.body.label}
              isOpen={openAnnotationId === annotation.id}
              onClick={() => {
                setSelectedAnnotationId(annotation.id);
              }}
            />
          </Html>
        ) : (
          <AreaMarker
            key={annotation.id}
            number={(index + 1).toString()}
            annotation={annotation}
            isOpen={openAnnotationId === annotation.id}
            onClick={() => {
              setSelectedAnnotationId(annotation.id);
            }}
          />
        );
        // }
        return null;
      })}
    </>
  );
}
