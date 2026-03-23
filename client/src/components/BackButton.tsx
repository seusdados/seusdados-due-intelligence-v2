import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  label?: string;
  to?: string;
  className?: string;
  variant?: "default" | "ghost" | "outline" | "link";
}

/**
 * Componente de botão voltar reutilizável
 * - Se `to` for fornecido, navega para essa rota
 * - Caso contrário, volta para a página anterior (history.back)
 */
export function BackButton({ 
  label = "Voltar", 
  to, 
  className = "",
  variant = "ghost"
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (to) {
      setLocation(to);
    } else {
      // Usar history.back() para voltar à página anterior
      window.history.back();
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      className={`gap-2 text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

/**
 * Hook para usar em botões de cancelar
 * Retorna uma função que volta para a página anterior
 */
export function useGoBack(defaultPath?: string) {
  const [, setLocation] = useLocation();

  return () => {
    if (defaultPath && window.history.length <= 1) {
      setLocation(defaultPath);
    } else {
      window.history.back();
    }
  };
}
