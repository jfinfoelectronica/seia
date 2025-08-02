'use client';

import { Button } from "@/components/ui/button";
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from 'next-themes';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { FileSpreadsheet, FileText } from "lucide-react";

// Definición de tipos para el componente
interface Question {
  text: string;
  type: 'CODE' | 'TEXT';
  language?: string;
}

interface Answer {
  id: number;
  question: Question;
  answer: string;
  score?: number | null;
}

interface Submission {
  firstName: string;
  lastName: string;
  email: string;
  score?: number | null;
  answersList: Answer[];
}

interface SubmissionDetailsProps {
  submission: Submission | null;
  onBack: () => void;
}

/**
 * Componente para mostrar los detalles de un envío, incluyendo
 * las respuestas del estudiante a cada pregunta.
 */
export function SubmissionDetails({ submission, onBack }: SubmissionDetailsProps) {
  const { theme } = useTheme();

  const handleExportExcel = () => {
    if (!submission) return;

    // Información del estudiante para la cabecera
    const studentInfo = [
        ['Estudiante:', `${submission.firstName} ${submission.lastName}`],
        ['Email:', submission.email],
        ['Puntaje Total:', `${submission.score ?? 'Sin calificar'}`],
        [] // Fila en blanco como separador
    ];

    // Crear la hoja de cálculo a partir de la información del estudiante
    const worksheet = XLSX.utils.aoa_to_sheet(studentInfo);

    // Datos principales de preguntas y puntuaciones
    const dataToExport = submission.answersList.map((ans, index) => ({
        '#': `Pregunta #${index + 1}`,
        'Puntuación': ans.score ?? 'Sin calificar'
    }));

    // Añadir los datos principales a la hoja existente, después de la cabecera
    XLSX.utils.sheet_add_json(worksheet, dataToExport, {
        origin: 'A5', // Empezar en la celda A5
        skipHeader: false
    });


    // Ajustar el ancho de las columnas
    const columnWidths = [
        { wch: 20 }, // Ancho para la columna #
        { wch: 15 }  // Ancho para la columna de Puntuación
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen de Calificaciones');
    
    const studentName = `${submission.firstName}_${submission.lastName}`;
    XLSX.writeFile(workbook, `calificaciones_${studentName}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!submission) return;

    const doc = new jsPDF();
    doc.setFont('Times');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = margin;
    let pageNumber = 1;

    const colors = {
        primary: [47, 85, 212] as const,
        text: [55, 65, 81] as const,
        heading: [17, 24, 39] as const,
        lightGray: [249, 250, 251] as const,
        border: [229, 231, 235] as const
    };

    const addPage = () => {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.addPage();
        y = margin;
        pageNumber++;

        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 22, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont('Times', 'bold');
        doc.text('Reporte de Evaluación - SEIA', margin, 15);
        y = 35;
    };

    const addPageIfNeeded = (spaceNeeded: number) => {
        if (y + spaceNeeded > pageHeight - 20) {
            addPage();
        }
    };

    // --- PDF Header ---
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('Times', 'bold');
    doc.text('Reporte de Evaluación - SEIA', margin, 15);
    y = 40;

    // --- Student Info ---
    doc.setFontSize(16);
    doc.setFont('Times', 'bold');
    doc.setTextColor(...colors.heading);
    doc.text('Información del Estudiante', margin, y);
    y += 10;
    doc.setFontSize(11);
    doc.setFont('Times', 'normal');
    doc.setTextColor(...colors.text);
    const studentInfo = [
        `Nombre: ${submission.firstName} ${submission.lastName}`,
        `Email: ${submission.email}`,
        `Puntaje Final: ${submission.score ?? 'Sin calificar'}`,
    ];
    doc.text(studentInfo, margin, y);
    y += studentInfo.length * 7 + 10;

    // --- Markdown Renderer ---
    const renderMarkdown = (text: string) => {
        if (!text || text.trim() === '') {
            addPageIfNeeded(10);
            doc.setFontSize(10);
            doc.setFont('Times', 'italic');
            doc.setTextColor(150, 150, 150);
            doc.text('(Sin respuesta)', margin + 5, y);
            y += 8;
            return;
        }

        const lines = text.split('\\n');
        let inCodeBlock = false;
        let codeContent: string[] = [];

        const flushCodeBlock = () => {
            if (codeContent.length > 0) {
                addPageIfNeeded(20);
                const codeText = codeContent.join('\\n');
                
                doc.setFillColor(41, 51, 64);
                doc.setFont('Courier', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(220, 222, 224);

                const splitCode = doc.splitTextToSize(codeText, pageWidth - (margin * 2) - 20);
                const blockHeight = (splitCode.length * 4.5) + 10;
                addPageIfNeeded(blockHeight);
                doc.roundedRect(margin + 5, y, pageWidth - (margin * 2) - 10, blockHeight, 3, 3, 'F');
                doc.text(splitCode, margin + 10, y + 8);
                y += blockHeight + 5;
                codeContent = [];
            }
        };

        lines.forEach(line => {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                if (!inCodeBlock) flushCodeBlock();
                return;
            }

            if (inCodeBlock) {
                codeContent.push(line);
                return;
            }

            const headingMatch = line.match(/^(#+)\s+(.*)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = headingMatch[2];
                
                const fontSize = Math.max(16 - (level - 1) * 2, 10);
                addPageIfNeeded(10);
                doc.setFontSize(fontSize);
                doc.setFont('Times', 'bold');
                doc.setTextColor(...colors.heading);
                
                const splitText = doc.splitTextToSize(content, pageWidth - (margin * 2) - 10);
                doc.text(splitText, margin + 5, y);
                y += splitText.length * (fontSize / 2) + 4;
                return;
            }

            const isList = line.trim().startsWith('* ') || line.trim().startsWith('- ');
            const content = isList ? line.trim().substring(2) : line;
            const xPos = isList ? margin + 10 : margin + 5;

            doc.setFontSize(10);
            doc.setFont('Times', 'normal');
            doc.setTextColor(...colors.text);

            const splitText = doc.splitTextToSize(content, pageWidth - xPos - margin);
            addPageIfNeeded(splitText.length * 5 + 4);

            if (isList) {
                doc.circle(margin + 7, y + 2, 1, 'F');
            }
            doc.text(splitText, xPos, y);
            y += splitText.length * 5 + 2;
        });
        flushCodeBlock();
    };

    // --- Loop through Questions ---
    submission.answersList.forEach((ans, index) => {
        addPageIfNeeded(60);
        
        // Question Title
        doc.setFontSize(13);
        doc.setFont('Times', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text(`Pregunta #${index + 1}`, margin, y);
        y += 10;

        // Question Text
        renderMarkdown(ans.question.text);
        
        y += 5;
        doc.setLineWidth(0.3);
        doc.setDrawColor(...colors.border);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Answer Title
        doc.setFontSize(12);
        doc.setFont('Times', 'bold');
        doc.setTextColor(...colors.heading);
        doc.text('Respuesta del Estudiante:', margin, y);
        y += 8;

        // Answer Content
        renderMarkdown(ans.answer);

        y += 8;
        doc.setFont('Times', 'bold');
        doc.text(`Puntuación: ${ans.score ?? 'Sin calificar'}`, margin, y);
        y += 15;
    });

    addPageIfNeeded(1); 
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    const studentName = `${submission.firstName}_${submission.lastName}`;
    doc.save(`reporte_evaluacion_${studentName}.pdf`);
  };

  if (!submission) {
    return <div className="p-6 text-center text-muted-foreground">Selecciona un envío para ver los detalles.</div>;
  }

  return (
    <div className="border rounded-lg p-6 bg-card" data-color-mode={theme}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">Detalles del Envío</h2>
          <p className="text-muted-foreground">
            {submission.firstName} {submission.lastName} - {submission.email}
          </p>
          <div className="mt-2 text-lg font-semibold">
            Puntaje Total: {submission.score ?? 'Sin calificar'}
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-2">
                <FileSpreadsheet size={16} />
                Exportar a Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-2">
                <FileText size={16} />
                Exportar a PDF
            </Button>
            <Button onClick={onBack} variant="secondary">Volver</Button>
        </div>
      </div>
      
      <div className="space-y-8">
        {submission.answersList.map((ans) => (
          <div key={ans.id} className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {ans.question.text ? `Pregunta #${ans.id}` : `Pregunta de Código #${ans.id}`}
              </h3>
              <span className={`text-lg font-bold ${
                ans.score === null || ans.score === undefined
                  ? 'text-muted-foreground'
                  : ans.score >= 5
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                Puntuación: {ans.score ?? 'N/A'}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-muted-foreground mb-2">Enunciado</h4>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MDEditor.Markdown source={ans.question.text} />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground mb-2">Respuesta del Estudiante</h4>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MDEditor.Markdown source={ans.answer} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 