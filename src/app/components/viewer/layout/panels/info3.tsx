'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnnotationList3 from '@/app/components/viewer/annotation/annotationList3';
import Metadata3 from '@/app/components/viewer/metadata/metadata3';

type TabType = 'metadata' | 'annotations';

const Info3 = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'annotations'
  );

  const handleTabChange = (tab: TabType) => {
    // 現在のURLパラメータを取得
    const params = new URLSearchParams(searchParams.toString());
    // タブパラメータを更新
    params.set('tab', tab);
    // URLを更新（履歴に追加）
    router.push(`?${params.toString()}`);
    setActiveTab(tab);
  };

  // URLパラメータが変更されたときにタブを更新
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && (tabParam === 'metadata' || tabParam === 'annotations')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="h-full flex flex-col">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('metadata')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === 'metadata'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          メタデータ
        </button>
        <button
          onClick={() => handleTabChange('annotations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === 'annotations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          アノテーション
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'metadata' ? <Metadata3 /> : <AnnotationList3 />}
      </div>
    </div>
  );
};

export default Info3;
