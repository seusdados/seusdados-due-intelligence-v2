// Página de Gerenciamento de Cenários do Simulador CPPD
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Plus,
  Target,
  Edit,
  Trash2,
  Copy,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

// Cenários pré-configurados (templates)
const CENARIOS_TEMPLATES = [
  {
    nome: "Vazamento de Dados Pessoais",
    tipoIncidente: "Vazamento de Dados",
    descricao: "Simulação de vazamento de dados pessoais de clientes através de acesso não autorizado ao banco de dados. Cenário inclui detecção, contenção, notificação à ANPD e comunicação aos titulares.",
    areasEnvolvidas: ["TI", "Jurídico", "DPO", "Comunicação", "RH"],
    sistemasAfetados: ["CRM", "Banco de Dados de Clientes", "Portal Web"],
    objetivos: [
      "Testar tempo de detecção do incidente",
      "Avaliar processo de comunicação interna",
      "Validar procedimento de notificação à ANPD",
      "Verificar plano de comunicação aos titulares"
    ],
    papeisChave: ["DPO", "CISO", "Gerente de TI", "Jurídico", "Comunicação"],
    criteriosSucesso: [
      "Detecção em menos de 24 horas",
      "Contenção em menos de 4 horas após detecção",
      "Notificação à ANPD em até 72 horas",
      "Comunicação aos titulares em até 5 dias"
    ]
  },
  {
    nome: "Ataque Ransomware",
    tipoIncidente: "Ataque Cibernético",
    descricao: "Simulação de ataque ransomware que criptografa sistemas críticos. Cenário aborda resposta técnica, decisão sobre pagamento, recuperação de backups e comunicação de crise.",
    areasEnvolvidas: ["TI", "Segurança", "Diretoria", "Jurídico", "Comunicação"],
    sistemasAfetados: ["Servidores de Arquivos", "ERP", "E-mail", "Sistemas de Backup"],
    objetivos: [
      "Testar procedimentos de isolamento de rede",
      "Avaliar integridade dos backups",
      "Validar processo de tomada de decisão",
      "Verificar comunicação de crise"
    ],
    papeisChave: ["CISO", "Gerente de TI", "CEO", "CFO", "Jurídico"],
    criteriosSucesso: [
      "Isolamento da rede em menos de 1 hora",
      "Identificação do vetor de ataque",
      "Recuperação de sistemas críticos em 24 horas",
      "Zero pagamento de resgate"
    ]
  },
  {
    nome: "Acesso Não Autorizado",
    tipoIncidente: "Violação de Acesso",
    descricao: "Simulação de acesso não autorizado a sistemas sensíveis por colaborador ou terceiro. Cenário inclui investigação, revogação de acessos e análise de impacto.",
    areasEnvolvidas: ["TI", "Segurança", "RH", "Jurídico", "Compliance"],
    sistemasAfetados: ["Active Directory", "VPN", "Sistemas Financeiros", "Documentos Confidenciais"],
    objetivos: [
      "Testar detecção de acessos anômalos",
      "Avaliar processo de revogação de acessos",
      "Validar investigação forense",
      "Verificar medidas disciplinares"
    ],
    papeisChave: ["CISO", "Gerente de RH", "Jurídico", "Compliance Officer", "Gerente de TI"],
    criteriosSucesso: [
      "Detecção de acesso anômalo em menos de 2 horas",
      "Revogação de acessos em menos de 30 minutos",
      "Preservação de evidências",
      "Relatório de investigação em 48 horas"
    ]
  },
  {
    nome: "Perda de Dispositivo Móvel",
    tipoIncidente: "Perda/Roubo de Equipamento",
    descricao: "Simulação de perda ou roubo de notebook/celular corporativo contendo dados sensíveis. Cenário aborda localização, bloqueio remoto e avaliação de dados expostos.",
    areasEnvolvidas: ["TI", "Segurança", "RH", "DPO"],
    sistemasAfetados: ["MDM", "E-mail Corporativo", "VPN", "Documentos Locais"],
    objetivos: [
      "Testar procedimento de bloqueio remoto",
      "Avaliar inventário de dados no dispositivo",
      "Validar criptografia de disco",
      "Verificar notificação de incidente"
    ],
    papeisChave: ["Gerente de TI", "Segurança da Informação", "DPO", "RH"],
    criteriosSucesso: [
      "Bloqueio remoto em menos de 1 hora",
      "Wipe remoto executado se necessário",
      "Inventário de dados em 4 horas",
      "Avaliação de risco concluída em 24 horas"
    ]
  },
  {
    nome: "Falha de Fornecedor Crítico",
    tipoIncidente: "Incidente de Terceiros",
    descricao: "Simulação de incidente de segurança em fornecedor que processa dados pessoais. Cenário aborda avaliação de impacto, comunicação e ações contratuais.",
    areasEnvolvidas: ["Compras", "Jurídico", "DPO", "TI", "Área de Negócio"],
    sistemasAfetados: ["Sistemas do Fornecedor", "Integrações API", "Dados Compartilhados"],
    objetivos: [
      "Testar comunicação com fornecedor",
      "Avaliar cláusulas contratuais",
      "Validar plano de contingência",
      "Verificar notificação regulatória"
    ],
    papeisChave: ["DPO", "Gerente de Compras", "Jurídico", "Gerente de TI", "Área de Negócio"],
    criteriosSucesso: [
      "Contato com fornecedor em menos de 2 horas",
      "Avaliação de impacto em 24 horas",
      "Plano de contingência ativado se necessário",
      "Documentação completa do incidente"
    ]
  }
];

export default function SimuladorCenarios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(user?.organizationId || null);

  // Query para listar organizações (para admin_global e consultor)
  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: user?.role === 'admin_global' || user?.role === 'consultor',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    tipoIncidente: "",
    descricao: "",
    areasEnvolvidas: "",
    sistemasAfetados: "",
    objetivos: "",
    papeisChave: "",
    criteriosSucesso: "",
    trimestre: "",
    isTemplate: false,
  });

  // Query para listar cenários
  const { data: scenarios, isLoading, refetch } = trpc.scenario.list.useQuery(
    { organizationId: selectedOrgId!, includeTemplates: true },
    { enabled: !!selectedOrgId }
  );

  // Query para listar templates do banco de dados
  const { data: dbTemplates } = trpc.scenario.listTemplates.useQuery();

  // Usar templates do banco de dados (se disponíveis) ou fallback para hardcoded
  const allTemplates = (dbTemplates && dbTemplates.length > 0)
    ? dbTemplates.map(t => ({
        id: t.id,
        nome: t.nome,
        tipoIncidente: t.tipoIncidente,
        descricao: t.descricao,
        areasEnvolvidas: t.areasEnvolvidas || [],
        sistemasAfetados: t.sistemasAfetados || [],
        objetivos: t.objetivos || [],
        papeisChave: t.papeisChave || [],
        criteriosSucesso: t.criteriosSucesso || [],
        trimestre: t.trimestre,
        fromDb: true,
      }))
    : CENARIOS_TEMPLATES;

  // Mutation para criar cenário
  const createScenario = trpc.scenario.create.useMutation({
    onSuccess: () => {
      toast.success("Cenário criado com sucesso!");
      setIsCreateDialogOpen(false);
      setIsTemplateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar cenário: ${error.message}`);
    },
  });

  // Mutation para deletar cenário
  const deleteScenario = trpc.scenario.delete.useMutation({
    onSuccess: () => {
      toast.success("Cenário excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir cenário: ${error.message}`);
    },
  });

  // Mutation para duplicar cenário
  const duplicateScenario = trpc.scenario.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Cenário duplicado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao duplicar cenário: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      tipoIncidente: "",
      descricao: "",
      areasEnvolvidas: "",
      sistemasAfetados: "",
      objetivos: "",
      papeisChave: "",
      criteriosSucesso: "",
      trimestre: "",
      isTemplate: false,
    });
    setEditingScenario(null);
  };

  const handleCreateFromTemplate = (template: typeof CENARIOS_TEMPLATES[0] & { id?: number; fromDb?: boolean; trimestre?: string | null }) => {
    if (!selectedOrgId) {
      toast.error("Organização não selecionada. Por favor, selecione uma organização.");
      return;
    }

    createScenario.mutate({
      organizationId: selectedOrgId,
      nome: template.nome,
      tipoIncidente: template.tipoIncidente,
      descricao: template.descricao,
      areasEnvolvidas: template.areasEnvolvidas,
      sistemasAfetados: template.sistemasAfetados,
      objetivos: template.objetivos,
      papeisChave: template.papeisChave,
      criteriosSucesso: template.criteriosSucesso,
      trimestre: template.trimestre || undefined,
      isTemplate: false,
    });
  };

  const handleSubmit = () => {
    if (!selectedOrgId) return;
    if (!formData.nome.trim()) {
      toast.error("Nome do cenário é obrigatório");
      return;
    }

    createScenario.mutate({
      organizationId: selectedOrgId,
      nome: formData.nome,
      tipoIncidente: formData.tipoIncidente,
      descricao: formData.descricao,
      areasEnvolvidas: formData.areasEnvolvidas.split(",").map(s => s.trim()).filter(Boolean),
      sistemasAfetados: formData.sistemasAfetados.split(",").map(s => s.trim()).filter(Boolean),
      objetivos: formData.objetivos.split("\n").map(s => s.trim()).filter(Boolean),
      papeisChave: formData.papeisChave.split(",").map(s => s.trim()).filter(Boolean),
      criteriosSucesso: formData.criteriosSucesso.split("\n").map(s => s.trim()).filter(Boolean),
      trimestre: formData.trimestre || undefined,
      isTemplate: formData.isTemplate,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cenário?")) {
      deleteScenario.mutate({ id });
    }
  };

  const handleDuplicate = (id: number, nome: string) => {
    duplicateScenario.mutate({
      id,
      newName: `${nome} (Cópia)`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/simulador-cppd")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              SIMULADOR CPPD
            </p>
            <h1 className="text-3xl font-light text-foreground">
              Gerenciamento de <span className="text-primary">Cenários</span>
            </h1>
          </div>
        </div>

        {/* Seletor de Organização para Admin/Consultor */}
        {(user?.role === 'admin_global' || user?.role === 'consultor') && organizations && organizations.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="org-select" className="body-small whitespace-nowrap">
              Organização:
            </Label>
            <Select
              value={selectedOrgId?.toString() || ''}
              onValueChange={(value) => setSelectedOrgId(Number(value))}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione uma organização" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Usar Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cenários Pré-Configurados</DialogTitle>
                <DialogDescription>
                  Selecione um template para criar rapidamente um cenário de simulação
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {allTemplates.map((template, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{template.nome}</h3>
                          <Badge variant="secondary" className="mt-1">
                            {template.tipoIncidente}
                          </Badge>
                          <p className="body-small mt-2 line-clamp-2">
                            {template.descricao}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {template.areasEnvolvidas.slice(0, 4).map((area, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {template.areasEnvolvidas.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.areasEnvolvidas.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFromTemplate(template);
                          }}
                          disabled={createScenario.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Usar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cenário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingScenario ? "Editar Cenário" : "Novo Cenário"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do cenário de simulação
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Cenário *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Vazamento de Dados Pessoais"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tipoIncidente">Tipo de Incidente</Label>
                  <Select
                    value={formData.tipoIncidente}
                    onValueChange={(value) => setFormData({ ...formData, tipoIncidente: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vazamento de Dados">Vazamento de Dados</SelectItem>
                      <SelectItem value="Ataque Cibernético">Ataque Cibernético</SelectItem>
                      <SelectItem value="Violação de Acesso">Violação de Acesso</SelectItem>
                      <SelectItem value="Perda/Roubo de Equipamento">Perda/Roubo de Equipamento</SelectItem>
                      <SelectItem value="Incidente de Terceiros">Incidente de Terceiros</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o cenário de simulação..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="areasEnvolvidas">Áreas Envolvidas (separadas por vírgula)</Label>
                  <Input
                    id="areasEnvolvidas"
                    value={formData.areasEnvolvidas}
                    onChange={(e) => setFormData({ ...formData, areasEnvolvidas: e.target.value })}
                    placeholder="TI, Jurídico, DPO, Comunicação"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sistemasAfetados">Sistemas Afetados (separados por vírgula)</Label>
                  <Input
                    id="sistemasAfetados"
                    value={formData.sistemasAfetados}
                    onChange={(e) => setFormData({ ...formData, sistemasAfetados: e.target.value })}
                    placeholder="CRM, ERP, Banco de Dados"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="objetivos">Objetivos (um por linha)</Label>
                  <Textarea
                    id="objetivos"
                    value={formData.objetivos}
                    onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                    placeholder="Testar tempo de detecção&#10;Avaliar comunicação interna&#10;Validar procedimentos"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="papeisChave">Papéis-Chave (separados por vírgula)</Label>
                  <Input
                    id="papeisChave"
                    value={formData.papeisChave}
                    onChange={(e) => setFormData({ ...formData, papeisChave: e.target.value })}
                    placeholder="DPO, CISO, Gerente de TI"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="criteriosSucesso">Critérios de Sucesso (um por linha)</Label>
                  <Textarea
                    id="criteriosSucesso"
                    value={formData.criteriosSucesso}
                    onChange={(e) => setFormData({ ...formData, criteriosSucesso: e.target.value })}
                    placeholder="Detecção em menos de 24 horas&#10;Contenção em menos de 4 horas&#10;Notificação em até 72 horas"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="trimestre">Trimestre</Label>
                  <Select
                    value={formData.trimestre}
                    onValueChange={(value) => setFormData({ ...formData, trimestre: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-Q1">2025 Q1</SelectItem>
                      <SelectItem value="2025-Q2">2025 Q2</SelectItem>
                      <SelectItem value="2025-Q3">2025 Q3</SelectItem>
                      <SelectItem value="2025-Q4">2025 Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createScenario.isPending}>
                  {createScenario.isPending ? "Salvando..." : "Salvar Cenário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Cenários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Cenários Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedOrgId ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500 opacity-70" />
              <p className="text-lg font-light">Selecione uma organização</p>
              <p className="text-sm mt-2">
                Para gerenciar cenários, selecione uma organização no seletor acima
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !scenarios || scenarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-light">Nenhum cenário cadastrado</p>
              <p className="text-sm mt-2">
                Crie um novo cenário ou use um dos templates pré-configurados
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                  <Target className="h-4 w-4 mr-2" />
                  Usar Template
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cenário
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{scenario.nome}</h3>
                          {scenario.isTemplate && (
                            <Badge variant="secondary">Template</Badge>
                          )}
                        </div>

                        <Badge variant="outline">{scenario.tipoIncidente}</Badge>

                        <p className="body-small line-clamp-2">
                          {scenario.descricao}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {(scenario.areasEnvolvidas as string[]).slice(0, 4).map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {(scenario.areasEnvolvidas as string[]).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{(scenario.areasEnvolvidas as string[]).length - 4}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 body-small">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{(scenario.papeisChave as string[]).length} papéis-chave</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>{(scenario.criteriosSucesso as string[]).length} critérios</span>
                          </div>
                          {scenario.trimestre && (
                            <Badge variant="outline">{scenario.trimestre}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDuplicate(scenario.id, scenario.nome)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(scenario.id)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
