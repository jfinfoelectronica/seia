'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart3, FileText, StickyNote } from 'lucide-react';

const tools = [
	{
		name: 'Notas Rápidas',
		description:
			'Toma notas rápidas durante exposiciones o conferencias. Cada vez que presionas Enter, se apila una nota. Luego podrás generar un resumen, un correo o más opciones usando Gemini.',
		icon: <StickyNote className="h-8 w-8 text-primary" />,
		href: '/teacher/tools/quick-notes',
	},
	{
		name: 'Analizador de Audio',
		description:
			'Sube un audio y obtén una evaluación detallada por marcas de tiempo según criterios personalizados.',
		icon: <BarChart3 className="h-8 w-8 text-blue-500" />,
		href: '/teacher/tools/audio-analyzer',
	},
	{
		name: 'Generador de Rúbricas Automáticas',
		description:
			'Describe una actividad y genera una rúbrica editable con criterios, descriptores y escalas lista para exportar.',
		icon: <FileText className="h-8 w-8 text-green-500" />,
		href: '/teacher/tools/rubric-generator',
	},
	{
		name: 'Generador de Podcast con IA',
		description:
			'Crea podcasts educativos de uno o dos interlocutores con voces realistas usando Gemini. Escribe o genera el guion, elige voces y descarga el audio.',
		icon: '🎙️',
		href: '/teacher/tools/podcast-generator',
	},
	{
		name: 'Generador de Lista de Chequeo',
		description:
			'Crea listas de chequeo personalizadas para evaluar criterios de manera rápida y sencilla.',
		icon: <FileText className="h-8 w-8 text-orange-500" />,
		href: '/teacher/tools/checklist-generator',
	},
	{
		name: 'Traductor IA',
		description:
			'Traduce texto o audio a cualquier idioma. Sube un audio para transcribir y traducir automáticamente usando Gemini.',
		icon: <FileText className="h-8 w-8 text-purple-500" />,
		href: '/teacher/tools/translator',
	},
	{
		name: 'Evaluador de Repositorios GitHub',
		description:
			'Busca forks de repositorios educativos, evalúa automáticamente las actividades de los estudiantes usando IA, genera reportes PDF individuales y exporta calificaciones a Excel.',
		icon: <FileText className="h-8 w-8 text-gray-500" />,
		href: '/teacher/tools/github-forks',
	},
];

export default function ToolsPanel() {
	return (
		<div className="container mx-auto py-8">
			<h1 className="text-3xl font-bold mb-8">Herramientas para Profesores</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{tools.map((tool) => (
					<Card key={tool.name} className="hover:shadow-xl transition-shadow h-full flex flex-col">
						<div className="flex-1 flex flex-col">
							<CardHeader className="flex flex-row items-center gap-4 pb-2">
								{tool.icon}
								<div>
									<CardTitle>{tool.name}</CardTitle>
									<CardDescription>{tool.description}</CardDescription>
								</div>
							</CardHeader>
							<div className="flex-1" />
							<CardContent className="flex flex-col justify-end">
								<Button asChild className="w-full mt-2">
									<Link href={tool.href}>Ir a {tool.name}</Link>
								</Button>
							</CardContent>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}