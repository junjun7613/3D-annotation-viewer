'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import ThreeCanvas from '@/app/components/ThreeCanvasManifest_copy';
import SwitchButton from '@/app/components/SwitchButton';
import { infoPanelAtom, type InfoPanelContent } from '@/app/atoms/infoPanelAtom';

const Viewer = ({ manifestUrl }: { manifestUrl: string }) => {
  const [, setInfoPanelContent] = useAtom(infoPanelAtom);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);

  const handleSwitchChange = (checked: boolean) => {
    setAnnotationsVisible(checked);
  };

  const handleInfoPanelContentChange = (content: InfoPanelContent) => {
    setInfoPanelContent(content);
  };

  return (
    <div style={{ flex: 1, borderRight: '1px solid #ccc', position: 'relative' }}>
      <ThreeCanvas
        annotationsVisible={annotationsVisible}
        annotationMode={false}
        manifestUrl={manifestUrl}
        onInfoPanelContentChange={handleInfoPanelContentChange}
        editable={false}
      />
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <div style={{ flex: '1 1 45%' }}>
          <p>Display annotations</p>
          <SwitchButton checked={annotationsVisible} onChange={handleSwitchChange} />
        </div>
      </div>
    </div>
  );
};

export default Viewer;
