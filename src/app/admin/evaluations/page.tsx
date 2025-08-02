import { getEvaluations, getTeachers } from "./actions";
import { Suspense } from "react";
import { EvaluationsPanel } from "./components/EvaluationsPanel";

interface RawTeacher {
  id: string | number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default async function Page() {
  const teachersRaw: RawTeacher[] = await getTeachers();
  const teachers = teachersRaw.map((t) => ({
    ...t,
    id: String(t.id),
    name: `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim(),
  }));
  const evaluations = await getEvaluations();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Evaluaciones</h1>
      <p className="mb-6 text-muted-foreground">
        Aquí puedes ver todas las evaluaciones del sistema y filtrarlas por docente.
      </p>
      <Suspense fallback={<div>Cargando evaluaciones...</div>}>
        <EvaluationsPanel evaluations={evaluations} teachers={teachers} />
      </Suspense>
    </div>
  );
} 