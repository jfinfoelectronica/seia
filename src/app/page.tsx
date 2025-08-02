"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import {  Book, PenTool, LineChart, Clock, ArrowRight, Shield,  Code, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { CardStack } from "@/components/ui/card-stack";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirigir usuarios autenticados a su panel correspondiente
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      if (session.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (session.user.role === 'TEACHER') {
        router.push('/teacher');
      }
    }
  }, [session, status, router]);

  const cards = [
    {
      id: 1,
      name: "Evaluaciones Personalizadas",
      designation: "Adaptadas a cada curso",
      content: (
        <div className="flex flex-col gap-2">
          <Book className="w-8 h-8 text-purple-500" />
          <h3 className="text-lg font-bold">Evaluaciones Personalizadas</h3>
          <p>Evaluaciones diseñadas específicamente para cada materia y nivel académico.</p>
        </div>
      ),
    },
    {
      id: 2,
      name: "Retroalimentación Instantánea",
      designation: "Resultados inmediatos",
      content: (
        <div className="flex flex-col gap-2">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <h3 className="text-lg font-bold">Retroalimentación Instantánea</h3>
          <p>Recibe resultados y comentarios detallados inmediatamente después de cada evaluación.</p>
        </div>
      ),
    },
    {
      id: 3,
      name: "Análisis de Desempeño",
      designation: "Seguimiento detallado",
      content: (
        <div className="flex flex-col gap-2">
          <LineChart className="w-8 h-8 text-blue-500" />
          <h3 className="text-lg font-bold">Análisis de Desempeño</h3>
          <p>Visualiza tu progreso y áreas de mejora con análisis detallados.</p>
        </div>
      ),
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 dark:from-background dark:to-black/50">
      <header className="flex justify-between items-center p-4 md:p-6 h-16 border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="flex items-center gap-2 glow-effect">
          <PenTool className="h-6 w-6 text-primary blur-effect" />
          <span className="font-bold text-lg">SEIA</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" onClick={() => signIn()}>
            Ingreso para Administradores y Profesores
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-24 space-y-24">
        <section className="flex flex-col md:flex-row items-center justify-between gap-12 fade-in">
          <div className="flex-1 space-y-6 pl-0 md:pl-10">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2 animate-pulse">
              Plataforma de Evaluaciones Académicas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Realiza tus <span className="text-primary glow-effect">Evaluaciones</span> en Línea
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              SEIA es la plataforma integral para evaluaciones académicas. <br />
              <span className="font-semibold text-primary">Estudiantes:</span> Acceden a sus evaluaciones con el código único proporcionado por su profesor, sin necesidad de registrarse.<br />
              <span className="font-semibold text-primary">Profesores y Administradores:</span> Inician sesión para crear, gestionar y analizar evaluaciones, controlar intentos y obtener reportes detallados.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="rounded-full px-8 blur-effect group" asChild>
                <a href="/student" className="flex items-center gap-2">
                  Ingreso para Estudiantes
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          </div>
          <div className="flex-1 relative h-[400px] w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-3xl blur-3xl opacity-70 animate-pulse"></div>
            <div className="relative h-full w-full flex items-center justify-center">
              <CardStack items={cards} />
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-muted/30 via-background/50 to-muted/30 rounded-3xl backdrop-blur-sm">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 glow-effect">¿Qué puedes hacer con SEIA?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SEIA está diseñado para estudiantes, profesores y administradores. Descubre las ventajas para cada rol:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Estudiantes */}
            <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-background/50 rounded-xl border border-border/30 mb-4 group-hover:bg-background/80 transition-colors duration-300">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-primary">Para Estudiantes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Accede a tus evaluaciones con un código único, responde en un entorno seguro y recibe retroalimentación inmediata y personalizada.
                </p>
              </div>
            </div>
            {/* Profesores */}
            <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-background/50 rounded-xl border border-border/30 mb-4 group-hover:bg-background/80 transition-colors duration-300">
                  <PenTool className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-blue-500">Para Profesores</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Crea y programa evaluaciones, visualiza intentos, detecta comportamientos sospechosos y accede a reportes detallados del desempeño de tus estudiantes.
                </p>
              </div>
            </div>
            {/* Administradores */}
            <div className="group relative p-6 bg-background/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-background/50 rounded-xl border border-border/30 mb-4 group-hover:bg-background/80 transition-colors duration-300">
                  <Shield className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-red-500">Para Administradores</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gestiona usuarios, áreas, límites y configuraciones globales. Supervisa la actividad del sistema y accede a auditorías y reportes globales.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">¿Cómo funciona SEIA?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Paso 1 */}
            <div className="relative p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 card-hover glow-effect">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold">
                01
              </div>
              <div className="pt-6">
                <Code className="h-10 w-10 text-primary" />
                <h3 className="text-xl font-bold mt-4 mb-2">Estudiantes: Ingresa tu Código</h3>
                <p className="text-muted-foreground">Introduce el código único proporcionado por tu profesor para acceder a la evaluación. No necesitas cuenta.</p>
              </div>
            </div>
            {/* Paso 2 */}
            <div className="relative p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 card-hover glow-effect">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold">
                02
              </div>
              <div className="pt-6">
                <PenTool className="h-10 w-10 text-blue-500" />
                <h3 className="text-xl font-bold mt-4 mb-2">Profesores/Admins: Inician Sesión</h3>
                <p className="text-muted-foreground">Acceden con su cuenta para crear, gestionar y analizar evaluaciones, así como administrar usuarios y áreas.</p>
              </div>
            </div>
            {/* Paso 3 */}
            <div className="relative p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 card-hover glow-effect">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold">
                03
              </div>
              <div className="pt-6">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <h3 className="text-xl font-bold mt-4 mb-2">Recibe Resultados y Reportes</h3>
                <p className="text-muted-foreground">Los estudiantes obtienen retroalimentación inmediata. Profesores y admins acceden a reportes y análisis detallados.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-8 bg-primary/10 rounded-3xl text-center space-y-8 fade-in">
          <h2 className="text-3xl md:text-4xl font-bold">¿Listo para tu evaluación?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No pierdas más tiempo. Ingresa tu código y comienza tu evaluación ahora.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button size="lg" className="rounded-full px-8 blur-effect" asChild>
              <a href="/student">Ingreso para Estudiantes</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 mt-12 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 glow-effect mb-4">
            <PenTool className="h-6 w-6 text-primary blur-effect" />
            <span className="font-bold text-xl">SEIA</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Sistema de Evaluación con Inteligencia Artificial. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
