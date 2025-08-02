"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type DisplayUser, deleteUser, updateUserFull } from "../actions";
import { useTransition, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Area {
  id: number;
  name: string;
}

interface UserTableProps {
  users?: DisplayUser[];
  areas: Area[];
}

export function UserTable({ users = [], areas }: UserTableProps) {
  const [isPending, startTransition] = useTransition();
  const [editUser, setEditUser] = useState<DisplayUser | null>(null);
  const [editAreaId, setEditAreaId] = useState<string>('');
  const [editIdentification, setEditIdentification] = useState<string>("");
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [editUseGlobalApiKey, setEditUseGlobalApiKey] = useState<boolean>(true);
  const [editEvaluationLimit, setEditEvaluationLimit] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filteredUsers, setFilteredUsers] = useState<DisplayUser[]>(users);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filterArea || filterArea === "all") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => String(u.areaId) === filterArea));
    }
  }, [filterArea, users]);

  if (!Array.isArray(users)) {
    return <div className="text-red-500">Error: usuarios no válidos.</div>;
  }
  if (users.length === 0) {
    return <div className="text-muted-foreground p-4">No hay usuarios registrados.</div>;
  }

  const handleDelete = (userId: string) => {
    setDeleteUserId(userId);
    setOpenDelete(true);
  };

  const confirmDelete = () => {
    if (!deleteUserId) return;
    setOpenDelete(false);
    startTransition(() => {
      deleteUser(deleteUserId);
    });
    setDeleteUserId(null);
  };

  const openEditModal = (user: DisplayUser) => {
    setEditUser(user);
    setEditAreaId(user.areaId ? String(user.areaId) : 'none');
    setEditIdentification(user.identification || '');
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditUseGlobalApiKey(user.useGlobalApiKey);
    setEditEvaluationLimit(user.evaluationLimit);
    setOpen(true);
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditAreaId('none');
    setEditIdentification("");
    setEditFirstName("");
    setEditLastName("");
    setEditUseGlobalApiKey(true);
    setEditEvaluationLimit(5);
    setOpen(false);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setError(null);
    const data = await updateUserFull({
      id: String(editUser.id),
      firstName: editFirstName,
      lastName: editLastName,
      areaId: editUser.role === 'TEACHER' && editAreaId && editAreaId !== 'none' ? Number(editAreaId) : null,
      identification: editIdentification || null,
      useGlobalApiKey: editUser.role === 'TEACHER' ? editUseGlobalApiKey : undefined,
      evaluationLimit: editUser.role === 'TEACHER' ? editEvaluationLimit : undefined,
    });
    if (!data.success) {
      setError(data.error || 'Error al actualizar el usuario.');
      setSaving(false);
      return;
    }
    setSaving(false);
    closeEditModal();
    window.location.reload();
  };

  return (
    <div className="border rounded-lg w-full overflow-x-auto">
      <div className="flex items-center gap-2 p-4">
        <label className="font-medium">Filtrar por área:</label>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {areas.map(area => (
              <SelectItem key={String(area.id)} value={String(area.id)}>{area.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table className="w-full min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Apellido</TableHead>
            <TableHead>Identificación</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Fecha de Registro</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={String(user.id)}>
              <TableCell>{user.firstName || ''}</TableCell>
              <TableCell>{user.lastName || ''}</TableCell>
              <TableCell>{user.identification || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{user.email || ''}</TableCell>
              <TableCell>
                {areas.find(a => a.id === user.areaId)?.name || <span className="text-muted-foreground">Sin área</span>}
              </TableCell>
              <TableCell>
                {user.createdAt ? format(new Date(user.createdAt), "d 'de' MMMM, yyyy", { locale: es }) : ''}
              </TableCell>
              <TableCell className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => openEditModal(user)} disabled={isPending}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(String(user.id))} disabled={isPending} title="Eliminar usuario (solo base de datos local)">
                  {isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Modal de edición con shadcn/ui Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton onInteractOutside={closeEditModal}>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="mb-4 space-y-6">
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <div>
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Datos personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Nombre</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={editFirstName || ''}
                    onChange={e => setEditFirstName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Apellido</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={editLastName || ''}
                    onChange={e => setEditLastName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Identificación (opcional)</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={editIdentification || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setEditIdentification(val);
                    }}
                    disabled={saving}
                    placeholder="Solo números"
                    maxLength={32}
                  />
                </div>
              </div>
            </div>
            {editUser?.role === 'TEACHER' && (
              <>
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Datos institucionales</h3>
                  <label className="block mb-1 font-medium">Área</label>
                  <Select value={editAreaId || 'none'} onValueChange={setEditAreaId} disabled={saving}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin área</SelectItem>
                      {areas.map(area => (
                        <SelectItem key={String(area.id)} value={String(area.id)}>{area.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Configuración de API</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-global-api-key"
                      checked={!editUseGlobalApiKey}
                      onCheckedChange={(checked) => setEditUseGlobalApiKey(!checked)}
                      disabled={saving}
                    />
                    <Label htmlFor="use-global-api-key">Permitir API Key personal</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si está activado, el usuario podrá configurar su propia API Key. De lo contrario, usará la global.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Límites</h3>
                  <label className="block mb-1 font-medium">Límite de Evaluaciones</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={editEvaluationLimit}
                    onChange={e => setEditEvaluationLimit(Number(e.target.value))}
                    disabled={saving}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Número de evaluaciones que este profesor puede crear.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" onClick={closeEditModal} disabled={saving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de confirmación de eliminación */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent showCloseButton onInteractOutside={() => setOpenDelete(false)}>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
          </DialogHeader>
          <p className="mb-4">Esta acción eliminará el usuario solo de la base de datos local. ¿Deseas continuar?</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" onClick={() => setOpenDelete(false)} disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}