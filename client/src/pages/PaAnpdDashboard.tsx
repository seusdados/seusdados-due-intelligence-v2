import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, FileText, Shield } from 'lucide-react';
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

export function PaAnpdDashboard() {
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);

  const { data: summary, isLoading: summaryLoading } = trpc.paAnpd.getDashboardSummary.useQuery();
  const { data: incidents, isLoading: incidentsLoading } = trpc.paAnpd.listIncidents.useQuery({});
  const { data: selectedIncidentData } = selectedIncident
    ? trpc.paAnpd.getIncident.useQuery({ incidentId: selectedIncident })
    : { data: null };
  const { data: cases } = selectedIncident
    ? trpc.paAnpd.listCases.useQuery({ incidentId: selectedIncident })
    : { data: null };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critica': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baixa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'aberto': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'em_investigacao': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolvido': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Gestão de Incidentes PA ANPD"
        subtitle="Acompanhamento de incidentes de segurança e processos administrativos"
        action={
          <Button onClick={() => setShowNewIncidentForm(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            Novo Incidente
          </Button>
        }
      />

      {/* Summary Cards */}
      {summary && (
        <CardGrid columns={3}>
          <StatCard icon={FileText} iconGradient="blue" value={summary.totalIncidents} label="Total de Incidentes" subtitle="Todos os registrados" />
          <StatCard icon={AlertCircle} iconGradient="amber" value={summary.openIncidents} label="Incidentes Abertos" subtitle="Aguardando investigação" />
          <StatCard icon={Shield} iconGradient="red" value={summary.criticalIncidents} label="Críticos" subtitle="Severidade crítica" />
        </CardGrid>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents List */}
        <div className="lg:col-span-1">
          <InfoCard icon={FileText} iconGradient="indigo" title="Incidentes" subtitle="Lista de incidentes registrados">
            {incidentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : incidents && incidents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {incidents.map((incident: any) => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident.id)}
                    className={`w-full text-left p-3 rounded border transition ${
                      selectedIncident === incident.id
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
                        : 'border-border hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <Badge className={`text-xs mt-1 ${getSeverityColor(incident.severity)}`}>
                          {incident.severity || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum incidente registrado</p>
            )}
          </InfoCard>
        </div>

        {/* Incident Details */}
        <div className="lg:col-span-2">
          {selectedIncidentData ? (
            <div className="space-y-4">
              <InfoCard
                icon={Shield}
                iconGradient="violet"
                title={selectedIncidentData.title}
                subtitle={selectedIncidentData.description || ''}
                badge={{
                  text: selectedIncidentData.severity || 'N/A',
                  variant: selectedIncidentData.severity === 'critica' ? 'danger' : 
                           selectedIncidentData.severity === 'alta' ? 'warning' : 'info'
                }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Incidente</p>
                    <p className="font-medium">{selectedIncidentData.incidentType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedIncidentData.status)}
                      <span className="font-medium">{selectedIncidentData.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Descoberta</p>
                    <p className="font-medium">
                      {selectedIncidentData.discoveryDate
                        ? new Date(selectedIncidentData.discoveryDate).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estágio</p>
                    <p className="font-medium">{selectedIncidentData.stage}/9</p>
                  </div>
                </div>
              </InfoCard>

              {/* Cases */}
              {cases && cases.length > 0 && (
                <InfoCard icon={FileText} iconGradient="amber" title="Casos Administrativos">
                  <div className="space-y-3">
                    {cases.map((caseItem: any) => (
                      <div key={caseItem.id} className="p-3 border border-border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{caseItem.title}</p>
                            <p className="text-sm text-muted-foreground">Número: {caseItem.caseNumber}</p>
                          </div>
                          <Badge variant="outline">{caseItem.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}
            </div>
          ) : (
            <InfoCard icon={Shield} iconGradient="slate" title="Detalhes do Incidente">
              <p className="text-muted-foreground text-center py-8">Selecione um incidente para visualizar detalhes</p>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}
