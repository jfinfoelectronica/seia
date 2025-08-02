'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PenTool } from 'lucide-react'
import { useStudentData } from './hooks/useStudentData'
import { useThemeManagement } from './hooks/useThemeManagement'


export default function StudentEntryPage() {
  const [uniqueCode, setUniqueCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  
  // Usar hooks para manejar datos del estudiante y tema
  const { saveStudentData, clearStudentData } = useStudentData()
  const { mounted, restoreTheme } = useThemeManagement()
  
  // Restaurar el tema seleccionado al cargar la página
  useEffect(() => {
    if (mounted) {
      restoreTheme()
    }
  }, [mounted, restoreTheme])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('') // Limpiar errores previos
    
    // Limpiar almacenamiento antes de iniciar nueva sesión
    clearStudentData()

    if (!uniqueCode.trim()) {
      setError('Por favor, ingresa el código de evaluación')
      return
    }

    // Validar datos del estudiante
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Por favor, completa todos los campos')
      return
    }

    setLoading(true)
    
    try {
      // Guardar los datos usando el hook
      const studentData = { email, firstName, lastName }
      saveStudentData(studentData)
      
      // Redirigir solo con el código en la URL
      router.push(`/student/evaluation?code=${uniqueCode}`);
    } catch (error) {
      console.error('Error al iniciar la evaluación:', error)
      setError('Error al iniciar la evaluación. Por favor, intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background overflow-hidden">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-center gap-2 glow-effect">
            <PenTool className="h-6 w-6 text-primary blur-effect" />
            <CardTitle className="text-2xl font-bold text-center">SEIA</CardTitle>
          </div>
          <CardDescription className="text-center">
            Ingresa el código de evaluación proporcionado por tu profesor y tus datos para comenzar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Código de Evaluación</Label>
              <Input
                id="code"
                placeholder="Ingresa el código de 8 caracteres"
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value)}
                maxLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ingresa tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                placeholder="Ingresa tu nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                placeholder="Ingresa tu apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Comenzar Evaluación'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
    </div>
  )
}