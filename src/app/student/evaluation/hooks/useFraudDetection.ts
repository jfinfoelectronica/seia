import { useState, useRef, useEffect, useCallback } from 'react';
import { toUTC } from '@/lib/date-utils';

interface UseTimeTrackingProps {
  submissionId: number | null;
  onTimeOutsideUpdated: (time: number) => void;
}

// Clave para localStorage
const TIME_STORAGE_KEY = 'time_tracking_data';

interface TimeStorageData {
  timeOutsideEval: number;
}

export function useFraudDetection({ submissionId, onTimeOutsideUpdated }: UseTimeTrackingProps) {
  // Cargar datos iniciales desde localStorage
  const loadInitialData = (): TimeStorageData => {
    if (typeof window === 'undefined') return { timeOutsideEval: 0 };
    
    const storedData = localStorage.getItem(TIME_STORAGE_KEY);
    if (storedData) {
      try {
        return JSON.parse(storedData);
      } catch (e) {
        console.error('Error al cargar datos de tiempo:', e);
        return { timeOutsideEval: 0 };
      }
    }
    return { timeOutsideEval: 0 };
  };

  const initialData = loadInitialData();
  const [timeOutsideEval, setTimeOutsideEval] = useState<number>(initialData.timeOutsideEval);
  const [leaveTime, setLeaveTime] = useState<number | null>(null);

  // Refs para mantener los valores actualizados en los event listeners
  const timeOutsideEvalRef = useRef(timeOutsideEval);
  const leaveTimeRef = useRef(leaveTime);
  const isHelpModeRef = useRef(false);

  // Actualizar refs cuando cambian los estados
  useEffect(() => {
    timeOutsideEvalRef.current = timeOutsideEval;
    leaveTimeRef.current = leaveTime;
  }, [timeOutsideEval, leaveTime]);

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const dataToStore: TimeStorageData = {
      timeOutsideEval
    };
    
    localStorage.setItem(TIME_STORAGE_KEY, JSON.stringify(dataToStore));
  }, [timeOutsideEval]);

  // Función para registrar cuando el usuario sale de la evaluación
  const registerUserLeave = useCallback(async () => {
    // Solo contar tiempo si no está en modo ayuda o si es un cambio de pestaña real
    const newLeaveTime = toUTC(new Date()).getTime();
    setLeaveTime(newLeaveTime);
  }, []);

  // Función para registrar el regreso del usuario
  const registerUserReturn = useCallback(async () => {
    if (leaveTimeRef.current !== null) {
      const timeAway = Math.floor((Date.now() - leaveTimeRef.current) / 1000);
      setLeaveTime(null);

      setTimeOutsideEval(prev => {
        const nextTimeOutsideEval = prev + timeAway;
        // Solo llamar onTimeOutsideUpdated cuando el usuario regrese
        // Esto reduce las peticiones a la base de datos
        onTimeOutsideUpdated(nextTimeOutsideEval);
        return nextTimeOutsideEval;
      });
    }
  }, [onTimeOutsideUpdated]);

  // Configurar event listeners para seguimiento de tiempo
  useEffect(() => {
    if (!submissionId) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Solo contar tiempo si no está en modo ayuda
        if (!isHelpModeRef.current) {
          registerUserLeave();
        }
      } else {
        registerUserReturn();
      }
    };

    const handleWindowBlur = async () => {
      // Esperar un tick para que document.activeElement se actualice
      setTimeout(() => {
        // Si la ayuda está abierta y el foco fue al iframe de ayuda, no contar tiempo
        if (isHelpModeRef.current) {
          const iframe = document.querySelector('iframe');
          if (iframe && document.activeElement === iframe) {
            return;
          }
        }
        // Registrar salida normalmente
        registerUserLeave();
      }, 0);
    };

    const handleWindowFocus = async () => {
      registerUserReturn();
    };

    // Registrar event listeners solo para seguimiento de tiempo
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [submissionId, registerUserLeave, registerUserReturn]);

  return {
    timeOutsideEval,
    setHelpModalOpen: (isOpen: boolean) => {
      isHelpModeRef.current = isOpen;
    }
  };
}