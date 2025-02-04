'use client';

import type { Manifest } from '@iiif/presentation-3';
import React, { useEffect, useState } from 'react';
import AnnotationList from '@/app/components/viewer/annotation/list';
import MetadataContent from '@/app/components/viewer/metadata/metadata';

const Tabs = {
  METADATA: 'metadata',
  ANNOTATIONS: 'annotations',
} as const;

type TabType = (typeof Tabs)[keyof typeof Tabs];

const ManifestMetadata = ({ manifestUrl }: { manifestUrl: string }) => {
  const [activeTab, setActiveTab] = useState<TabType>(Tabs.METADATA);
  const [manifest, setManifest] = useState<Manifest>();

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error('Failed to fetch manifest');
        const json = await response.json();
        setManifest(json);
      } catch (error) {
        console.error('Error fetching manifest:', error);
      }
    };

    if (manifestUrl) {
      fetchManifest();
    }
  }, [manifestUrl]);

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-4">
          <TabButton tab={Tabs.METADATA} label="メタデータ" />
          <TabButton tab={Tabs.ANNOTATIONS} label="アノテーション" />
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === Tabs.METADATA ? (
          manifest && <MetadataContent manifest={manifest} />
        ) : (
          <div className="p-3 sm:p-5">
            <AnnotationList />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManifestMetadata;
