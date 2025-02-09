'use client';

import { Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <JotaiProvider>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </JotaiProvider>
  );
};

export default Provider;
