import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Deadline {
  id: string;
  category: string;
  dueDate: Date;
  status: string;
  daysRemaining?: number;
}

interface DeadlineTableProps {
  deadlines: Deadline[];
  isLoading?: boolean;
  onMarkComplete?: (id: string) => void;
}

export function DeadlineTable({ deadlines, isLoading, onMarkComplete }: DeadlineTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-blue-100 text-blue-800';
      case 'em_alerta':
        return 'bg-orange-100 text-orange-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      case 'cumprido':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'em_alerta':
        return <AlertTriangle className="w-4 h-4" />;
      case 'vencido':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cumprido':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const calculateDaysRemaining = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDaysRemainingColor = (days: number) => {
    if (days < 0) return 'text-red-600 font-bold';
    if (days <= 3) return 'text-orange-600 font-bold';
    if (days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!deadlines || deadlines.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nenhum prazo registrado</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Categoria</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Dias Restantes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deadlines.map((deadline) => {
            const daysRemaining = calculateDaysRemaining(deadline.dueDate);
            return (
              <TableRow key={deadline.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{deadline.category}</TableCell>
                <TableCell>
                  {new Date(deadline.dueDate).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <span className={getDaysRemainingColor(daysRemaining)}>
                    {daysRemaining < 0
                      ? `${Math.abs(daysRemaining)} dias vencido`
                      : `${daysRemaining} dias`}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(deadline.status)}
                    <Badge className={getStatusColor(deadline.status)}>
                      {deadline.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {deadline.status !== 'cumprido' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkComplete?.(deadline.id)}
                    >
                      Marcar Cumprido
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
