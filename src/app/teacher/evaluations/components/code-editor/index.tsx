import dynamic from 'next/dynamic';
import React, { useRef } from 'react';
import { useMonacoConfig } from './useMonacoConfig';
import type { editor } from 'monaco-editor';

// Carga diferida del editor Monaco
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export const CodeEditor = ({ value, onChange, language, height = '100%' }: CodeEditorProps) => {
  const { getEditorOptions, currentTheme } = useMonacoConfig();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden px-1 sm:px-2">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(value) => onChange(value || '')}
        options={{
          ...getEditorOptions(window.innerWidth < 640),
          padding: { top: 0, bottom: 0 }, // Solo top y bottom son válidos
          lineNumbers: 'on',
          wordWrap: 'on',
        }}
        theme={currentTheme}
        defaultValue=""
        className="rounded-lg overflow-hidden"
        loading={<div className="flex items-center justify-center h-full w-full bg-black rounded-lg">Cargando editor...</div>}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          editor.onKeyDown((e) => {
            if ((e.ctrlKey || e.metaKey) && (e.keyCode === monaco.KeyCode.KeyC || e.keyCode === monaco.KeyCode.KeyV || e.keyCode === monaco.KeyCode.KeyX)) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          });
        }}
      />
    </div>
  );
};
