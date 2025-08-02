"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { EvaluationTableRow } from '../types';

interface EvaluationsTableProps {
  evaluations: EvaluationTableRow[];
  teachers: Array<{
    id: number | string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    name?: string;
  }>;
  onQuestions: (id: number) => void;
  onExport: (id: number) => void;
}

export function EvaluationsTable({ evaluations, teachers, onQuestions, onExport }: EvaluationsTableProps) {
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationTableRow[]>(evaluations);
  const [viewEval, setViewEval] = useState<EvaluationTableRow | null>(null);

  useEffect(() => {
    if (!filterTeacher || filterTeacher === "all") setFilteredEvaluations(evaluations);
    else setFilteredEvaluations(evaluations.filter(ev => String(ev.authorId) === filterTeacher));
  }, [filterTeacher, evaluations]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <label>Filtrar por docente:</label>
        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {teachers.map(t => (
              <SelectItem key={t.id} value={String(t.id)}>
                {(t.firstName ?? "")} {(t.lastName ?? "")} ({t.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <table className="w-full border text-sm min-w-[900px]">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Título</th>
            <th className="p-2 text-left">Docente</th>
            <th className="p-2 text-left">Área</th>
            <th className="p-2 text-center">Intentos</th>
            <th className="p-2 text-center">Fecha</th>
            <th className="p-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvaluations.map(ev => (
            <tr key={ev.id} className="border-b">
              <td className="p-2 font-medium">{ev.title}</td>
              <td className="p-2">{(ev.author?.firstName ?? "")} {(ev.author?.lastName ?? "")}</td>
              <td className="p-2">{ev.author.area?.name || "Sin área"}</td>
              <td className="p-2 text-center">{ev._count?.attempts ?? 0}</td>
              <td className="p-2 text-center">{new Date(ev.createdAt).toLocaleDateString()}</td>
              <td className="p-2 text-right">
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setViewEval(ev)}>Ver</Button>
                  <Button size="sm" variant="secondary" onClick={() => onQuestions(ev.id)}>Preguntas</Button>
                  <Button size="sm" variant="outline" onClick={() => onExport(ev.id)}>Exportar</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal de detalles de evaluación */}
      <Dialog open={!!viewEval} onOpenChange={() => setViewEval(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Detalles de la evaluación</DialogTitle>
          </DialogHeader>
          {viewEval && (
            <div className="space-y-2">
              <div><b>Título:</b> {viewEval.title}</div>
              <div><b>Docente:</b> {(viewEval.author?.firstName ?? "")} {(viewEval.author?.lastName ?? "")} ({viewEval.author?.email})</div>
              <div><b>Área:</b> {viewEval.author.area?.name || "Sin área"}</div>
              <div><b>Fecha de creación:</b> {new Date(viewEval.createdAt).toLocaleDateString()}</div>
              <div><b>Intentos:</b> {viewEval._count?.attempts ?? 0}</div>
              <div><b>Descripción:</b> {viewEval.description || <span className="text-muted-foreground">Sin descripción</span>}</div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}