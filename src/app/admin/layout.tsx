import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CompleteProfileModal } from '@/components/ui/complete-profile-modal';
import { AdminPanel } from './admin-panel';

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const isProfileComplete = user?.firstName && user?.lastName && user?.identification;

  return (
    <>
      {user && !isProfileComplete ? (
        <CompleteProfileModal user={user} />
      ) : (
        <AdminPanel>{children}</AdminPanel>
      )}
    </>
  );
}