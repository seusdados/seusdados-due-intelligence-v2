import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface DeadlineAlert {
  assessmentId: number;
  assessmentName: string;
  daysRemaining: number;
  deadline: Date;
  respondentsCount: number;
  completedCount: number;
  urgency: 'crítico' | 'alto' | 'médio' | 'baixo';
}

interface DeadlineAlertsWidgetProps {
  alerts?: DeadlineAlert[];
  onAlertClick?: (assessmentId: number) => void;
}

export function DeadlineAlertsWidget({ alerts = [], onAlertClick }: DeadlineAlertsWidgetProps) {
  const [displayAlerts, setDisplayAlerts] = useState<DeadlineAlert[]>([]);

  useEffect(() => {
    // Simular dados de alertas se não fornecidos
    if (alerts.length === 0) {
      const mockAlerts: DeadlineAlert[] = [
        {
          assessmentId: 1,
          assessmentName: 'AC#20260123145A3B',
          daysRemaining: 1,
          deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          respondentsCount: 3,
          completedCount: 1,
          urgency: 'crítico',
        },
        {
          assessmentId: 2,
          assessmentName: 'AC#20260122134B2C',
          daysRemaining: 3,
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          respondentsCount: 4,
          completedCount: 2,
          urgency: 'alto',
        },
        {
          assessmentId: 3,
          assessmentName: 'AC#20260121123A1B',
          daysRemaining: 5,
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          respondentsCount: 5,
          completedCount: 3,
          urgency: 'médio',
        },
      ];
      setDisplayAlerts(mockAlerts);
    } else {
      setDisplayAlerts(alerts);
    }
  }, [alerts]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'crítico':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'alto':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'médio':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'baixo':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'crítico':
        return 'bg-red-100 text-red-800';
      case 'alto':
        return 'bg-orange-100 text-orange-800';
      case 'médio':
        return 'bg-amber-100 text-amber-800';
      case 'baixo':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'crítico':
        return '🔴';
      case 'alto':
        return '🟠';
      case 'médio':
        return '🟡';
      case 'baixo':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'crítico':
        return 'CRÍTICO';
      case 'alto':
        return 'URGENTE';
      case 'médio':
        return 'ATENÇÃO';
      case 'baixo':
        return 'LEMBRETE';
      default:
        return 'INFO';
    }
  };

  const criticalCount = displayAlerts.filter(a => a.urgency === 'crítico').length;
  const highCount = displayAlerts.filter(a => a.urgency === 'alto').length;
  const mediumCount = displayAlerts.filter(a => a.urgency === 'médio').length;

  return (
    <div className="space-y-4">
      {/* Header com Resumo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Alertas de Prazo</h3>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {criticalCount} Crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800">
              {highCount} Urgente{highCount > 1 ? 's' : ''}
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              {mediumCount} Atenção
            </Badge>
          )}
        </div>
      </div>

      {/* Lista de Alertas */}
      {displayAlerts.length > 0 ? (
        <div className="space-y-2">
          {displayAlerts.map(alert => {
            const progressPercent = Math.round((alert.completedCount / alert.respondentsCount) * 100);

            return (
              <Card
                key={alert.assessmentId}
                className={`p-3 cursor-pointer transition border ${getUrgencyColor(alert.urgency)}`}
                onClick={() => onAlertClick?.(alert.assessmentId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getUrgencyIcon(alert.urgency)}</span>
                      <h4 className="font-semibold text-gray-900">{alert.assessmentName}</h4>
                      <Badge className={getUrgencyBadgeColor(alert.urgency)}>
                        {getUrgencyLabel(alert.urgency)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {alert.daysRemaining === 0
                            ? 'Hoje'
                            : alert.daysRemaining === 1
                              ? 'Amanhã'
                              : `${alert.daysRemaining}d`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>
                          {alert.completedCount}/{alert.respondentsCount} respondentes
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mt-2 w-full h-1.5 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          alert.urgency === 'crítico'
                            ? 'bg-red-500'
                            : alert.urgency === 'alto'
                              ? 'bg-orange-500'
                              : alert.urgency === 'médio'
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Indicador de Dias */}
                  <div className="text-right">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                        alert.urgency === 'crítico'
                          ? 'bg-red-200 text-red-900'
                          : alert.urgency === 'alto'
                            ? 'bg-orange-200 text-orange-900'
                            : alert.urgency === 'médio'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-green-200 text-green-900'
                      }`}
                    >
                      {alert.daysRemaining}d
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 bg-green-50 border border-green-200 text-center">
          <p className="text-green-900 font-semibold">✓ Nenhum alerta de prazo</p>
          <p className="text-sm text-green-700 mt-1">Todas as avaliações estão dentro do prazo</p>
        </Card>
      )}

      {/* Rodapé com Informação */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Alertas atualizados em tempo real • Clique em um alerta para ver detalhes
      </div>
    </div>
  );
}
