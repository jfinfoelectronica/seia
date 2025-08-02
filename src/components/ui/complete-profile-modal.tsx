'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateCurrentUserProfile } from '@/app/admin/users/actions';
import { type User } from '@prisma/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompleteProfileModalProps {
  user: User;
}

export function CompleteProfileModal({ user }: CompleteProfileModalProps) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [identification, setIdentification] = useState(user.identification || '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateCurrentUserProfile({
        firstName,
        lastName,
        identification
      });

      if (!result.success) {
        setError(result.error || 'Ocurrió un error inesperado.');
      }
      // Al tener éxito, el layout padre se recargará y este componente se desmontará.
    });
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">¡Bienvenido a SEIA!</DialogTitle>
          <DialogDescription>
            Para poder continuar, es necesario que completes tu perfil. Esta información es obligatoria para el uso de la plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">Nombre</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">Apellidos</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="identification" className="text-right">Identificación</Label>
            <Input id="identification" value={identification} onChange={(e) => setIdentification(e.target.value)} className="col-span-3" />
          </div>
        </div>
        {error && 
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        }
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? 'Guardando...' : 'Guardar y Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}