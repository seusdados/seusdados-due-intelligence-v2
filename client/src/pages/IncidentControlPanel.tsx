/**
 * Seusdados Due Diligence - Incident Control Panel Page
 * Painel de Controle de Incidentes LGPD
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Users, 
  FileText, 
  Bell,
  Plus,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

// Countdown component
function CountdownDisplay({ knowledgeAt }: { knowledgeAt: string | null }) {
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    totalHours: number;
  } | null>(null);

  useEffect(() => {
    if (!knowledgeAt) {
      setCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const knowledge = new Date(knowledgeAt);
      // Add 3 business days (approximately 72 hours for simplicity)
      const deadline = new Date(knowledge.getTime() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          totalHours: 0
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const totalHours = diff / (1000 * 60 * 60);

      setCountdown({ days, hours, minutes, seconds, isExpired: false, totalHours });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [knowledgeAt]);

  if (!countdown) {
    return (
      <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-slate-400 text-sm">Nenhum incidente ativo</p>
      </div>
    );
  }

  const getStatusColor = () => {
    if (countdown.isExpired) return 'border-red-500 bg-red-500/10';
    if (countdown.totalHours < 24) return 'border-orange-500 bg-orange-500/10';
    return 'border-green-500 bg-green-500/10';
  };

  const getTextColor = () => {
    if (countdown.isExpired) return 'text-red-400';
    if (countdown.totalHours < 24) return 'text-orange-400';
    return 'text-green-400';
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
      <div className="text-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Prazo ANPD (3 dias úteis)
        </span>
      </div>
      <div className="flex justify-center gap-2">
        {[
          { value: countdown.days, label: 'Dias' },
          { value: countdown.hours, label: 'Horas' },
          { value: countdown.minutes, label: 'Min' },
          { value: countdown.seconds, label: 'Seg' },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900 rounded-lg px-3 py-2 min-w-[60px]">
            <div className={`text-2xl font-bold tabular-nums ${getTextColor()}`}>
              {String(item.value).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
          </div>
        ))}
      </div>
      {countdown.isExpired && (
        <div className="mt-2 text-center">
          <Badge variant="destructive">PRAZO EXPIRADO</Badge>
        </div>
      )}
    </div>
  );
}

// Phase Card component
function PhaseCard({ 
  phase, 
  isActive, 
  isExpanded, 
  onToggle, 
  onCheckItem 
}: { 
  phase: any; 
  isActive: boolean; 
  isExpanded: boolean;
  onToggle: () => void;
  onCheckItem: (itemId: string, isChecked: boolean) => void;
}) {
  const completedItems = phase.items.filter((i: any) => i.isChecked).length;
  const totalItems = phase.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const getStatusBadge = () => {
    if (phase.status === 'completed') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500">Concluída</Badge>;
    }
    if (isActive) {
      return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500 animate-pulse">Em Andamento</Badge>;
    }
    return <Badge variant="outline" className="text-slate-400">Pendente</Badge>;
  };

  return (
    <Card className={`border-2 transition-all ${
      isActive ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 
      phase.status === 'completed' ? 'border-green-500/50 opacity-80' : 
      'border-slate-700'
    }`}>
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              isActive ? 'bg-cyan-500 text-slate-900' :
              phase.status === 'completed' ? 'bg-green-500 text-white' :
              'bg-slate-700 text-slate-400'
            }`}>
              {phase.id}
            </div>
            <div>
              <CardTitle className="text-base">{phase.name}</CardTitle>
              <p className="text-xs text-slate-400">{phase.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <span className="text-sm text-slate-400">{completedItems}/{totalItems}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              phase.status === 'completed' ? 'bg-green-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {phase.items.map((item: any) => (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                  item.isChecked 
                    ? 'bg-green-500/10 border border-green-500/50' 
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => onCheckItem(item.id, !item.isChecked)}
              >
                <Checkbox 
                  checked={item.isChecked}
                  className={item.isChecked ? 'border-green-500 bg-green-500' : ''}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.isChecked ? 'text-green-400 line-through' : ''}`}>
                      {item.title}
                    </span>
                    {item.isRequired && !item.isChecked && (
                      <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                  {item.isChecked && item.checkedBy && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      ✓ {item.checkedBy} • {new Date(item.checkedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Log Entry component
function LogEntry({ log }: { log: any }) {
  const getTypeIcon = () => {
    switch (log.type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'system': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'communication': return <Bell className="w-4 h-4 text-purple-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <div className="flex gap-3 p-3 bg-slate-800/50 rounded-lg">
      {getTypeIcon()}
      <div className="flex-1">
        <p className="text-sm">{log.message}</p>
        <p className="text-[10px] text-slate-500 mt-1">
          {new Date(log.timestamp).toLocaleString('pt-BR')}
          {log.userName && ` • ${log.userName}`}
        </p>
      </div>
    </div>
  );
}

// Main component
export default function IncidentControlPanel() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([1]);
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    knowledgeAt: new Date().toISOString().slice(0, 16),
    riskLevel: 'medium' as const
  });

  // Get organizations
  const { data: organizations } = trpc.organization.list.useQuery();

  // Set default organization
  useEffect(() => {
    if (user?.organizationId) {
      setSelectedOrgId(user.organizationId);
    } else if (organizations && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [user, organizations]);

  // Get incidents
  const { data: incidentsData, refetch: refetchIncidents } = trpc.incidents.list.useQuery(
    { organizationId: selectedOrgId || undefined },
    { enabled: !!selectedOrgId }
  );

  // Get active incident (most recent active)
  const activeIncident = incidentsData?.incidents?.find((i: any) => i.status === 'active');

  // Get incident details
  const { data: incidentDetails, refetch: refetchDetails } = trpc.incidents.getById.useQuery(
    { id: activeIncident?.id || 0 },
    { enabled: !!activeIncident?.id }
  );

  // Get linked ticket (if incident was created from a ticket)
  const { data: linkedTicket } = trpc.incidents.getLinkedTicket.useQuery(
    { incidentId: activeIncident?.id || 0 },
    { enabled: !!activeIncident?.id }
  );

  // Mutations
  const createIncidentMutation = trpc.incidents.create.useMutation({
    onSuccess: () => {
      toast.success('Incidente criado com sucesso');
      setShowNewIncidentDialog(false);
      refetchIncidents();
      setNewIncident({
        title: '',
        description: '',
        knowledgeAt: new Date().toISOString().slice(0, 16),
        riskLevel: 'medium'
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar incidente: ${error.message}`);
    }
  });

  const toggleChecklistMutation = trpc.incidents.toggleChecklistItem.useMutation({
    onSuccess: () => {
      refetchDetails();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    }
  });

  const addLogMutation = trpc.incidents.addLog.useMutation({
    onSuccess: () => {
      refetchDetails();
    }
  });

  const updateIncidentMutation = trpc.incidents.update.useMutation({
    onSuccess: () => {
      toast.success('Incidente atualizado');
      refetchIncidents();
      refetchDetails();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const handleCreateIncident = () => {
    if (!selectedOrgId) {
      toast.error('Selecione uma organização');
      return;
    }
    createIncidentMutation.mutate({
      organizationId: selectedOrgId,
      title: newIncident.title,
      description: newIncident.description,
      detectedAt: new Date().toISOString(),
      knowledgeAt: new Date(newIncident.knowledgeAt).toISOString(),
      riskLevel: newIncident.riskLevel
    });
  };

  const handleToggleCheckItem = (phaseId: number, itemId: string, isChecked: boolean) => {
    if (!activeIncident) return;
    toggleChecklistMutation.mutate({
      incidentId: activeIncident.id,
      phaseId,
      itemId,
      isChecked
    });
  };

  const handleCloseIncident = () => {
    if (!activeIncident) return;
    updateIncidentMutation.mutate({
      id: activeIncident.id,
      status: 'closed'
    });
  };

  const togglePhaseExpanded = (phaseId: number) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const currentTime = new Date().toLocaleTimeString('pt-BR');
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-slate-950 to-slate-900 border-b-2 border-cyan-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-2xl font-bold text-cyan-400 tracking-wider">
              SEUSDADOS
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
              activeIncident 
                ? 'border-red-500 bg-red-500/10 animate-pulse' 
                : 'border-green-500 bg-green-500/10'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                activeIncident ? 'bg-red-500' : 'bg-green-500'
              } animate-pulse`} />
              <span className="font-semibold text-sm">
                {activeIncident ? 'INCIDENTE ATIVO' : 'STANDBY'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Organization selector */}
            {(user?.role === 'admin_global' || user?.role === 'consultor') && organizations && (
              <Select 
                value={selectedOrgId?.toString() || ''} 
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="text-right">
              <div className="text-xl font-bold text-cyan-400 tabular-nums">{currentTime}</div>
              <div className="text-xs text-slate-400">{currentDate}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="grid grid-cols-[320px_1fr_350px] gap-6 p-6 min-h-[calc(100vh-80px)]">
        {/* Left Panel */}
        <aside className="space-y-6">
          {/* Countdown */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Prazo ANPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CountdownDisplay knowledgeAt={incidentDetails?.knowledgeAt || null} />
            </CardContent>
          </Card>

          {/* Start/End Incident */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              {!activeIncident ? (
                <Dialog open={showNewIncidentDialog} onOpenChange={setShowNewIncidentDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <Play className="w-4 h-4 mr-2" />
                      INICIAR PROTOCOLO
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle>Novo Incidente de Segurança</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Título do Incidente</Label>
                        <Input 
                          value={newIncident.title}
                          onChange={(e) => setNewIncident(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ex: Vazamento de dados de clientes"
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea 
                          value={newIncident.description}
                          onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descreva o incidente..."
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <Label>Data/Hora do Conhecimento</Label>
                        <Input 
                          type="datetime-local"
                          value={newIncident.knowledgeAt}
                          onChange={(e) => setNewIncident(prev => ({ ...prev, knowledgeAt: e.target.value }))}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <Label>Nível de Risco</Label>
                        <Select 
                          value={newIncident.riskLevel}
                          onValueChange={(v: any) => setNewIncident(prev => ({ ...prev, riskLevel: v }))}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixo</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="high">Alto</SelectItem>
                            <SelectItem value="critical">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewIncidentDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateIncident}
                        disabled={!newIncident.title || createIncidentMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {createIncidentMutation.isPending ? 'Criando...' : 'Iniciar Incidente'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCloseIncident}
                >
                  <Square className="w-4 h-4 mr-2" />
                  ENCERRAR INCIDENTE
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 border-slate-700 hover:border-cyan-500"
                  onClick={() => window.open('https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis', '_blank')}
                >
                  <FileText className="w-6 h-6 mb-2 text-cyan-400" />
                  <span className="text-xs">Form. ANPD</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 border-slate-700 hover:border-cyan-500"
                  onClick={() => toast.info('Template de notificação em desenvolvimento')}
                >
                  <Bell className="w-6 h-6 mb-2 text-cyan-400" />
                  <span className="text-xs">Notif. Titular</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 border-slate-700 hover:border-cyan-500"
                  onClick={() => toast.info('Relatório RTI em desenvolvimento')}
                >
                  <FileText className="w-6 h-6 mb-2 text-cyan-400" />
                  <span className="text-xs">Relatório RTI</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 border-slate-700 hover:border-cyan-500"
                  onClick={() => toast.info('Exportação em desenvolvimento')}
                >
                  <RefreshCw className="w-6 h-6 mb-2 text-cyan-400" />
                  <span className="text-xs">Exportar</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Linked Ticket Card */}
          {linkedTicket && (
            <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Chamado Vinculado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-mono text-white">
                    #{linkedTicket.ticketNumber?.toString().padStart(6, '0') || linkedTicket.id}
                  </p>
                  <p className="text-xs text-white/70 line-clamp-2">
                    {linkedTicket.title}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-2 border-white/30 hover:border-white/50 text-white"
                    onClick={() => navigate(`/meudpo/${linkedTicket.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Chamado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Center Panel - Phases */}
        <section className="space-y-4">
          {/* Phase Progress Bar */}
          {incidentDetails && (
            <div className="flex items-center justify-between mb-6">
              {incidentDetails.phases.map((phase: any, idx: number) => (
                <React.Fragment key={phase.id}>
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all ${
                      phase.id === incidentDetails.currentPhaseId 
                        ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/40 animate-pulse' 
                        : phase.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                    onClick={() => togglePhaseExpanded(phase.id)}
                  >
                    {phase.status === 'completed' ? '✓' : phase.id}
                  </div>
                  {idx < incidentDetails.phases.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      phase.status === 'completed' ? 'bg-green-500' : 'bg-slate-700'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Phase Cards */}
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)]">
            {incidentDetails?.phases.map((phase: any) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                isActive={phase.id === incidentDetails.currentPhaseId}
                isExpanded={expandedPhases.includes(phase.id)}
                onToggle={() => togglePhaseExpanded(phase.id)}
                onCheckItem={(itemId, isChecked) => handleToggleCheckItem(phase.id, itemId, isChecked)}
              />
            ))}
            {!incidentDetails && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-400">Nenhum incidente ativo</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Clique em "Iniciar Protocolo" para registrar um novo incidente
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Right Panel - Logs */}
        <aside className="space-y-6">
          {/* Incident Info */}
          {incidentDetails && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Incidente Ativo</span>
                  <Badge className={
                    incidentDetails.riskLevel === 'critical' ? 'bg-red-500' :
                    incidentDetails.riskLevel === 'high' ? 'bg-orange-500' :
                    incidentDetails.riskLevel === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }>
                    {incidentDetails.riskLevel === 'critical' ? 'Crítico' :
                     incidentDetails.riskLevel === 'high' ? 'Alto' :
                     incidentDetails.riskLevel === 'medium' ? 'Médio' : 'Baixo'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold">{incidentDetails.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{incidentDetails.description}</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p>Conhecimento: {new Date(incidentDetails.knowledgeAt).toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card className="bg-slate-800/50 border-slate-700 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Log de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {incidentDetails?.logs?.map((log: any) => (
                  <LogEntry key={log.id} log={log} />
                ))}
                {(!incidentDetails?.logs || incidentDetails.logs.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Nenhuma atividade registrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
