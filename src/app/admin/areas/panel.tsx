"use client";
import { useState, useTransition } from 'react';
import { createArea, updateArea, deleteArea } from './actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogClose } from '@/components/ui/dialog';

export default function AreaPanel({ areas }: { areas: { id: number, name: string }[] }) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async () => {
    setError('');
    startTransition(async () => {
      const res = await createArea(name);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  };

  const handleEdit = async () => {
    if (!editId) return;
    setError('');
    startTransition(async () => {
      const res = await updateArea(editId, editName);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setError('');
    setOpenDelete(false);
    startTransition(async () => {
      const res = await deleteArea(deleteId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Áreas</h1>
      <div className="mb-4 flex gap-2">
        <input
          className="border rounded px-2 py-1 bg-background text-foreground"
          placeholder="Nueva área"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isPending}
        />
        <Button onClick={handleCreate} disabled={isPending || !name.trim()}>Crear</Button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="divide-y border rounded-lg bg-card">
        {areas.map(area => (
          <li key={area.id} className="flex items-center justify-between px-4 py-2">
            <span>{area.name}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditId(area.id); setEditName(area.name); setOpenEdit(true); }}>Editar</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteId(area.id); setOpenDelete(true); }}>Eliminar</Button>
            </div>
          </li>
        ))}
      </ul>
      {/* Modal editar */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Editar área</DialogTitle>
          </DialogHeader>
          <input
            className="w-full border rounded px-2 py-1 bg-background text-foreground mb-4"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            disabled={isPending}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" onClick={() => setOpenEdit(false)} disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button variant="default" onClick={handleEdit} disabled={isPending || !editName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal eliminar */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>¿Eliminar área?</DialogTitle>
          </DialogHeader>
          <p className="mb-4">No podrás eliminar un área si tiene profesores asociados. ¿Deseas continuar?</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" onClick={() => setOpenDelete(false)} disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 