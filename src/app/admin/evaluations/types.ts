export interface EvaluationTableRow {
  id: number;
  title: string;
  description?: string | null;
  helpUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  authorId: number;
  author: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    area?: { name: string } | null;
  };
  _count?: { attempts: number };
} 