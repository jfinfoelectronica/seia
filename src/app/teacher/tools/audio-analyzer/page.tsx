"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { corregirRedaccionCriterio, generateCriteriosWithGemini, evaluateAudioFlexibleWithGemini, redistributeCriteriosWithGemini } from "@/lib/gemini-audio-evaluation";
import { ArrowUp, ArrowDown, Trash2, Upload, Download, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Switch } from '@/components/ui/switch';

export default function AudioAnalyzerPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [criterios, setCriterios] = useState<{ descripcion: string; minutos: string; segundos: string; porcentaje: string }[]>([]);
  const [nuevoCriterio, setNuevoCriterio] = useState('');
  const [nuevoMin, setNuevoMin] = useState('');
  const [nuevoSeg, setNuevoSeg] = useState('');
  const [nuevoPorc, setNuevoPorc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    segments: {
      start: string;
      end: string;
      transcript: string;
      evaluations: { criterio: string; valor: string }[];
      comments: string;
    }[];
    overallComments: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [corrigiendoIdx, setCorrigiendoIdx] = useState<number|null>(null);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editCriterio, setEditCriterio] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editSeg, setEditSeg] = useState('');
  const [editPorc, setEditPorc] = useState('');
  const [openPrompt, setOpenPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [loadingGen, setLoadingGen] = useState(false);
  const [modo, setModo] = useState<'libre' | 'criterios'>('criterios');
  const [usarMarcasDeTiempo, setUsarMarcasDeTiempo] = useState(true);
  const [usarPorcentaje, setUsarPorcentaje] = useState(true);
  const [rubrica, setRubrica] = useState<{
    rubrica: {
      criterio: string;
      calificacion: number;
      retroalimentacion: string;
      porcentaje?: number;
    }[];
    calificacionTotal: number;
    retroalimentacionGeneral: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder|null>(null);
  const [loadingRedistribuir, setLoadingRedistribuir] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
    setAudioUrl(file ? URL.createObjectURL(file) : null);
    setResult(null);
    setError("");
  }

  function handleRemove() {
    setAudioFile(null);
    setAudioUrl(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleAddCriterio() {
    if (
      nuevoCriterio.trim() &&
      !criterios.some(c => c.descripcion === nuevoCriterio.trim() && c.minutos === nuevoMin && c.segundos === nuevoSeg)
    ) {
      setCriterios([
        ...criterios,
        { descripcion: nuevoCriterio.trim(), minutos: nuevoMin || '0', segundos: nuevoSeg || '0', porcentaje: nuevoPorc || '0' },
      ]);
      setNuevoCriterio('');
      setNuevoMin('');
      setNuevoSeg('');
      setNuevoPorc('');
    }
  }

  function handleRemoveCriterio(idx: number) {
    setCriterios(criterios.filter((_, i) => i !== idx));
  }

  function moveCriterio(idx: number, dir: 'up' | 'down') {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === criterios.length - 1)) return;
    const newArr = [...criterios];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    setCriterios(newArr);
  }

  async function handleAnalyze() {
    if (!audioFile) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRubrica(null);
    try {
      if (modo === 'libre') {
        const res = await evaluateAudioFlexibleWithGemini(audioFile, { modo: 'libre' });
        setRubrica(res);
      } else {
        const res = await evaluateAudioFlexibleWithGemini(audioFile, {
          modo: 'criterios',
          criterios,
          usarMarcasDeTiempo,
          usarPorcentaje
        });
        setRubrica(res);
      }
    } catch (e) {
      // e es desconocido, pero se usa solo para mensaje de error
      setError(e instanceof Error ? e.message : String(e) || "Error al analizar el audio");
    } finally {
      setLoading(false);
    }
  }

  async function handleCorregirCriterio(idx: number) {
    setCorrigiendoIdx(idx);
    try {
      const crit = criterios[idx];
      const texto = `${crit.descripcion} (${crit.minutos.padStart(2,'0')}:${crit.segundos.padStart(2,'0')})`;
      const corregido = await corregirRedaccionCriterio(texto);
      // Extraer descripción y tiempo del texto corregido (si el usuario lo deja igual, mantener tiempo)
      const match = corregido.match(/^(.*)\((\d{2}):(\d{2})\)$/);
      if (match) {
        setCriterios(criterios.map((c, i) =>
          i === idx
            ? { descripcion: match[1].trim(), minutos: match[2], segundos: match[3], porcentaje: c.porcentaje }
            : c
        ));
      } else {
        setCriterios(criterios.map((c, i) => i === idx ? { ...c, descripcion: corregido } : c));
      }
    } catch {
      // opcional: mostrar error
    } finally {
      setCorrigiendoIdx(null);
    }
  }

  function startEditCriterio(idx: number) {
    setEditIdx(idx);
    setEditCriterio(criterios[idx].descripcion);
    setEditMin(criterios[idx].minutos);
    setEditSeg(criterios[idx].segundos);
    setEditPorc(criterios[idx].porcentaje);
  }

  function cancelEditCriterio() {
    setEditIdx(null);
    setEditCriterio('');
    setEditMin('');
    setEditSeg('');
    setEditPorc('');
  }

  function saveEditCriterio(idx: number) {
    setCriterios(criterios.map((c, i) => i === idx ? {
      descripcion: editCriterio,
      minutos: editMin || '0',
      segundos: editSeg || '0',
      porcentaje: editPorc || '0',
    } : c));
    setEditIdx(null);
    setEditCriterio('');
    setEditMin('');
    setEditSeg('');
    setEditPorc('');
  }

  // Importar criterios desde archivo JSON
  function handleImportCriterios(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const arr = JSON.parse(ev.target?.result as string);
        if (Array.isArray(arr)) {
          setCriterios(arr);
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Exportar criterios a archivo JSON
  function handleExportCriterios() {
    const data = JSON.stringify(criterios, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'criterios.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generar criterios automáticamente con Gemini usando Dialog
  async function handleGenerarCriteriosDialog() {
    setLoadingGen(true);
    try {
      const arr = await generateCriteriosWithGemini(promptValue);
      setCriterios([]);
      setTimeout(() => setCriterios(arr), 0);
      setOpenPrompt(false);
      setPromptValue('');
    } catch {
      window.alert('No se pudieron generar los criterios automáticamente.');
    } finally {
      setLoadingGen(false);
    }
  }

  // Calcula la duración de cada criterio en segundos (diferencia con el siguiente)
  function getDuraciones() {
    return criterios.map((c, i) => {
      const start = parseInt(c.minutos) * 60 + parseInt(c.segundos);
      let end;
      if (i < criterios.length - 1) {
        const next = criterios[i + 1];
        end = parseInt(next.minutos) * 60 + parseInt(next.segundos);
      } else {
        end = start + 60; // Por defecto 1 min si es el último
      }
      const dur = Math.max(0, end - start);
      return dur;
    });
  }
  const duraciones = getDuraciones();

  // Exportar plan de evaluación a PDF
  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Plan de Evaluación de Audio', 14, 18);
    doc.setFontSize(12);
    doc.text('Criterios:', 14, 28);
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Descripción', 'Min', 'Seg', '%', 'Duración']],
      body: criterios.map((c, i) => [
        i + 1,
        c.descripcion,
        c.minutos,
        c.segundos,
        c.porcentaje,
        `${Math.floor(duraciones[i]/60)}:${(duraciones[i]%60).toString().padStart(2,'0')} min`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
    doc.save('plan-evaluacion-audio.pdf');
  }

  // Exportar resultado de análisis a PDF
  function handleExportAnalisisPDF() {
    if (!rubrica) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Resultado de Análisis de Audio', 14, 18);
    doc.setFontSize(12);
    doc.text('Rúbrica autocalificada:', 14, 28);
    autoTable(doc, {
      startY: 32,
      head: [['Criterio', 'Calificación', 'Retroalimentación', ...(rubrica.rubrica[0]?.porcentaje !== undefined ? ['%'] : [])]],
      body: rubrica.rubrica.map((r) => [
        r.criterio,
        r.calificacion.toFixed(1),
        r.retroalimentacion,
        ...(r.porcentaje !== undefined ? [r.porcentaje + '%'] : [])
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
    // @ts-expect-error: lastAutoTable no está tipado en jsPDF
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Calificación total: ${rubrica.calificacionTotal.toFixed(2)} / 5.0`, 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text('Retroalimentación general:', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(rubrica.retroalimentacionGeneral, 180), 14, y);
    doc.save('resultado-analisis-audio.pdf');
  }

  // Iniciar grabación
  async function startRecording() {
    setIsRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new window.MediaRecorder(stream);
    setMediaRecorder(recorder);
    // Usa const en vez de let para chunks
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioFile(new File([blob], 'grabacion.webm', { type: 'audio/webm' }));
      setAudioUrl(URL.createObjectURL(blob));
      setResult(null);
      setRubrica(null);
      setError("");
    };
    recorder.start();
  }

  // Detener grabación
  function stopRecording() {
    mediaRecorder?.stop();
    setIsRecording(false);
  }

  async function handleRedistribuirCriterios() {
    if (!audioFile || criterios.length === 0) return;
    setLoadingRedistribuir(true);
    try {
      const audio = new Audio(audioUrl!);
      await new Promise(resolve => { audio.onloadedmetadata = resolve; audio.load(); });
      const duracion = Math.floor(audio.duration);
      const nuevos = await redistributeCriteriosWithGemini(criterios, duracion);
      setCriterios(nuevos);
    } catch {
      window.alert('No se pudo redistribuir los criterios automáticamente.');
    } finally {
      setLoadingRedistribuir(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row w-full py-10 px-0 gap-4">
      {/* Columna principal */}
      <div className="w-full md:w-1/2 flex flex-col justify-start min-w-0">
        <h1 className="text-2xl font-bold mb-4">Analizador de Audio</h1>
        <p className="text-muted-foreground mb-8">
          Sube o graba un archivo de audio y obtén una evaluación automática, ya sea global o basada en criterios personalizados. Puedes redistribuir automáticamente los tiempos y porcentajes de los criterios según la duración del audio, generar criterios con IA, exportar resultados y mucho más.
        </p>
        <div className="mb-8">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button onClick={() => inputRef.current?.click()}>Seleccionar audio</Button>
            {audioFile && (
              <Button variant="outline" onClick={handleRemove}>Quitar</Button>
            )}
            <Button variant={isRecording ? 'destructive' : 'default'} onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? 'Detener grabación' : 'Grabar audio'}
            </Button>
          </div>
          {audioFile && (
            <div className="mt-2">
              <audio controls src={audioUrl || undefined} className="w-full rounded" />
              <div className="text-sm mt-2">Archivo: <b>{audioFile.name}</b> ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</div>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Modo:</span>
            <Button variant={modo==='libre'?'default':'outline'} size="sm" onClick={()=>setModo('libre')}>Libre</Button>
            <Button variant={modo==='criterios'?'default':'outline'} size="sm" onClick={()=>setModo('criterios')}>Con criterios</Button>
          </div>
          {modo==='criterios' && (
            <>
              <div className="flex items-center gap-2">
                <Switch checked={usarMarcasDeTiempo} onCheckedChange={setUsarMarcasDeTiempo} id="switch-tiempo" />
                <label htmlFor="switch-tiempo" className="text-sm">Usar marcas de tiempo</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={usarPorcentaje} onCheckedChange={setUsarPorcentaje} id="switch-porc" />
                <label htmlFor="switch-porc" className="text-sm">Usar porcentaje</label>
              </div>
            </>
          )}
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={!audioFile || loading || (modo === 'criterios' && criterios.length === 0)}
          className="w-full text-base font-semibold py-3 mb-8"
        >
          {loading ? 'Analizando audio...' : 'Analizar audio'}
        </Button>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div>
          <h2 className="text-lg font-semibold mb-2">Resultados por marcas de tiempo</h2>
          {!result && <div className="text-muted-foreground">(Aquí se mostrarán los resultados una vez que se procese el audio)</div>}
          {result && (
            <div className="space-y-6">
              {result.segments.map((seg, idx: number) => (
                <div key={idx} className="border rounded-lg p-4 bg-background/80">
                  <div className="font-semibold mb-1">{seg.start} - {seg.end}</div>
                  <div className="mb-2"><b>Transcripción:</b> <span className="text-muted-foreground">{seg.transcript}</span></div>
                  <div className="mb-2">
                    <b>Evaluación por criterio:</b>
                    <ul className="list-disc pl-6">
                      {seg.evaluations.map((ev, i: number) => (
                        <li key={i}><b>{ev.criterio}:</b> {ev.valor}</li>
                      ))}
                    </ul>
                  </div>
                  <div><b>Comentarios:</b> <span className="text-muted-foreground">{seg.comments}</span></div>
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <b>Comentarios generales:</b> <span className="text-muted-foreground">{result.overallComments}</span>
              </div>
            </div>
          )}
        </div>
        {/* Mostrar rúbrica y calificación total */}
        {rubrica && (
          <div className="mt-8 border rounded-lg p-4 bg-background/80">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Rúbrica autocalificada</h2>
              <Button size="sm" variant="secondary" onClick={handleExportAnalisisPDF}>Exportar resultado PDF</Button>
            </div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr>
                  <th className="text-left">Criterio</th>
                  <th>Calificación</th>
                  <th>Retroalimentación</th>
                  {rubrica.rubrica[0]?.porcentaje !== undefined && <th>%</th>}
                </tr>
              </thead>
              <tbody>
                {rubrica.rubrica.map((r, i: number) => (
                  <tr key={i}>
                    <td>{r.criterio}</td>
                    <td className="text-center font-bold">{r.calificacion.toFixed(1)}</td>
                    <td>{r.retroalimentacion}</td>
                    {r.porcentaje !== undefined && <td className="text-center">{r.porcentaje}%</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mb-2"><b>Calificación total:</b> <span className="text-lg font-bold">{rubrica.calificacionTotal.toFixed(2)} / 5.0</span></div>
            <div><b>Retroalimentación general:</b> <span className="text-muted-foreground">{rubrica.retroalimentacionGeneral}</span></div>
          </div>
        )}
      </div>
      {/* Columna lateral: criterios */}
      <aside className="w-full md:w-1/2 flex flex-col justify-start min-w-0">
        <h2 className="text-lg font-semibold mb-2">Criterios de evaluación</h2>
        <div className="flex justify-between gap-2 mb-4 w-full flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <label className="inline-block">
              <input type="file" accept="application/json" className="hidden" onChange={handleImportCriterios} />
              <Button variant="outline" size="sm" asChild><span><Upload className="w-4 h-4 mr-1" />Importar</span></Button>
            </label>
            <Button variant="outline" size="sm" onClick={handleExportCriterios}><Download className="w-4 h-4 mr-1" />Exportar</Button>
            <Button variant="secondary" size="sm" onClick={handleExportPDF}>Exportar PDF</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={openPrompt} onOpenChange={setOpenPrompt}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm"><Wand2 className="w-4 h-4 mr-1" />Generar automático</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generar criterios automáticamente</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={promptValue}
                  onChange={e => setPromptValue(e.target.value)}
                  placeholder="Describe el contexto o lo que deseas evaluar (ej: presentación de proyecto, exposición, etc.)"
                  className="mb-2"
                  rows={4}
                />
                <DialogFooter>
                  <Button onClick={() => setOpenPrompt(false)} variant="ghost">Cancelar</Button>
                  <Button onClick={handleGenerarCriteriosDialog} disabled={!promptValue.trim() || loadingGen}>
                    {loadingGen ? 'Generando...' : 'Generar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="self-end mb-2"
            onClick={handleRedistribuirCriterios}
            disabled={!audioFile || criterios.length === 0 || loadingRedistribuir}
          >
            {loadingRedistribuir ? 'Redistribuyendo...' : 'Redistribuir tiempos y porcentajes con IA'}
          </Button>
          <textarea
            className="border rounded px-2 py-2 resize-none min-h-[48px]"
            placeholder="Descripción del criterio..."
            value={nuevoCriterio}
            onChange={e => setNuevoCriterio(e.target.value)}
            maxLength={200}
          />
          <div className="flex gap-2 items-end flex-wrap w-full">
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1" htmlFor="min">Min</label>
              <input
                id="min"
                type="number"
                min="0"
                max="59"
                className="border rounded px-2 py-1 w-16"
                placeholder="Min"
                value={nuevoMin}
                onChange={e => setNuevoMin(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
              />
            </div>
            <span className="mb-5">:</span>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1" htmlFor="seg">Seg</label>
              <input
                id="seg"
                type="number"
                min="0"
                max="59"
                className="border rounded px-2 py-1 w-16"
                placeholder="Seg"
                value={nuevoSeg}
                onChange={e => setNuevoSeg(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1" htmlFor="porc">%</label>
              <input
                id="porc"
                type="number"
                min="0"
                max="100"
                className="border rounded px-2 py-1 w-20"
                placeholder="%"
                value={nuevoPorc}
                onChange={e => setNuevoPorc(e.target.value.replace(/[^0-9]/g, '').slice(0,3))}
              />
            </div>
            <div className="flex-1 flex justify-end">
              <Button onClick={handleAddCriterio} disabled={!nuevoCriterio.trim()}>Agregar</Button>
            </div>
          </div>
        </div>
        <ul className="space-y-2">
          {criterios.map((c, i) => (
            <li key={i} className="flex items-center gap-2 border rounded px-2 py-2 bg-background/80">
              <Badge className="mr-2">{i+1}</Badge>
              {editIdx === i ? (
                <>
                  <textarea
                    className="border rounded px-2 py-1 flex-1 min-h-[32px]"
                    value={editCriterio}
                    onChange={e => setEditCriterio(e.target.value)}
                    maxLength={200}
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="border rounded px-2 py-1 w-14"
                    value={editMin}
                    onChange={e => setEditMin(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
                  />
                  <span>:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="border rounded px-2 py-1 w-14"
                    value={editSeg}
                    onChange={e => setEditSeg(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="border rounded px-2 py-1 w-16"
                    value={editPorc}
                    onChange={e => setEditPorc(e.target.value.replace(/[^0-9]/g, '').slice(0,3))}
                  />
                  <Button size="sm" variant="secondary" onClick={() => saveEditCriterio(i)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditCriterio}>Cancelar</Button>
                </>
              ) : (
                <>
                  <span className="flex-1">{c.descripcion} <span className="text-xs text-muted-foreground">({c.minutos.padStart(2,'0')}:{c.segundos.padStart(2,'0')})</span></span>
                  <span className="text-xs font-semibold text-primary">{c.porcentaje}%</span>
                  <span className="text-xs text-muted-foreground ml-2">Duración: {Math.floor(duraciones[i]/60)}:{(duraciones[i]%60).toString().padStart(2,'0')} min</span>
                  <Button size="icon" variant="ghost" onClick={() => moveCriterio(i, 'up')} disabled={i===0} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveCriterio(i, 'down')} disabled={i===criterios.length-1} aria-label="Bajar"><ArrowDown className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleCorregirCriterio(i)} disabled={corrigiendoIdx===i} aria-label="Corregir redacción">{corrigiendoIdx===i ? <span className="animate-spin">⏳</span> : <Wand2 className="w-4 h-4" />}</Button>
                  <Button size="icon" variant="ghost" onClick={() => startEditCriterio(i)} aria-label="Editar">✎</Button>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveCriterio(i)} aria-label="Quitar"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}