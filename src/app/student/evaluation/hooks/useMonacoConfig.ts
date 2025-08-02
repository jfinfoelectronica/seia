import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export const useMonacoConfig = () => {
  const { theme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState('vs-dark');

  // Definir temas personalizados
  const defineCustomThemes = (monaco: unknown) => {
    try {
      const monacoEditor = monaco as {
        editor: {
          defineTheme: (name: string, theme: unknown) => void;
        };
      };
      
      // Tema Monokai personalizado
      monacoEditor.editor.defineTheme('monokai', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'f92672' },
          { token: 'string', foreground: 'e6db74' },
          { token: 'number', foreground: 'ae81ff' },
          { token: 'type', foreground: '66d9ef' },
          { token: 'function', foreground: 'a6e22e' },
          { token: 'variable', foreground: 'f8f8f2' },
          { token: 'operator', foreground: 'f92672' },
        ],
        colors: {
          'editor.background': '#272822',
          'editor.foreground': '#f8f8f2',
          'editor.lineHighlightBackground': '#3e3d32',
          'editor.selectionBackground': '#49483e',
          'editorCursor.foreground': '#f8f8f0',
          'editorWhitespace.foreground': '#3b3a32',
          'editorIndentGuide.background': '#3b3a32',
          'editorLineNumber.foreground': '#90908a',
        }
      });

      // Tema claro personalizado
      monacoEditor.editor.defineTheme('light-custom', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0000ff' },
          { token: 'string', foreground: 'a31515' },
          { token: 'number', foreground: '098658' },
          { token: 'type', foreground: '267f99' },
          { token: 'function', foreground: '795e26' },
          { token: 'variable', foreground: '001080' },
          { token: 'operator', foreground: '0000ff' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editor.lineHighlightBackground': '#f0f0f0',
          'editor.selectionBackground': '#add6ff',
          'editorCursor.foreground': '#000000',
          'editorWhitespace.foreground': '#bfbfbf',
          'editorIndentGuide.background': '#d3d3d3',
          'editorLineNumber.foreground': '#237893',
        }
      });
    } catch (error) {
      console.error('[useMonacoConfig] Error al definir temas personalizados:', error);
    }
  };

  // Aplicar tema según el modo oscuro/claro
  useEffect(() => {
    try {
      if (theme === 'dark') {
        setCurrentTheme('monokai');
      } else {
        setCurrentTheme('light-custom');
      }
    } catch (error) {
      console.error('[useMonacoConfig] Error al aplicar tema:', error);
      setCurrentTheme('vs-dark'); // Tema por defecto
    }
  }, [theme]);

  // Configuración del editor
  const getEditorOptions = (isMobile: boolean = false) => {
    try {
      return {
        minimap: { enabled: !isMobile },
        fontSize: isMobile ? 12 : 14,
        wordWrap: 'on' as const,
        mouseWheelZoom: true,
        readOnly: false,
        domReadOnly: false,
        contextmenu: false, // Deshabilitar menú contextual por seguridad
        lineNumbers: 'on' as const,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection' as const,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
        folding: true,
        foldingStrategy: 'indentation' as const,
        showFoldingControls: 'always' as const,
        unfoldOnClickAfterEndOfLine: false,
        bracketPairColorization: {
          enabled: true
        },
        guides: {
          bracketPairs: true,
          indentation: true
        },
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showUsers: true,
          showIssues: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        parameterHints: {
          enabled: true
        },
        hover: {
          enabled: true
        }
      };
    } catch (error) {
      console.error('[useMonacoConfig] Error al obtener opciones del editor:', error);
      // Retornar configuración mínima en caso de error
       return {
         minimap: { enabled: false },
         fontSize: 14,
         wordWrap: 'on' as const,
         mouseWheelZoom: true,
         readOnly: false,
         contextmenu: false,
         lineNumbers: 'on' as const,
         automaticLayout: true
       };
    }
  };

  return {
    currentTheme,
    getEditorOptions,
    defineCustomThemes
  };
};