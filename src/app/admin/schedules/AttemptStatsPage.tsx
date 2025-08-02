'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { BarChart3, Users, Clock, Award, ArrowLeft } from 'lucide-react';

interface Submission {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  score: number | null;
  submittedAt: string | null;
  timeOutsideEval: number;
}

type SubmissionData = Omit<Submission, 'submittedAt'> & { submittedAt: Date | null };

interface Attempt {
  id: number;
  evaluationId: number;
  uniqueCode: string;
  startTime: Date;
  endTime: Date;
  maxSubmissions?: number | null;
  evaluation?: {
    title: string;
  };
  _count: {
    submissions: number;
  };
}

interface AttemptStatsPageProps {
  attempt: Attempt;
  onBack: () => void;
}

export function AttemptStatsPage({ attempt, onBack }: AttemptStatsPageProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const { getSubmissionsByAttempt } = await import('./actions');
      const submissionsData = await getSubmissionsByAttempt(attempt.id);
      const transformedSubmissions: Submission[] = submissionsData.map((sub: SubmissionData) => ({
        ...sub,
        submittedAt: sub.submittedAt?.toISOString() || null,
      }));
      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [attempt.id]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Calcular estadísticas
  const totalSubmissions = submissions.length;
  const averageScore = submissions.filter(s => s.score !== null).length > 0 
    ? submissions.filter(s => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / submissions.filter(s => s.score !== null).length
    : 0;
  const totalTimeOutside = submissions.reduce((acc, s) => acc + s.timeOutsideEval, 0);

  // Datos para gráfico de barras de participantes
  const participantsData = submissions.map(sub => ({
    name: `${sub.firstName} ${sub.lastName}`,
    score: sub.score,
    submitted: sub.submittedAt ? 'Enviado' : 'Pendiente',
    timeOutsideEval: sub.timeOutsideEval, // Mantener en segundos para el gráfico
  }));

  // Datos para el gráfico combinado de líneas
  const maxTime = Math.max(...submissions.map(s => s.timeOutsideEval), 0) || 1;

  const combinedData = submissions.map(sub => ({
    name: `${sub.firstName} ${sub.lastName}`,
    score: sub.score,
    timeOutsideEval: sub.timeOutsideEval,
    score_norm: (sub.score || 0) / 5, // La calificación es de 0-5
    time_norm: sub.timeOutsideEval / maxTime,
  }));

  // Datos para gráfico de torta de calificaciones
  const gradeDistribution = [
    { name: 'Excelente (4.5-5.0)', value: submissions.filter(s => s.score !== null && (s.score || 0) >= 4.5).length, color: '#10b981' },
    { name: 'Muy Bueno (4.0-4.4)', value: submissions.filter(s => s.score !== null && (s.score || 0) >= 4.0 && (s.score || 0) < 4.5).length, color: '#3b82f6' },
    { name: 'Bueno (3.5-3.9)', value: submissions.filter(s => s.score !== null && (s.score || 0) >= 3.5 && (s.score || 0) < 4.0).length, color: '#f59e0b' },
    { name: 'Regular (3.0-3.4)', value: submissions.filter(s => s.score !== null && (s.score || 0) >= 3.0 && (s.score || 0) < 3.5).length, color: '#f97316' },
    { name: 'Insuficiente (0.0-2.9)', value: submissions.filter(s => s.score !== null && (s.score || 0) < 3.0).length, color: '#ef4444' },
    { name: 'Sin calificar', value: submissions.filter(s => s.score === null).length, color: '#6b7280' },
  ].filter(item => item.value > 0); // Solo mostrar categorías con datos

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Estadísticas - {attempt.evaluation?.title}
            </h1>
            <p className="text-muted-foreground">Código: {attempt.uniqueCode}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando estadísticas...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Envíos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{totalSubmissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio de Calificación</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{averageScore.toFixed(1)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Fuera de la Evaluación</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{totalTimeOutside} segundos</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de barras de participantes */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={participantsData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(str) => {
                    return str.split(' ').slice(0, 2).join(' ');
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    return value.value;
                  }}
                />
                <Legend />
                <Bar dataKey="score" fill="#8884d8" />
                <Bar dataKey="submitted" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico combinado de líneas */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value) => {
                    return value.split(' ').slice(0, 2).join(' ');
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    return value.value;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="timeOutsideEval" stroke="#ff7300" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de torta de calificaciones */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  labelFormatter={(value) => {
                    return value.name;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}