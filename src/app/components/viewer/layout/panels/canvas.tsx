'use client';

import { useState } from 'react';
import ThreeCanvas from '@/app/components/ThreeCanvasManifest';
import SwitchButton from '@/app/components/SwitchButton';

const Viewer = ({ manifestUrl }: { manifestUrl: string }) => {
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [annotationMode] = useState(false);

  const handleSwitchChange = (checked: boolean) => {
    setAnnotationsVisible(checked);
  };

  return (
    <div className="w-full h-full">
      <ThreeCanvas
        annotationsVisible={annotationsVisible}
        annotationMode={annotationMode}
        manifestUrl={manifestUrl}
        editable={false}
      />
      <div className="absolute top-4 left-4 z-50 bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Display annotations</p>
          <SwitchButton checked={annotationsVisible} onChange={handleSwitchChange} />
        </div>
      </div>
    </div>
  );
};

export default Viewer;
