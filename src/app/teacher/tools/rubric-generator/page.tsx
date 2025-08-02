"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateRubricWithGemini, RubricResult, RubricCriterion, corregirRedaccionCriterioRubrica } from "@/lib/gemini-rubric-generator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Trash2, Wand2, PlusCircle, Plus, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function RubricGeneratorPanel() {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [editRubric, setEditRubric] = useState<RubricResult|null>(null);
  const [error, setError] = useState("");
  const [corrigiendoIdx, setCorrigiendoIdx] = useState<number|null>(null);
  const [corrigiendoTodoIdx, setCorrigiendoTodoIdx] = useState<number|null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await generateRubricWithGemini(desc);
      setEditRubric(JSON.parse(JSON.stringify(res)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar la rúbrica");
    } finally {
      setLoading(false);
    }
  }

  function handleEditCriterion(idx: number, field: keyof RubricCriterion, value: unknown) {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    // Fix: Cast to unknown first to satisfy TS2352
    (newCrits[idx] as unknown as Record<string, unknown>)[field] = value;
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  function handleEditDescriptor(idx: number, dIdx: number, value: string) {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    newCrits[idx].descriptores[dIdx] = value;
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  function handleEditScale(idx: number, sIdx: number, value: string) {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    newCrits[idx].escala[sIdx] = value;
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  function handleExportPDF() {
    if (!editRubric) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(editRubric.titulo, 14, 18);
    let y = 28;
    editRubric.criterios.forEach((c, i) => {
      doc.setFontSize(13);
      doc.text(`${i+1}. ${c.criterio}`, 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Descriptor", ...c.escala]],
        body: c.descriptores.map((d, j) => [d, ...c.escala.map((s, k) => k === j ? "✔" : "")]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 8;
    });
    if (editRubric.observaciones) {
      doc.setFontSize(11);
      doc.text('Observaciones:', 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(editRubric.observaciones, 180), 14, y);
    }
    doc.save('rubrica-generada.pdf');
  }

  function handleExportExcel() {
    if (!editRubric) return;
    const wsData = [];
    wsData.push([editRubric.titulo]);
    wsData.push([]);
    editRubric.criterios.forEach((c, i) => {
      wsData.push([`${i+1}. ${c.criterio}`]);
      wsData.push(["Descriptor", ...c.escala]);
      c.descriptores.forEach((d, j) => {
        wsData.push([
          d,
          ...c.escala.map((s, k) => k === j ? "✔" : "")
        ]);
      });
      wsData.push([]);
    });
    if (editRubric.observaciones) {
      wsData.push([]);
      wsData.push(["Observaciones:", editRubric.observaciones]);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rúbrica');
    XLSX.writeFile(wb, 'rubrica-generada.xlsx');
  }

  function handleAddCriterion() {
    if (!editRubric) return;
    setEditRubric({
      ...editRubric,
      criterios: [
        ...editRubric.criterios,
        { criterio: '', descriptores: ['', '', ''], escala: ['', '', ''] }
      ]
    });
  }

  function handleRemoveCriterion(idx: number) {
    if (!editRubric) return;
    setEditRubric({
      ...editRubric,
      criterios: editRubric.criterios.filter((_, i) => i !== idx)
    });
  }

  function handleAddDescriptor(idx: number) {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    newCrits[idx].descriptores.push('');
    newCrits[idx].escala.push('');
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  function handleRemoveDescriptor(idx: number, dIdx: number) {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    newCrits[idx].descriptores.splice(dIdx, 1);
    newCrits[idx].escala.splice(dIdx, 1);
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  function handleMoveDescriptor(idx: number, dIdx: number, direction: 'up' | 'down') {
    if (!editRubric) return;
    const newCrits = [...editRubric.criterios];
    const { descriptores, escala } = newCrits[idx];
    const n = descriptores.length;
    if ((direction === 'up' && dIdx === 0) || (direction === 'down' && dIdx === n - 1)) return;
    const swapIdx = direction === 'up' ? dIdx - 1 : dIdx + 1;
    // Swap descriptor
    [descriptores[dIdx], descriptores[swapIdx]] = [descriptores[swapIdx], descriptores[dIdx]];
    // Swap escala
    [escala[dIdx], escala[swapIdx]] = [escala[swapIdx], escala[dIdx]];
    setEditRubric({ ...editRubric, criterios: newCrits });
  }

  async function handleCorregirCriterio(idx: number) {
    if (!editRubric) return;
    setCorrigiendoIdx(idx);
    try {
      const texto = editRubric.criterios[idx].criterio;
      const corregido = await corregirRedaccionCriterioRubrica(texto);
      handleEditCriterion(idx, 'criterio', corregido);
    } finally {
      setCorrigiendoIdx(null);
    }
  }

  async function handleCorregirTodo(idx: number) {
    if (!editRubric) return;
    setCorrigiendoTodoIdx(idx);
    try {
      // Corrige criterio
      const crit = editRubric.criterios[idx];
      const criterioCorregido = await corregirRedaccionCriterioRubrica(crit.criterio);
      // Corrige descriptores
      const descriptoresCorregidos = await Promise.all(
        crit.descriptores.map(async d => d ? await corregirRedaccionCriterioRubrica(d) : '')
      );
      // Corrige escalas
      const escalasCorregidas = await Promise.all(
        crit.escala.map(async s => s ? await corregirRedaccionCriterioRubrica(s) : '')
      );
      handleEditCriterion(idx, 'criterio', criterioCorregido);
      handleEditCriterion(idx, 'descriptores', descriptoresCorregidos);
      handleEditCriterion(idx, 'escala', escalasCorregidas);
    } finally {
      setCorrigiendoTodoIdx(null);
    }
  }

  function handleExportProyecto() {
    if (!editRubric) return;
    const data = JSON.stringify(editRubric, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proyecto-rubrica.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportProyecto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target?.result as string);
        setEditRubric(JSON.parse(JSON.stringify(obj)));
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="w-full max-w-full px-2 md:px-8 py-8 mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Generador de Rúbricas Automáticas</h1>
          <p className="text-muted-foreground">Describe la actividad, objetivo o competencia a evaluar y genera una rúbrica detallada con criterios, descriptores y escalas. Puedes personalizar la rúbrica y exportarla en PDF o Excel.</p>
        </div>
        <div className="flex flex-row gap-2 mt-2 md:mt-0 items-center">
          <label className="inline-block">
            <input type="file" accept="application/json" className="hidden" onChange={handleImportProyecto} />
            <Button variant="outline" size="sm" asChild><span>Importar proyecto</span></Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExportProyecto}>Exportar proyecto</Button>
        </div>
      </div>
      <Textarea
        className="mb-2"
        placeholder="Describe la actividad, objetivo o competencia..."
        value={desc}
        onChange={e => setDesc(e.target.value)}
        rows={3}
      />
      <Button onClick={handleGenerate} disabled={!desc.trim() || loading} className="mb-4">
        {loading ? 'Generando...' : 'Generar rúbrica con IA'}
      </Button>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {editRubric && (
        <div className="border rounded-lg p-4 bg-background/80 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Input
              className="font-bold text-lg flex-1"
              value={editRubric.titulo}
              onChange={e => setEditRubric({ ...editRubric, titulo: e.target.value })}
            />
            <Button size="sm" variant="secondary" onClick={handleExportPDF}>Exportar PDF</Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel}>Exportar Excel</Button>
          </div>
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={handleAddCriterion} className="gap-2"><PlusCircle className="w-4 h-4" />Agregar criterio</Button>
          </div>
          {editRubric.criterios.map((c, i) => (
            <div key={i} className="mb-4 border rounded p-3 bg-background/60">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  className="font-semibold flex-1"
                  value={c.criterio}
                  onChange={e => handleEditCriterion(i, 'criterio', e.target.value)}
                />
                <Button size="icon" variant="ghost" onClick={() => handleCorregirCriterio(i)} disabled={corrigiendoIdx===i} aria-label="Corregir redacción">{corrigiendoIdx===i ? <span className="animate-spin">⏳</span> : <Wand2 className="w-4 h-4" />}</Button>
                <Button size="icon" variant="ghost" onClick={() => handleCorregirTodo(i)} disabled={corrigiendoTodoIdx===i} aria-label="Corregir todo">{corrigiendoTodoIdx===i ? <span className="animate-spin">⏳</span> : <Wand2 className="w-4 h-4 text-blue-500" />}</Button>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveCriterion(i)} aria-label="Eliminar"><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-medium text-sm mb-1 flex items-center justify-between">Logros y escala de calificación:
                  <Button size="icon" variant="ghost" onClick={() => handleAddDescriptor(i)} aria-label="Agregar logro"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-col gap-1">
                  {c.descriptores.map((d, j) => (
                    <div key={j} className="flex items-center gap-1 mb-1">
                      <Textarea
                        className="resize-y min-h-[36px] flex-1"
                        value={d}
                        onChange={e => handleEditDescriptor(i, j, e.target.value)}
                        rows={1}
                        style={{overflow: 'hidden'}}
                        onInput={e => {
                          const ta = e.target as HTMLTextAreaElement;
                          ta.style.height = 'auto';
                          ta.style.height = ta.scrollHeight + 'px';
                        }}
                      />
                      <Input
                        className="flex-1"
                        value={c.escala[j] || ''}
                        onChange={e => handleEditScale(i, j, e.target.value)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleMoveDescriptor(i, j, 'up')} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleMoveDescriptor(i, j, 'down')} aria-label="Bajar"><ArrowDown className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveDescriptor(i, j)} aria-label="Eliminar logro"><Minus className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-2">
            <div className="font-medium text-sm mb-1">Observaciones (opcional):</div>
            <Textarea
              value={editRubric.observaciones || ''}
              onChange={e => setEditRubric({ ...editRubric, observaciones: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}