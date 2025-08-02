"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (title: string, description?: string) => void
  showConfirm: (title: string, description: string, confirmText?: string, cancelText?: string) => Promise<boolean>
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean
    options: ConfirmOptions | null
  }>({
    isOpen: false,
    options: null,
  })
  const { toast } = useToast()

  const showAlert = React.useCallback((title: string, description?: string) => {
    toast({
      title: title,
      description: description,
    })
  }, [toast])

  const showConfirm = React.useCallback((
    title: string, 
    description: string, 
    confirmText: string = "Confirmar", 
    cancelText: string = "Cancelar"
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options: {
          title,
          description,
          confirmText,
          cancelText,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      })
    })
  }, [])

  const handleConfirm = () => {
    if (alertState.options?.onConfirm) {
      alertState.options.onConfirm()
    }
    setAlertState({ isOpen: false, options: null })
  }

  const handleCancel = () => {
    if (alertState.options?.onCancel) {
      alertState.options.onCancel()
    }
    setAlertState({ isOpen: false, options: null })
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={alertState.isOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertState.options?.title || "Confirmación"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertState.options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {alertState.options?.cancelText || "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={alertState.options?.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {alertState.options?.confirmText || "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = React.useContext(AlertContext)
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}