import Link from 'next/link';

const Footer3 = () => {
  return (
    <footer className="py-4 sm:h-14 bg-gray-50 border-t border-gray-200">
      <div className="px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
        <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
          © {new Date().getFullYear()} 3D Annotation Viewer
        </div>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500 order-1 sm:order-2">
          <Link href="/viewer/help" className="hover:text-gray-700 px-1 py-0.5">
            ヘルプ
          </Link>
          <Link href="/viewer/privacy" className="hover:text-gray-700 px-1 py-0.5">
            プライバシーポリシー
          </Link>
          <Link href="/viewer/terms" className="hover:text-gray-700 px-1 py-0.5">
            利用規約
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer3;
