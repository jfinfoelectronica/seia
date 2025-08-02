'use client';

import { useState } from 'react';
import { UserTable } from './components/UserTable';
import { CreateTeacherForm } from './components/CreateTeacherForm';
import { Input } from '@/components/ui/input';
import { type DisplayUser as User } from './actions';
import { type Area } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface UserManagementPanelProps {
  users: User[];
  areas: Area[];
}

export function UserManagementPanel({ users, areas }: UserManagementPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const lowercasedFilter = searchTerm.toLowerCase();
  
  const filteredUsers = users.filter(user => {
    return (
      user.firstName?.toLowerCase().includes(lowercasedFilter) ||
      user.lastName?.toLowerCase().includes(lowercasedFilter) ||
      user.email?.toLowerCase().includes(lowercasedFilter) ||
      user.identification?.toLowerCase().includes(lowercasedFilter)
    );
  });

  const admins = filteredUsers.filter(user => user.role === 'ADMIN');
  const teachers = filteredUsers.filter(user => user.role === 'TEACHER');

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Aquí puedes crear y gestionar los usuarios del sistema. Los profesores pueden ser creados directamente desde esta interfaz.
      </p>

      <CreateTeacherForm areas={areas} onSuccess={handleRefresh} />

      <Input
        placeholder="Filtrar por nombre, apellido, email o identificación..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm mb-6"
      />

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Administradores</h2>
          <UserTable users={admins} areas={areas} />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Profesores</h2>
          <UserTable users={teachers} areas={areas} />
        </div>
      </div>
    </div>
  );
}