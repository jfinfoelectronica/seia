export const dynamic = "force-dynamic";
import { getAreas, getUsers } from "./actions";
import { Suspense } from "react";
import { UserManagementPanel } from "./UserManagementPanel";

export default async function Page() {
  const areasResult = getAreas();
  const usersResult = getUsers();

  const [areas, { users, error }] = await Promise.all([areasResult, usersResult]);

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <Suspense fallback={<div>Cargando usuarios...</div>}>
        <UserManagementPanel users={users} areas={areas || []} />
      </Suspense>
    </div>
  );
}
 