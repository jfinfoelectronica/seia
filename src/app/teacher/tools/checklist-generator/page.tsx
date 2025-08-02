"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateChecklistWithGemini } from "@/lib/gemini-checklist-generator";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: import("jspdf-autotable").UserOptions) => void;
  }
}

export default function ChecklistTool() {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function handleItemChange(idx: number, value: string) {
    setItems(items => items.map((item, i) => (i === idx ? value : item)));
  }

  function handleAddItem() {
    setItems(items => [...items, ""]);
  }

  function handleRemoveItem(idx: number) {
    setItems(items => items.filter((_, i) => i !== idx));
  }

  // Utilidad para parsear criterios de texto plano (no markdown)
  function parseCriteriosFromText(text: string): string[] {
    // Busca líneas numeradas o con viñetas
    return text.split(/\n|\r/)
      .map(l => l.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").replace(/^\[ ?\]/, "").trim())
      .filter(l => l && !/^Criterios/i.test(l));
  }

  // Extrae título, descripción y criterios de un texto Gemini (sin markdown)
  function parseChecklistFull(text: string): { title: string, description: string, criterios: string[] } {
    let title = "";
    let description = "";
    let criterios: string[] = [];
    // Busca título y descripción por patrones comunes
    const titleMatch = text.match(/(?:Título|Title)\s*[:：]?\s*(.+)/i);
    if (titleMatch) title = titleMatch[1].trim();
    // Busca descripción entre 'Descripción:' y 'Criterios:' o fin de texto
    const descMatch = text.match(/(?:Descripción|Description)\s*[:：]?\s*([\s\S]+?)(?:\n\s*(?:Criterios|Criteria)\s*:|$)/i);
    if (descMatch) description = descMatch[1].trim();
    // Busca criterios después de 'Criterios:' o 'Criteria:'
    const critMatch = text.match(/(?:Criterios|Criteria)\s*[:：]?\s*([\s\S]*)/i);
    if (critMatch) {
      criterios = critMatch[1]
        .split(/\n|\r/)
        .map(l => l.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").replace(/^[\[\(] ?[\]]?\)?/, "").trim())
        .filter(l => l.length > 0);
    }
    // Fallback: si no se detecta nada, usar todo el texto como criterio
    if (!criterios.length) criterios = parseCriteriosFromText(text);
    return { title, description, criterios };
  }

  async function handleGenerateAI() {
    setAiError(null);
    setAiLoading(true);
    try {
      const checklist = await generateChecklistWithGemini({
        instructions: aiInstructions || `${title}. ${description} Criterios: ${items.filter(Boolean).join(", ")}`,
        language: "es"
      });
      const parsed = parseChecklistFull(checklist);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.criterios.length > 0) setItems(parsed.criterios);
    } catch (err) {
      if (err instanceof Error) {
        setAiError(err.message || "Error generando la lista con IA");
      } else {
        setAiError("Error generando la lista con IA");
      }
    } finally {
      setAiLoading(false);
    }
  }

  function handleMoveItem(idx: number, dir: -1 | 1) {
    setItems(items => moveItem(items, idx, idx + dir));
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(12);
    doc.text(description, 14, 28);
    autoTable(doc, {
      startY: 36,
      head: [["#", "Criterio", "Logrado (Sí/No)", "Observaciones"]],
      body: items.filter(Boolean).map((c, i) => [i + 1, c, "", ""]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
    doc.save("lista-chequeo.pdf");
  }

  function handleExportExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["#", "Criterio", "Logrado (Sí/No)", "Observaciones"],
      ...items.filter(Boolean).map((c, i) => [i + 1, c, "", ""])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Chequeo");
    XLSX.writeFile(wb, "lista-chequeo.xlsx");
  }

  function handleExportProject() {
    const projectData = {
      title,
      description,
      items,
      aiInstructions
    };
    const data = JSON.stringify(projectData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'checklist-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const projectData = JSON.parse(ev.target?.result as string);
        if (projectData.title) setTitle(projectData.title);
        if (projectData.description) setDescription(projectData.description);
        if (projectData.items) setItems(projectData.items);
        if (projectData.aiInstructions) setAiInstructions(projectData.aiInstructions);
      } catch (err) {
        console.error("Error importing project:", err);
        // Optionally, show an error message to the user
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function moveItem<T>(arr: T[], from: number, to: number): T[] {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  }

  return (
    <div className="w-full max-w-full px-0 md:px-0 py-8 mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">📝 Generador de Lista de Chequeo</h1>
        <div className="flex flex-row gap-2 mt-2 md:mt-0 items-center">
          <label className="inline-block">
            <input type="file" accept="application/json" className="hidden" onChange={handleImportProject} />
            <Button variant="outline" size="sm" asChild><span>Importar proyecto</span></Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExportProject}>Exportar proyecto</Button>
        </div>
      </div>
      <div className="mb-6 p-4 border rounded bg-background/80">
        <label className="block font-medium mb-1">Instrucciones para IA</label>
        <Textarea value={aiInstructions} onChange={e => setAiInstructions(e.target.value)} placeholder="Describe aquí el objetivo, nivel, criterios, etc. para que Gemini genere la lista automáticamente..." rows={2} />
        <Button type="button" className="mt-2 w-full" onClick={handleGenerateAI} disabled={aiLoading || !aiInstructions.trim()}>
          {aiLoading ? "Generando..." : "Generar automáticamente con IA"}
        </Button>
        {aiError && <div className="text-red-500 text-sm mt-1">{aiError}</div>}
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Título</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Observación de participación en clase" />
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Descripción (opcional)</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve explicación del propósito de la lista..." rows={2} />
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Criterios a evaluar</label>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <Input value={item} onChange={e => handleItemChange(idx, e.target.value)} placeholder={`Criterio ${idx + 1}`} />
            {items.length > 1 && (
              <Button type="button" variant="destructive" onClick={() => handleRemoveItem(idx)}>-</Button>
            )}
            <Button type="button" variant="outline" onClick={() => handleMoveItem(idx, -1)} disabled={idx === 0}>↑</Button>
            <Button type="button" variant="outline" onClick={() => handleMoveItem(idx, 1)} disabled={idx === items.length - 1}>↓</Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={handleAddItem}>+ Añadir criterio</Button>
      </div>
      <div className="flex gap-2 mt-6">
        <Button type="button" variant="outline" onClick={handleExportPDF}>Exportar a PDF</Button>
        <Button type="button" variant="outline" onClick={handleExportExcel}>Exportar a Excel</Button>
      </div>
    </div>
  );
}
