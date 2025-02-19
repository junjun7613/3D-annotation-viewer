'use client';

import { Label } from '@samvera/clover-iiif/primitives';
import { useAtom } from 'jotai';
import { manifestAtom, manifestUrlAtom } from '@/app/atoms/infoPanelAtom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LoginButton from '@/app/components/viewer/login';

const Header3 = () => {
  const [manifest] = useAtom(manifestAtom);
  const [manifestUrl, setManifestUrl] = useAtom(manifestUrlAtom);
  const router = useRouter();
  const { t, i18n } = useTranslation('Header');

  const handleClick = () => {
    setManifestUrl(null);
    router.push('/viewer');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 sm:px-6 justify-between">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <button
          onClick={handleClick}
          className="hover:opacity-80 transition-opacity shrink-0 flex items-center"
        >
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">
            {t('title')}
          </h1>
        </button>
        {manifestUrl && manifest && (
          <span className="text-sm text-gray-500 truncate leading-none flex items-center">
            <Label label={manifest.label} as="span" />
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4 ml-2 shrink-0">
        <button
          onClick={() => changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')}
          className="px-3 sm:px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 cursor-pointer whitespace-nowrap"
        >
          {i18n.language === 'ja' ? t('english') : t('japanese')}
        </button>
        <LoginButton />
        {/*
        <button className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          共有
        </button>
        */}
        {manifestUrl && (
          <Link
            href={manifestUrl}
            target="_blank"
            className="px-3 sm:px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 whitespace-nowrap"
          >
            <span className="hidden sm:inline">{t('download')}</span>
            <span className="sm:hidden">{t('downloadShort')}</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header3;
