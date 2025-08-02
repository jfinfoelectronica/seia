import dynamic from 'next/dynamic';
// El hook useMarkdownConfig debe ser adaptado o eliminado si no existe en el contexto del profesor.
// Si no existe, puedes usar estilos básicos o crear hooks equivalentes en la carpeta del profesor.
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
  // Puedes personalizar estilos aquí si no tienes useMarkdownConfig
  const viewerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={viewerRef}
      className="absolute inset-0 rounded-lg overflow-y-auto mx-3 sm:mx-4"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <MDPreview
        source={content}
        style={{
          overflowY: 'auto',
          height: '100%',
          padding: '1rem'          
        }}
        disableCopy={true}
      />
      {/* Capa transparente para prevenir interacciones */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};
