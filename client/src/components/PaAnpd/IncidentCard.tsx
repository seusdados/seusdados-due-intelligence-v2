import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle, FileText } from 'lucide-react';

interface IncidentCardProps {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  incidentType: string;
  discoveryDate: Date;
  stage: number;
  onViewDetails?: (id: string) => void;
  onCreateCase?: (id: string) => void;
}

export function IncidentCard({
  id,
  title,
  description,
  severity,
  status,
  incidentType,
  discoveryDate,
  stage,
  onViewDetails,
  onCreateCase,
}: IncidentCardProps) {
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critica':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'alta':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'baixa':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case 'aberto':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'em_investigacao':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolvido':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStagePercentage = (s: number) => (s / 9) * 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Badge className={`${getSeverityColor(severity)} border`}>{severity}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status and Type */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <span className="text-sm font-medium">{status}</span>
          </div>
          <Badge variant="outline">{incidentType}</Badge>
        </div>

        {/* Discovery Date */}
        <div className="text-sm text-gray-600">
          Descoberto em: {new Date(discoveryDate).toLocaleDateString('pt-BR')}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium">{stage}/9</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${getStagePercentage(stage)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(id)}
          >
            Ver Detalhes
          </Button>
          {stage === 1 && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => onCreateCase?.(id)}
            >
              Criar Caso
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
