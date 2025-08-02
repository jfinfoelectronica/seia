import { useState, useCallback, useEffect } from 'react';

interface UseStudentDataProps {
  onDataLoaded?: (data: StudentData) => void;
}

interface StudentData {
  email: string;
  firstName: string;
  lastName: string;
}

export function useStudentData({ onDataLoaded }: UseStudentDataProps = {}) {
  const [studentData, setStudentData] = useState<StudentData>({
    email: '',
    firstName: '',
    lastName: ''
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Cargar datos del estudiante desde sessionStorage
  const loadStudentData = useCallback(() => {
    if (typeof window === 'undefined') return { email: '', firstName: '', lastName: '' };

    const storedData = sessionStorage.getItem('studentData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        const data = {
          email: parsed.email || '',
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || ''
        };
        setStudentData(data);
        setIsDataLoaded(true);
        onDataLoaded?.(data);
        return data;
      } catch (error) {
        console.error('Error al cargar datos del estudiante:', error);
        return { email: '', firstName: '', lastName: '' };
      }
    }
    return { email: '', firstName: '', lastName: '' };
  }, [onDataLoaded]);

  // Cargar datos automáticamente al inicializar el hook
  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // Guardar datos del estudiante en sessionStorage
  const saveStudentData = useCallback((data: StudentData) => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('studentData', JSON.stringify(data));
      setStudentData(data);
      setIsDataLoaded(true);
      onDataLoaded?.(data);
    } catch (error) {
      console.error('Error al guardar datos del estudiante:', error);
    }
  }, [onDataLoaded]);

  // Limpiar datos del estudiante
  const clearStudentData = useCallback(() => {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem('studentData');
    setStudentData({ email: '', firstName: '', lastName: '' });
    setIsDataLoaded(false);
  }, []);

  // Validar si los datos están completos
  const isDataComplete = useCallback(() => {
    return !!(studentData.email && studentData.firstName && studentData.lastName);
  }, [studentData]);

  return {
    studentData,
    isDataLoaded,
    loadStudentData,
    saveStudentData,
    clearStudentData,
    isDataComplete,
    // Propiedades individuales para compatibilidad
    email: studentData.email,
    firstName: studentData.firstName,
    lastName: studentData.lastName
  };
}