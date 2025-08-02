import dynamic from 'next/dynamic';
import { useMarkdownConfig } from '../hooks/useMarkdownConfig';
import { useRef } from 'react';

// Carga diferida del visor de Markdown
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  const { getMarkdownStyles, colorMode } = useMarkdownConfig();
  const viewerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={viewerRef}
      data-color-mode={colorMode} 
      className="absolute inset-0 rounded-lg overflow-y-auto mx-3 sm:mx-4"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <MDPreview
        source={content}
        style={{
          ...getMarkdownStyles(),
          overflowY: 'auto',
          height: '100%',
          padding: '1rem',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      />
    </div>
  );
};