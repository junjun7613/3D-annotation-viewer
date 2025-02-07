import Popup from '@/app/components/viewer/three/Popup';

export default function AnnotationMarker({
  number,
  content,
  isOpen,
  onClick,
}: {
  number: string;
  content: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      {/* 番号マーカー */}
      <div
        onClick={onClick}
        className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
      >
        <span className="text-white text-sm font-medium">{number}</span>
      </div>

      {/* ポップアップ */}
      {isOpen && <Popup content={content} />}
    </div>
  );
}
