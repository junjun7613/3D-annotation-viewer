import CommonLayout from '@/app/components/viewer/layout/common';

export default function PrivacyPage() {
  return (
    <CommonLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        {/* アイコンと見出し */}
        <div className="mb-8 text-center">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
            <svg
              className="w-16 h-16 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">プライバシーポリシー</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            当サービスのプライバシーポリシーは現在作成中です。
            ユーザーの皆様の個人情報保護に関する方針を明確にお伝えできるよう準備を進めています。
          </p>
        </div>

        {/* 予定セクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-2xl w-full">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">記載予定の内容</h2>
          <ul className="space-y-3">
            {[
              '個人情報の取り扱いについて',
              'データの収集と利用目的',
              'セキュリティ対策',
              'ユーザーの権利と選択',
              '法令遵守とプライバシー保護方針',
              'お問い合わせ方法',
            ].map((item, index) => (
              <li key={index} className="flex items-center text-gray-600">
                <svg
                  className="w-5 h-5 text-blue-500 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 注意書き */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            プライバシーポリシーの詳細は準備が整い次第、こちらに掲載いたします。
            <br />
            ご不明な点がございましたら、管理者までお問い合わせください。
          </p>
        </div>
      </div>
    </CommonLayout>
  );
}
