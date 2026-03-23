import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  type?: 'incident' | 'case' | 'deadline' | 'cis';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, type = 'incident', size = 'md' }: StatusBadgeProps) {
  const getStatusColor = () => {
    // Incident statuses
    if (type === 'incident') {
      switch (status) {
        case 'aberto':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'em_investigacao':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'resolvido':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'encerrado':
          return 'bg-green-100 text-green-800 border-green-300';
      }
    }

    // Case statuses
    if (type === 'case') {
      switch (status) {
        case 'aberto':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'em_analise':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'finalizado':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'arquivado':
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    }

    // Deadline statuses
    if (type === 'deadline') {
      switch (status) {
        case 'pendente':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'em_alerta':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'vencido':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'cumprido':
          return 'bg-green-100 text-green-800 border-green-300';
      }
    }

    // CIS statuses
    if (type === 'cis') {
      switch (status) {
        case 'nao_iniciado':
          return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'rascunho':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'em_analise':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'finalizado':
          return 'bg-green-100 text-green-800 border-green-300';
      }
    }

    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-base px-3 py-1';
      default:
        return 'text-sm px-2.5 py-0.5';
    }
  };

  const getStatusLabel = () => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Badge className={`${getStatusColor()} border ${getSizeClass()}`}>
      {getStatusLabel()}
    </Badge>
  );
}
