import { auth } from "@/auth";
import Link from 'next/link';
import { getSystemActivityStats } from "./reports/actions";
import { Users, FileText, Calendar, Send, ArrowRight, BarChart3, Settings } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();
  const stats = await getSystemActivityStats();

  const metrics = [
    {
      label: "Usuarios Totales",
      value: stats.totalUsers,
      icon: <Users className="h-8 w-8 text-blue-500" />,
      description: "Suma de administradores y profesores."
    },
    {
      label: "Evaluaciones Creadas",
      value: stats.totalEvaluations,
      icon: <FileText className="h-8 w-8 text-green-500" />,
      description: "Total de evaluaciones en el sistema."
    },
    {
      label: "Agendamientos Totales",
      value: stats.totalSchedules,
      icon: <Calendar className="h-8 w-8 text-purple-500" />,
      description: "Presentaciones de evaluaciones."
    },
    {
      label: "Envíos de Estudiantes",
      value: stats.totalSubmissions,
      icon: <Send className="h-8 w-8 text-yellow-500" />,
      description: "Total de respuestas recibidas."
    },
  ];

  const quickLinks = [
    {
      href: "/admin/users",
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Gestionar Usuarios",
      description: "Administra roles, permisos y límites."
    },
    {
      href: "/admin/reports",
      icon: <BarChart3 className="h-6 w-6 text-green-500" />,
      title: "Ver Reportes",
      description: "Analiza el uso y la integridad del sistema."
    },
    {
      href: "/admin/settings",
      icon: <Settings className="h-6 w-6 text-purple-500" />,
      title: "Configuración Global",
      description: "Establece la clave de API global."
    }
  ];


  return (
    <div className="min-h-full space-y-12">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-background p-8 border">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom mask-image-radial-fade"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight glow-effect">
            Panel de Administración
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Bienvenido, {session?.user?.name}. Monitorea la actividad global y gestiona la plataforma.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 tracking-tight">Métricas Globales del Sistema</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-muted-foreground">{metric.label}</h3>
                  <span className="text-4xl font-bold">{metric.value}</span>
                </div>
                <div className="transition-transform group-hover:scale-110">{metric.icon}</div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{metric.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-3xl font-semibold mb-6 tracking-tight">Gestión del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((link) => (
            <Link href={link.href} key={link.title}>
              <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:border-primary/50">
                 <div className="flex items-center justify-center w-12 h-12 bg-background rounded-lg border mb-4 group-hover:bg-muted transition-colors duration-300">
                    {link.icon}
                  </div>
                <h3 className="text-xl font-bold mb-2">{link.title}</h3>
                <p className="text-muted-foreground mb-4">{link.description}</p>
                 <div className="flex items-center text-sm font-semibold text-primary">
                    Ir ahora <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}