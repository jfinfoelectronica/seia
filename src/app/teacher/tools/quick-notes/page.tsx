'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StickyNote, Sparkles, Pencil, Trash2, Loader2, Copy, Info, Trash, Star, StarOff, FileText, Upload, Download } from 'lucide-react';
import { generateNotesWithGemini } from './actions';
import { generateGeminiSummary } from '@/lib/gemini-quick-notes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const outputOptions = [
  { value: 'summary', label: 'Resumen redactado' },
  { value: 'email', label: 'Correo formal' },
  { value: 'bullets', label: 'Puntos clave' },
  { value: 'report', label: 'Informe estructurado' },
  { value: 'blogpost', label: 'Post de blog' },
  { value: 'motivation', label: 'Mensaje motivacional' },
  { value: 'tasks', label: 'Lista de tareas' },
  { value: 'letter', label: 'Carta formal' },
  { value: 'custom', label: 'Otro (personalizado)' },
];

interface GeneratedResult {
  id: string;
  type: string;
  label: string;
  content: string;
  date: string;
  customPrompt?: string;
}

export default function QuickNotesPanel() {
  const [notes, setNotes] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [outputType, setOutputType] = useState('summary');
  const [customPrompt, setCustomPrompt] = useState('');
  const [editingIdx, setEditingIdx] = useState<number|null>(null);
  const [editValue, setEditValue] = useState('');
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [favorites, setFavorites] = useState<GeneratedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<'results'|'favorites'>('results');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [summarizingId, setSummarizingId] = useState<string|null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
      setNotes([input.trim(), ...notes]);
      setInput('');
      e.preventDefault();
    }
  };

  const handleDelete = (idx: number) => {
    setNotes(notes.filter((_, i) => i !== idx));
    if (editingIdx === idx) {
      setEditingIdx(null);
      setEditValue('');
    }
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(notes[idx]);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditSave = (idx: number) => {
    if (editValue.trim()) {
      setNotes(notes.map((n, i) => (i === idx ? editValue.trim() : n)));
      setEditingIdx(null);
      setEditValue('');
    }
  };

  const handleEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleEditSave(idx);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setEditingIdx(null);
      setEditValue('');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      let prompt = outputType;
      let label = outputOptions.find(opt => opt.value === outputType)?.label || outputType;
      let type = outputType;
      let customPromptValue = undefined;
      if (outputType === 'custom') {
        prompt = customPrompt.trim() || 'Genera un texto útil a partir de las notas.';
        label = `Personalizado: ${customPrompt.trim() || 'Sin indicación'}`;
        type = 'custom';
        customPromptValue = customPrompt.trim();
      }
      const res = await generateNotesWithGemini(notes, type as import('@/lib/gemini-quick-notes').QuickNotesOutputType, prompt);
      setResults([
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          type,
          label,
          content: res,
          date: new Date().toLocaleString(),
          customPrompt: customPromptValue,
        },
        ...results,
      ]);
    } catch {
      setError('Ocurrió un error al generar el texto.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleDeleteResult = (id: string) => {
    setResults(results.filter(r => r.id !== id));
  };

  const handleFavorite = (result: GeneratedResult) => {
    setFavorites([result, ...favorites]);
    setResults(results.filter(r => r.id !== result.id));
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter(f => f.id !== id));
  };

  // Resumir un resultado individual
  async function handleSummarizeResult(result: GeneratedResult) {
    setSummarizingId(result.id);
    setError('');
    try {
      const summary = await generateGeminiSummary(result.content);
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, content: summary, label: 'Resumen', type: 'summary' } : r));
    } catch {
      setError('No se pudo resumir el resultado.');
    } finally {
      setSummarizingId(null);
    }
  }

  function handleExportProject() {
    const data = JSON.stringify({ notes, results, favorites }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notas-rapidas-proyecto.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target?.result as string);
        setNotes(Array.isArray(obj.notes) ? obj.notes : []);
        setResults(Array.isArray(obj.results) ? obj.results : []);
        setFavorites(Array.isArray(obj.favorites) ? obj.favorites : []);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="w-full py-8 px-0 md:px-2">
      <div className="flex items-center justify-between mb-0">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <StickyNote className="h-8 w-8 text-primary" /> Notas Rápidas con IA
        </h1>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="application/json"
            className="hidden"
            ref={inputFileRef}
            onChange={handleImportProject}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => inputFileRef.current?.click()}
            title="Importar proyecto"
            aria-label="Importar proyecto"
          >
            <Upload className="w-5 h-5" /> Importar proyecto
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportProject}
            title="Exportar proyecto"
            aria-label="Exportar proyecto"
          >
            <Download className="w-5 h-5" /> Exportar proyecto
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="ml-auto px-4 py-2 text-base font-semibold"
              >
                Limpiar todo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Limpiar todo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará <b>todas</b> tus notas, resultados y favoritos. No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setNotes([]);
                    setResults([]);
                    setFavorites([]);
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Sí, limpiar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <p className="text-base text-muted-foreground mb-6 max-w-2xl">
        Herramienta para tomar notas rápidas, organizarlas y generar textos útiles (resúmenes, correos, listas, etc.) usando IA. Ideal para docentes que quieren transformar ideas en textos listos para usar.
      </p>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
        {/* Izquierda: toma de notas */}
        <div className="flex-1 basis-1/2 flex flex-col gap-4 order-1 md:order-1 min-w-0">
          <Card className="mb-6 bg-background/90 border border-border rounded-lg shadow-sm h-full">
            <CardContent className="pt-6 pb-4 px-4 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-xl">Toma de notas</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Escribe una nota y presiona <b>Enter</b> (Shift+Enter para salto de línea). Puedes editar o eliminar cada nota después.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <textarea
                ref={inputRef}
                rows={2}
                className="border rounded px-4 py-3 text-base focus:outline-none focus:ring bg-background text-foreground shadow-sm resize-none"
                placeholder="Escribe una nota y presiona Enter..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleInput}
                maxLength={400}
              />
              <div className="space-y-2 overflow-y-auto min-h-[120px] md:min-h-0 md:max-h-[calc(100vh-220px)]" style={{maxHeight: 'calc(100vh - 220px)'}}>
                {notes.length === 0 && (
                  <div className="text-muted-foreground text-sm">No hay notas aún.</div>
                )}
                {notes.map((note, idx) => (
                  <Card
                    key={idx}
                    className="border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100 shadow-sm"
                  >
                    <CardContent className="px-3 flex flex-row items-center gap-3 w-full min-h-0">
                      {/* Badge con número de nota */}
                      <span className="flex items-center justify-center min-w-7 h-7 rounded-full bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 font-bold text-sm self-center">
                        {idx + 1}
                      </span>
                      {/* Contenido de la nota alineado a la izquierda y expandible */}
                      <div className="flex-1 flex items-center min-w-0">
                        {editingIdx === idx ? (
                          <textarea
                            className="flex-1 border rounded px-2 py-0 bg-background text-foreground resize-none min-h-0 max-h-40 overflow-auto text-left self-center w-full align-middle"
                            value={editValue}
                            onChange={handleEditChange}
                            onBlur={() => handleEditSave(idx)}
                            onKeyDown={e => handleEditKey(e, idx)}
                            rows={1}
                            autoFocus
                            style={{height: 'auto', lineHeight: '1.5'}}
                            ref={el => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                          />
                        ) : (
                          <span className="flex-1 text-inherit break-words text-left whitespace-pre-line self-center w-full align-middle leading-[1.5]">
                            {note}
                          </span>
                        )}
                      </div>
                      {/* Iconos alineados horizontalmente a la derecha */}
                      <div className="flex flex-row justify-end items-center gap-1 ml-2 self-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(idx)} aria-label="Editar nota">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar nota</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(idx)} aria-label="Eliminar nota">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar nota</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Derecha: generador/resultados/favoritos */}
        <div className="flex-1 basis-1/2 flex flex-col gap-4 order-2 md:order-2 min-w-0">
          {/* Generador */}
          <Card className="mb-2 bg-background/90 border border-border rounded-lg shadow-sm">
            <CardContent className="pt-6 pb-4 px-4 flex flex-col gap-4">
              <div className="flex gap-2 items-center flex-wrap mb-2">
                <label htmlFor="outputType" className="text-base font-medium">Tipo de texto:</label>
                <select
                  id="outputType"
                  className="border rounded px-2 py-2 bg-background text-foreground"
                  value={outputType}
                  onChange={e => setOutputType(e.target.value)}
                >
                  {outputOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {outputType === 'custom' && (
                  <input
                    className="border rounded px-2 py-2 bg-background text-foreground flex-1 min-w-[180px]"
                    placeholder="Describe el tipo de texto que deseas..."
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    maxLength={120}
                  />
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleGenerate} disabled={loading || notes.length === 0 || (outputType === 'custom' && !customPrompt.trim())} className="gap-2 text-base px-6 py-2">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        Generar con Gemini
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Genera el texto seleccionado a partir de tus notas.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </CardContent>
          </Card>
          {/* Tabs de resultados/favoritos */}
          <div className="mb-6 flex gap-2 border-b border-border">
            <button
              className={`px-4 py-2 font-semibold rounded-t-md transition-colors ${activeTab === 'results' ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'}`}
              onClick={() => setActiveTab('results')}
            >
              Resultados generados
            </button>
            <button
              className={`px-4 py-2 font-semibold rounded-t-md transition-colors ${activeTab === 'favorites' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200' : 'bg-background text-muted-foreground'}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favoritos
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {activeTab === 'results' && (
              results.length === 0 ? (
                <div className="text-muted-foreground text-sm">No hay resultados generados aún.</div>
              ) : (
                results.map(r => (
                  <Card key={r.id} className="border-primary/30 bg-primary/5 dark:bg-primary/10">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-primary">{r.label}</span>
                          <span className="text-xs text-muted-foreground">{r.date}</span>
                        </div>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleSummarizeResult(r)} aria-label="Resumir resultado" disabled={summarizingId === r.id}>
                                  {summarizingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resumir este resultado</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleCopy(r.content, r.id)} aria-label="Copiar resultado">
                                  {copiedId === r.id ? <span className="text-green-600 text-xs">¡Copiado!</span> : <Copy className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar al portapapeles</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleFavorite(r)} aria-label="Guardar en favoritos">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Guardar en favoritos</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteResult(r.id)} aria-label="Eliminar resultado">
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar resultado</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-foreground text-sm bg-transparent">{r.content}</div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
            {activeTab === 'favorites' && (
              favorites.length === 0 ? (
                <div className="text-muted-foreground text-sm">No hay favoritos aún.</div>
              ) : (
                favorites.map(f => (
                  <Card key={f.id} className="border-yellow-400"
                    style={{
                      backgroundColor: 'var(--favorite-bg, #FEF9C3)',
                      color: 'var(--favorite-text, #92400E)'
                    }}
                    data-theme="favorite"
                  >
                    <CardContent className="p-3 flex flex-col gap-2"
                      style={{
                        backgroundColor: 'inherit',
                        color: 'inherit'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-yellow-700 dark:text-yellow-200" style={{color: 'inherit'}}>{f.label}</span>
                          <span className="text-xs text-muted-foreground">{f.date}</span>
                        </div>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleCopy(f.content, f.id)} aria-label="Copiar favorito">
                                  {copiedId === f.id ? <span className="text-green-600 text-xs">¡Copiado!</span> : <Copy className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar al portapapeles</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveFavorite(f.id)} aria-label="Eliminar favorito">
                                  <StarOff className="h-4 w-4" style={{color: 'inherit'}} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar de favoritos</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm bg-transparent" style={{color: 'inherit'}}>{f.content}</div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}