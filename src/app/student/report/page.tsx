'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import { Award, ThumbsUp, Smile, Frown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function ReportContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Estudiante'
  const grade = searchParams.get('grade') || 'N/A'
  const date = searchParams.get('date') || new Date().toLocaleString()
  const evaluation = searchParams.get('evaluation') || 'Evaluación'

  // Mensaje personalizado según la nota
  let message = '¡Gracias por completar tu evaluación!';
  let icon = <Smile className="h-12 w-12 text-primary" />;
  let badgeColor: 'default' | 'secondary' | 'destructive' = 'default';
  if (grade !== 'N/A') {
    const gradeNum = parseFloat(grade);
    if (gradeNum >= 4.0) {
      message = '¡Excelente desempeño!';
      icon = <Award className="h-12 w-12 text-green-500" />;
      badgeColor = 'default';
    } else if (gradeNum >= 3.0) {
      message = '¡Buen trabajo! Puedes seguir mejorando.';
      icon = <ThumbsUp className="h-12 w-12 text-yellow-500" />;
      badgeColor = 'secondary';
    } else {
      message = 'No te desanimes, cada intento es una oportunidad para aprender.';
      icon = <Frown className="h-12 w-12 text-destructive" />;
      badgeColor = 'destructive';
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border mx-auto animate-fade-in">
        <CardHeader className="flex flex-col items-center gap-2 pb-2">
          {icon}
          <CardTitle className="text-center text-xl font-bold">{message}</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {evaluation} &bull; {date}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-0">
          <div className="flex flex-col items-center gap-1">
            <span className="text-base text-muted-foreground">Estudiante</span>
            <span className="font-semibold text-lg text-primary">{name}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-base text-muted-foreground">Nota</span>
            <Badge variant={badgeColor} className="text-lg px-4 py-1 rounded-full font-bold">
              {grade !== 'N/A' ? `${grade} / 5.0` : 'Sin calificar'}
            </Badge>
          </div>
          <div className="mt-2 text-center text-sm text-muted-foreground max-w-md">
            Recuerda: cada evaluación es una oportunidad para crecer y aprender. ¡Sigue esforzándote!
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 pb-6">
          <Button className="w-full max-w-xs" onClick={() => window.location.href = '/student'}>
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  )
} 