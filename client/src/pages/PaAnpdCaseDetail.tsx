import React, { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, Clock, FileText } from 'lucide-react';

export function PaAnpdCaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || '';
  const [activeTab, setActiveTab] = useState('overview');

  const { data: caseData, isLoading } = trpc.paAnpd.getCase.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  const { data: acts } = trpc.paAnpd.listActs.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  const { data: deadlines } = trpc.paAnpd.listDeadlines.useQuery(
    { caseId },
    { enabled: !!caseId }
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

  if (!caseData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Caso não encontrado</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-blue-100 text-blue-800';
      case 'em_analise':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalizado':
        return 'bg-green-100 text-green-800';
      case 'arquivado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCisStatusColor = (status?: string) => {
    switch (status) {
      case 'nao_iniciado':
        return 'bg-gray-100 text-gray-800';
      case 'rascunho':
        return 'bg-blue-100 text-blue-800';
      case 'em_analise':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalizado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeadlineStatusColor = (status?: string) => {
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{caseData.title}</h1>
          <p className="text-gray-600 mt-1">Número: {caseData.caseNumber}</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge className={getStatusColor(caseData.status)}>
          {caseData.status}
        </Badge>
        <Badge className={getCisStatusColor(caseData.cisStatus)}>
          CIS: {caseData.cisStatus}
        </Badge>
        {caseData.doubleDeadlineApplied && (
          <Badge variant="destructive">Prazo Duplicado</Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="acts">Atos ({acts?.length || 0})</TabsTrigger>
          <TabsTrigger value="deadlines">Prazos ({deadlines?.length || 0})</TabsTrigger>
          <TabsTrigger value="cis">CIS</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Caso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="font-medium mt-1">{caseData.description || 'Sem descrição'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium mt-1">{caseData.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status CIS</p>
                  <p className="font-medium mt-1">{caseData.cisStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prazo CIS Inicial</p>
                  <p className="font-medium mt-1">
                    {caseData.cisInitialDeadline
                      ? new Date(caseData.cisInitialDeadline).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prazo CIS Final</p>
                  <p className="font-medium mt-1">
                    {caseData.cisFinalDeadline
                      ? new Date(caseData.cisFinalDeadline).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acts" className="space-y-4">
          {acts && acts.length > 0 ? (
            <div className="space-y-3">
              {acts.map((act: any) => (
                <Card key={act.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{act.actType}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">{act.description}</p>
                    <p className="text-xs text-gray-500">
                      Data: {new Date(act.actDate).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center">Nenhum ato registrado</p>
                <Button className="w-full mt-4">Adicionar Ato</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deadlines" className="space-y-4">
          {deadlines && deadlines.length > 0 ? (
            <div className="space-y-3">
              {deadlines.map((deadline: any) => (
                <Card key={deadline.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deadline.category}</CardTitle>
                        <CardDescription>
                          Vencimento: {new Date(deadline.dueDate).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <Badge className={getDeadlineStatusColor(deadline.status)}>
                        {deadline.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center">Nenhum prazo registrado</p>
                <Button className="w-full mt-4">Adicionar Prazo</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comunicação de Incidente de Segurança</CardTitle>
              <CardDescription>Status: {caseData.cisStatus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.cisStatus === 'nao_iniciado' ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Nenhuma CIS iniciada</p>
                  <Button>Gerar CIS</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Status Atual</p>
                    <Badge className={`${getCisStatusColor(caseData.cisStatus)} mt-1`}>
                      {caseData.cisStatus}
                    </Badge>
                  </div>
                  <Button className="w-full">Editar CIS</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
