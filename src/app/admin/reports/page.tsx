import { getSystemActivityStats, getTeacherActivityStats, getFraudReportStats, getApiKeyConfigStats, getEvaluationPerformanceStats, getMostDifficultQuestions } from "./actions";
import { Users, FileText, Calendar, Send, Clock, KeyRound, CheckCircle, UserCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DifficultQuestionsTable } from "./DifficultQuestionsTable";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0 && remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export default async function ReportsPage() {
  const [stats, teacherStats, fraudStats, apiKeyStats, evalStats, difficultQuestions] = await Promise.all([
    getSystemActivityStats(),
    getTeacherActivityStats(),
    getFraudReportStats(),
    getApiKeyConfigStats(),
    getEvaluationPerformanceStats(),
    getMostDifficultQuestions(),
  ]);

  const metrics = [
    {
      icon: <Users className="h-8 w-8 text-blue-500" />,
      label: "Usuarios Totales",
      value: stats.totalUsers,
      description: "Número total de administradores y profesores en el sistema.",
    },
    {
      icon: <FileText className="h-8 w-8 text-green-500" />,
      label: "Evaluaciones Creadas",
      value: stats.totalEvaluations,
      description: "Cantidad total de evaluaciones diseñadas por los profesores.",
    },
    {
      icon: <Calendar className="h-8 w-8 text-purple-500" />,
      label: "Agendamientos Totales",
      value: stats.totalSchedules,
      description: "Número de presentaciones o instancias de evaluación agendadas.",
    },
    {
      icon: <Send className="h-8 w-8 text-yellow-500" />,
      label: "Envíos de Estudiantes",
      value: stats.totalSubmissions,
      description: "Total de evaluaciones completadas y enviadas por estudiantes.",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes del Sistema</h1>
        <p className="mt-2 text-muted-foreground">
          Una visión general de la actividad y el uso de la plataforma.
        </p>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-2xl font-semibold">Uso y Actividad del Sistema</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight">{metric.label}</h3>
                {metric.icon}
              </div>
              <div className="p-6 pt-0">
                <div className="text-4xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-2xl font-semibold">Actividad de Profesores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reporte del número de evaluaciones creadas por cada profesor y su límite asignado.
        </p>
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Uso de Evaluaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherStats.length > 0 ? (
                teacherStats.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{`${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Nombre no disponible'}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                    <TableCell className="text-center font-mono">
                      {teacher.evaluationCount} / {teacher.evaluationLimit}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay profesores activos para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-2xl font-semibold">Reporte de Integridad Académica</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Incidentes de posible fraude o comportamiento anómalo durante las evaluaciones (últimos 100).
        </p>
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Evaluación</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fraudStats.length > 0 ? (
                fraudStats.map((stat) => (
                  <TableRow key={stat.submissionId}>
                    <TableCell className="font-medium">{stat.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{stat.evaluationTitle}</TableCell>
                    <TableCell>{format(new Date(stat.attemptDate), "d MMM, yyyy", { locale: es })}</TableCell>
                    <TableCell className="text-center space-x-2">
                      {stat.timeOutsideEval > 0 && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(stat.timeOutsideEval)} fuera
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No se han registrado incidentes de fraude.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-2xl font-semibold">Configuración de API Keys</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de la configuración de las claves de API de Gemini en el sistema.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight">API Key Global</h3>
              <KeyRound className={`h-8 w-8 ${apiKeyStats.isGlobalKeySet ? 'text-green-500' : 'text-destructive'}`} />
            </div>
            <div className="p-6 pt-0">
              <div className="text-4xl font-bold">{apiKeyStats.isGlobalKeySet ? 'Activa' : 'No Asignada'}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Clave de API principal del sistema.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight">Profesores con Permiso</h3>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-4xl font-bold">{apiKeyStats.teachersWithPermission} <span className="text-xl text-muted-foreground">/ {apiKeyStats.totalTeachers}</span></div>
              <p className="text-xs text-muted-foreground mt-2">
                Profesores autorizados para usar su clave personal.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight">Profesores con Clave Personal</h3>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-4xl font-bold">{apiKeyStats.teachersWithPersonalKey} <span className="text-xl text-muted-foreground">/ {apiKeyStats.teachersWithPermission}</span></div>
              <p className="text-xs text-muted-foreground mt-2">
                Profesores con permiso que han configurado su clave.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border-t pt-6">
          <h2 className="text-2xl font-semibold">Rendimiento por Evaluación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clasificación de evaluaciones por su puntaje promedio general.
          </p>
          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluación</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="text-right">Puntaje Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evalStats.length > 0 ? (
                  evalStats.map((stat) => (
                    <TableRow key={stat.evaluationId}>
                      <TableCell className="font-medium">{stat.evaluationTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{stat.authorName}</TableCell>
                      <TableCell className="text-right font-mono">{stat.averageScore.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay datos de rendimiento para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-2xl font-semibold">Top 10 Preguntas Más Difíciles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preguntas con el puntaje promedio más bajo en todo el sistema.
          </p>
          <DifficultQuestionsTable questions={difficultQuestions} />
        </div>
      </div>
    </div>
  );
}