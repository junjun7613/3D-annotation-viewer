// 入力フォームコンポーネント
import { useState } from 'react';

const ManifestInput = ({ onSubmit }: { onSubmit: (url: string) => void }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('マニフェストURLを入力してください');
      return;
    }
    try {
      new URL(url);
      setError('');
      onSubmit(url);
    } catch {
      setError('有効なURLを入力してください');
    }
  };

  return (
    <div className="w-full max-w-md px-4 sm:px-0">
      <div className="mb-6 sm:mb-8 text-center">
        <div className="inline-block p-3 sm:p-4 bg-blue-50 rounded-full mb-3 sm:mb-4">
          <svg
            className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">3Dモデルを表示</h2>
        <p className="text-sm sm:text-base text-gray-600">
          IIIFマニフェストのURLを入力してください
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="manifest-url" className="block text-sm font-medium text-gray-700 mb-1">
            マニフェストURL
          </label>
          <input
            id="manifest-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com/manifest.json"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 text-sm sm:text-base rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          表示する
        </button>
      </form>

      <div className="mt-6 sm:mt-8 text-sm text-gray-500">
        <h3 className="font-medium mb-2">サンプルマニフェスト:</h3>
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => onSubmit('https://sukilam.aws.ldas.jp/iiif/3/11/manifest')}
              className="text-blue-500 hover:text-blue-600 text-sm sm:text-base"
            >
              サンプルマニフェスト1
            </button>
          </li>
          {/*
            <li>
              <button
                onClick={() => onSubmit('https://example.com/manifest2.json')}
                className="text-blue-500 hover:text-blue-600 text-sm sm:text-base"
              >
                サンプルマニフェスト2
              </button>
            </li>
            */}
        </ul>
      </div>
    </div>
  );
};

export default ManifestInput;
