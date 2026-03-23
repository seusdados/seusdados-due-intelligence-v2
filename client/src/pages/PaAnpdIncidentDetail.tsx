import React, { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, FileText, Clock } from 'lucide-react';

export function PaAnpdIncidentDetail() {
  const params = useParams<{ id: string }>();
  const incidentId = params?.id || '';
  const [activeTab, setActiveTab] = useState('overview');

  const { data: incident, isLoading } = trpc.paAnpd.getIncident.useQuery(
    { incidentId },
    { enabled: !!incidentId }
  );

  const { data: cases } = trpc.paAnpd.listCases.useQuery(
    { incidentId },
    { enabled: !!incidentId }
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Incidente não encontrado</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critica':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baixa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{incident.title}</h1>
          <p className="text-gray-600 mt-1">{incident.description}</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4">
        <Badge className={getSeverityColor(incident.severity)}>
          {incident.severity}
        </Badge>
        <Badge variant="outline">{incident.status}</Badge>
        <span className="text-sm text-gray-600">Estágio {incident.stage}/9</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="cases">Casos ({cases?.length || 0})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Incidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo de Incidente</p>
                  <p className="font-medium mt-1">{incident.incidentType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Descoberta</p>
                  <p className="font-medium mt-1">
                    {incident.discoveryDate
                      ? new Date(incident.discoveryDate).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status Atual</p>
                  <p className="font-medium mt-1">{incident.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Severidade</p>
                  <p className="font-medium mt-1">{incident.severity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          {cases && cases.length > 0 ? (
            <div className="space-y-3">
              {cases.map((caseItem: any) => (
                <Card key={caseItem.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                        <CardDescription>Número: {caseItem.caseNumber}</CardDescription>
                      </div>
                      <Badge variant="outline">{caseItem.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{caseItem.description}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        Adicionar Ato
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center">Nenhum caso administrativo criado</p>
                <Button className="w-full mt-4">Criar Novo Caso</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2" />
                    <div className="w-0.5 h-12 bg-gray-200" />
                  </div>
                  <div>
                    <p className="font-medium">Incidente Registrado</p>
                    <p className="text-sm text-gray-600">
                      {incident.createdAt
                        ? new Date(incident.createdAt).toLocaleDateString('pt-BR')
                        : 'Data não disponível'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ações Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Criar Caso Administrativo
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Adicionar Prazo
              </Button>
              <Button className="w-full justify-start" variant="outline">
                Gerar CIS
              </Button>
              <Button className="w-full justify-start" variant="outline">
                Atualizar Status
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
