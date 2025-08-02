import { getGlobalSettings, updateGlobalApiKey } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default async function SettingsPage() {
  const settings = await getGlobalSettings();

  // Se crea un Server Action específico para el formulario
  const updateSettingsAction = async (formData: FormData) => {
    'use server';
    const apiKey = formData.get('geminiApiKey') as string;
    await updateGlobalApiKey(apiKey);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de API Keys</CardTitle>
          <CardDescription>
            Gestiona las claves de API para los servicios de IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-api-key">API Key Global de Gemini</Label>
              <p className="text-sm text-muted-foreground">
                Esta clave se usará por defecto para todos los usuarios, a menos que un usuario especifique su propia clave.
              </p>
              <Input
                id="gemini-api-key"
                name="geminiApiKey"
                type="password"
                defaultValue={settings?.geminiApiKey || ''}
                placeholder="Ingresa la API Key de Gemini"
              />
            </div>
            <Button type="submit">Guardar Cambios</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 