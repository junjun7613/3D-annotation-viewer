'use client';

import { useEffect } from 'react';
import type { NextPage } from 'next';
import Header from '@/app/components/viewer/header';
import Viewer from '@/app/components/viewer/layout/panels/canvas';
import Footer from '@/app/components/viewer/footer';
import InfoPanel from '@/app/components/viewer/layout/panels/info';
import AnnotationPanel from '@/app/components/viewer/layout/panels/annotation';
import { annotationService } from '@/lib/services/annotation';

import { useAtom } from 'jotai';
import { manifestAtom, annotationsAtom } from '@/app/atoms/infoPanelAtom';
import { fetchManifest } from '@/lib/services/utils';

const Home: NextPage = () => {
  const [manifest, setManifest] = useAtom(manifestAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');

    if (!manifestParam) {
      return;
    }

    fetchManifest(manifestParam).then((manifest) => {
      setManifest(manifest);
    });

    annotationService.getAnnotationsByManifestId(manifestParam).then((annotations) => {
      setAnnotations(annotations);
    });
  }, [setAnnotations, setManifest]); // setAnnotations, setManifest

  return (
    <div className="flex flex-col h-screen w-full">
      <Header />

      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {manifest && (
          <>
            <div className="w-full lg:w-2/3 h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
              <Viewer manifestUrl={manifest.id} />
            </div>
            <div className="w-full lg:w-1/3 h-[50vh] lg:h-full flex flex-col">
              <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
                <InfoPanel />
              </div>
              <div className="flex-1 overflow-y-auto">
                <AnnotationPanel />
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;
