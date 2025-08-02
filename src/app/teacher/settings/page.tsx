import { getCurrentUser, updateTeacherProfile, updateTeacherApiKey } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ChangePasswordForm from './change-password-form';

export default async function TeacherSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Usuario no encontrado.</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Formulario de Perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateTeacherProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" name="firstName" defaultValue={user.firstName || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" name="lastName" defaultValue={user.lastName || ''} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="identification">Identificación</Label>
                <Input id="identification" name="identification" defaultValue={user.identification || ''} />
            </div>
            <Button type="submit">Actualizar Perfil</Button>
          </form>
        </CardContent>
      </Card>
      
      <Separator />

      {/* Formulario de API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de API Key de Gemini</CardTitle>
          <CardDescription>
            Puedes usar la clave global de la plataforma o proporcionar tu propia clave si el administrador te lo permite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateTeacherApiKey} className="space-y-4">
            {user.useGlobalApiKey && (
                <p className="text-sm text-muted-foreground">
                    El administrador debe permitirle usar una clave personal para poder configurarla aquí.
                </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="gemini-api-key">Tu API Key de Gemini</Label>
              <Input
                id="gemini-api-key"
                name="geminiApiKey"
                type="password"
                defaultValue={user.geminiApiKey || ''}
                placeholder="Ingresa tu clave si tienes permiso"
                disabled={user.useGlobalApiKey}
              />
            </div>
            <Button type="submit" disabled={user.useGlobalApiKey}>Guardar Configuración de API</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Formulario de Cambio de Contraseña */}
      <ChangePasswordForm />
    </div>
  );
}