import Header3 from '@/app/components/viewer/header3';
import Footer3 from '@/app/components/viewer/footer3';

export default function CommonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header3 />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col">
          <div className="flex-1">{children}</div>
          <div className="hidden sm:block">
            <Footer3 />
          </div>
        </div>
      </main>
      <div className="sm:hidden">
        <Footer3 />
      </div>
    </div>
  );
}
