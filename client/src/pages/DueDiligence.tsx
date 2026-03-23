import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FileSearch, Plus, Search, Play, Eye, MoreHorizontal, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { AcionarDPO } from "@/components/AcionarDPO";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "secondary" },
  concluida: { label: "Concluída", variant: "default" },
  arquivada: { label: "Arquivada", variant: "destructive" },
};

const riskColors: Record<string, string> = {
  baixo: "bg-green-500",
  moderado: "bg-yellow-500",
  alto: "bg-orange-500",
  critico: "bg-red-500",
};

const riskLabels: Record<string, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export default function DueDiligence() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedOrganization } = useOrganization();
  
  // Extrair organizationId da URL se presente (rota /cliente/:organizationId/due-diligence)
  const urlOrgId = location.match(/\/cliente\/(\d+)\/due-diligence/)?.[1];
  const selectedOrgId = urlOrgId ? parseInt(urlOrgId) : (selectedOrganization?.id || null);

  const isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor';

  const effectiveOrgId = isAdminOrConsultor ? selectedOrgId : user?.organizationId;

  const { data: thirdParties } = trpc.thirdParty.list.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  const { data: assessments, isLoading } = trpc.thirdPartyAssessment.list.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  const filteredAssessments = assessments?.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getProgressPercent = (answered: number | null, total: number | null) => {
    if (!total || total === 0) return 0;
    return Math.round(((answered || 0) / total) * 100);
  };

  const getThirdPartyName = (thirdPartyId: number) => {
    return thirdParties?.find(tp => tp.id === thirdPartyId)?.name || "Terceiro";
  };

  return (
    <div className="space-y-6">
      <DynamicBreadcrumbs />
      <PageHeader
        title="Maturidade de Terceiros"
        subtitle="Avaliações de maturidade e risco de parceiros e fornecedores"
        icon={FileSearch}
        showBack={false}
        showDPOButton={true}
        dpoContext={{
          module: "Maturidade de Terceiros",
          page: "Lista de Avaliações"
        }}
        actions={
          <Button 
            className="btn-gold"
            onClick={() => {
              // Navegar para a página de nova avaliação (modelo correto)
              const targetUrl = effectiveOrgId 
                ? `/cliente/${effectiveOrgId}/due-diligence/nova`
                : '/due-diligence/nova';
              setLocation(targetUrl);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>
        }
      />

      {/* Cards de KPI usando componente reutilizável */}
      {effectiveOrgId && (
        <KPICards
          cards={[
            {
              title: "Total",
              value: assessments?.length || 0,
              subtitle: "avaliações",
              icon: FileSearch,
              color: "violet"
            },
            {
              title: "Concluídas",
              value: assessments?.filter(a => a.status === 'concluida').length || 0,
              subtitle: "finalizadas",
              icon: CheckCircle,
              color: "emerald"
            },
            {
              title: "Em Andamento",
              value: assessments?.filter(a => a.status === 'em_andamento').length || 0,
              subtitle: "em progresso",
              icon: Clock,
              color: "amber"
            },
            {
              title: "Risco Alto/Crítico",
              value: assessments?.filter(a => a.riskClassification === 'alto' || a.riskClassification === 'critico').length || 0,
              subtitle: "requerem atenção",
              icon: AlertTriangle,
              color: "red"
            }
          ] as KPICardData[]}
        />
      )}

      {isAdminOrConsultor && !selectedOrganization && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Selecione uma organização no menu lateral para visualizar e gerenciar avaliações.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar avaliações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredAssessments.length} {filteredAssessments.length === 1 ? 'avaliação' : 'avaliações'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!effectiveOrgId ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-medium mb-1">Selecione uma organização</h3>
              <p className="body-small">
                Escolha uma organização para visualizar suas avaliações
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <FileSearch className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-1">Nenhuma avaliação encontrada</h3>
              <p className="body-small">
                {searchTerm ? "Tente ajustar sua busca" : "Comece criando uma nova avaliação"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Terceiro</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.map((assessment) => {
                  const progress = getProgressPercent(assessment.answeredQuestions, assessment.totalQuestions);
                  const status = statusLabels[assessment.status];

                  return (
                    <TableRow key={assessment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <p className="font-medium">{assessment.title}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {getThirdPartyName(assessment.thirdPartyId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={progress} className="h-2" />
                          <span className="text-xs text-muted-foreground w-10">
                            {progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assessment.riskClassification ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${riskColors[assessment.riskClassification]}`} />
                            <span>{riskLabels[assessment.riskClassification]}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="body-small">
                        {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {assessment.status !== 'concluida' && (
                              <DropdownMenuItem onClick={() => setLocation(`/due-diligence/avaliacao/${assessment.id}`)}>
                                <Play className="mr-2 h-4 w-4" />
                                Continuar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setLocation(`/due-diligence/resultado/${assessment.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Resultado
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
