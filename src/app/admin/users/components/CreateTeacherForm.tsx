'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { createTeacher } from '../actions';
import { type Area } from '@prisma/client';
import { useToast } from '@/components/ui/use-toast';

interface CreateTeacherFormProps {
  areas: Area[];
  onSuccess?: () => void;
}

export function CreateTeacherForm({ areas, onSuccess }: CreateTeacherFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    identification: '',
    areaId: 'none',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createTeacher({
        ...formData,
        areaId: formData.areaId !== 'none' ? parseInt(formData.areaId) : null,
      });

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message || 'Profesor creado exitosamente',
        });
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          identification: '',
          areaId: 'none',
        });
        setIsOpen(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Error al crear el profesor',
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: 'Error inesperado al crear el profesor',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="mb-6">
        <Plus className="w-4 h-4 mr-2" />
        Crear Nuevo Profesor
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Crear Nuevo Profesor</CardTitle>
        <CardDescription>
          Complete los datos para crear una nueva cuenta de profesor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identification">Identificación *</Label>
            <Input
              id="identification"
              value={formData.identification}
              onChange={(e) => setFormData(prev => ({ ...prev, identification: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={generatePassword}>
                Generar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Área</Label>
            <Select value={formData.areaId} onValueChange={(value) => setFormData(prev => ({ ...prev, areaId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar área (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin área asignada</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Profesor'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}