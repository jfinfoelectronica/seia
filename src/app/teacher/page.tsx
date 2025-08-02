import Link from 'next/link';
import { getTeacherDashboardStats } from "./actions";
import { FileText, Calendar, PlusCircle, ArrowRight, Settings, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default async function TeacherDashboard() {
  const stats = await getTeacherDashboardStats();

  const usagePercentage = stats.evaluationLimit > 0 ? (stats.evaluationCount / stats.evaluationLimit) * 100 : 0;

  const quickLinks = [
    {
      href: "/teacher/evaluations",
      icon: <PlusCircle className="h-6 w-6 text-primary" />,
      title: "Gestionar Evaluaciones",
      description: "Crea, edita e importa tus evaluaciones."
    },
    {
      href: "/teacher/schedules",
      icon: <Clock className="h-6 w-6 text-green-500" />,
      title: "Gestionar Horarios",
      description: "Agenda y supervisa las presentaciones."
    },
    {
      href: "/teacher/settings",
      icon: <Settings className="h-6 w-6 text-purple-500" />,
      title: "Ajustes de Cuenta",
      description: "Configura tu clave de API y tus datos."
    }
  ];

  return (
    <div className="min-h-full space-y-12">
      {/* Sección de Bienvenida */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-background p-8 border">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom mask-image-radial-fade"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight glow-effect">
            ¡Bienvenido de nuevo, {stats.firstName}!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Este es tu centro de control. Desde aquí puedes crear evaluaciones, agendar presentaciones y gestionar tu cuenta de forma sencilla.
          </p>
        </div>
      </section>

      {/* Tarjetas de Estadísticas */}
      <section>
        <h2 className="text-3xl font-semibold mb-6 tracking-tight">Tu Actividad</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-muted-foreground">Uso de Evaluaciones</h3>
                <span className="text-4xl font-bold">{stats.evaluationCount}</span>
                <span className="text-2xl text-muted-foreground"> / {stats.evaluationLimit}</span>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Has utilizado {stats.evaluationCount} de tu límite de {stats.evaluationLimit} evaluaciones.
            </p>
            <Progress value={usagePercentage} className="mt-4 h-2" />
          </div>

          <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-muted-foreground">Horarios Activos</h3>
                <span className="text-4xl font-bold">{stats.activeSchedules}</span>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Presentaciones que están actualmente en curso o pendientes de finalizar.
            </p>
          </div>
        </div>
      </section>

      {/* Accesos Rápidos */}
      <section>
        <h2 className="text-3xl font-semibold mb-6 tracking-tight">Accesos Rápidos</h2>
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