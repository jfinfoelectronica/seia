import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario administrador por defecto
  const adminEmail = 'admin@seiac.com';
  const adminPassword = 'admin123'; // Cambiar por una contraseña segura

  // Crear usuario profesor por defecto
  const teacherEmail = 'jfinfotest@gmail.com';
  const teacherPassword = '1234567890'; // Cambiar por una contraseña segura

  // Verificar si el usuario admin ya existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  // Verificar si el usuario profesor ya existe
  const existingTeacher = await prisma.user.findUnique({
    where: { email: teacherEmail }
  });

  // Hash de las contraseñas
  const hashedAdminPassword = await hash(adminPassword, 12);
  const hashedTeacherPassword = await hash(teacherPassword, 12);

  // Crear el usuario administrador si no existe
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        hashedPassword: hashedAdminPassword,
        role: 'ADMIN',
        firstName: 'Administrador',
        lastName: 'Sistema',
        name: 'Administrador Sistema',
        useGlobalApiKey: false,
        evaluationLimit: 999,
      }
    });

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Contraseña: ${adminPassword}`);
    console.log(`👤 Rol: ${admin.role}`);
  } else {
    console.log('✅ El usuario administrador ya existe');
  }

  // Crear el usuario profesor si no existe
  if (!existingTeacher) {
    const teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        hashedPassword: hashedTeacherPassword,
        role: 'TEACHER',
        firstName: 'Profesor',
        lastName: 'Demo',
        name: 'Profesor Demo',
        useGlobalApiKey: false,
        evaluationLimit: 5,
      }
    });

    console.log('✅ Usuario profesor creado exitosamente:');
    console.log(`📧 Email: ${teacher.email}`);
    console.log(`🔑 Contraseña: ${teacherPassword}`);
    console.log(`👤 Rol: ${teacher.role}`);
  } else {
    console.log('✅ El usuario profesor ya existe');
  }

  // Crear un área por defecto si no existe
  const existingArea = await prisma.area.findFirst({
    where: { name: 'Administración' }
  });

  let defaultArea;
  if (!existingArea) {
    defaultArea = await prisma.area.create({
      data: {
        name: 'Administración'
      }
    });
    console.log(`📁 Área por defecto creada: ${defaultArea.name}`);
  } else {
    defaultArea = existingArea;
    console.log(`📁 Área por defecto ya existe: ${defaultArea.name}`);
  }

  // Asignar el área al administrador si no la tiene
  if (!existingAdmin || !existingAdmin.areaId) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin && !admin.areaId) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { areaId: defaultArea.id }
      });
    }
  }

  // Asignar el área al profesor si no la tiene
  if (!existingTeacher || !existingTeacher.areaId) {
    const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
    if (teacher && !teacher.areaId) {
      await prisma.user.update({
        where: { id: teacher.id },
        data: { areaId: defaultArea.id }
      });
    }
  }

  console.log('');
  console.log('🚨 IMPORTANTE: Cambia las contraseñas después del primer inicio de sesión');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });