'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MetadataContent from '@/app/components/viewer/metadata/metadata';
import AnnotationList from '@/app/components/viewer/annotation/annotationList';

const Tabs = {
  METADATA: 'metadata',
  ANNOTATIONS: 'annotations',
} as const;

type TabType = (typeof Tabs)[keyof typeof Tabs];

const ManifestMetadata = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // URLから初期タブを取得、なければメタデータをデフォルトに
    return (searchParams.get('tab') as TabType) || Tabs.METADATA;
  });

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
    setActiveTab(tab);
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => handleTabChange(tab)}
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
          <div className="p-3 sm:p-5">
            <MetadataContent />
          </div>
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
