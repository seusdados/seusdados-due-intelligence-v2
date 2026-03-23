/**
 * Biblioteca de Templates de Cláusulas LGPD
 * Componente para buscar, visualizar e inserir cláusulas padrão nas análises
 */

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Library,
  Search,
  FileText,
  Shield,
  Users,
  Lock,
  Globe,
  AlertTriangle,
  Clock,
  CheckCircle,
  Copy,
  Plus,
  Eye,
  Star,
  Bookmark,
  BookmarkCheck,
  Filter,
  ChevronRight,
} from "lucide-react";

// Categorias de cláusulas
const CLAUSE_CATEGORIES = [
  { id: "all", name: "Todas", icon: Library },
  { id: "identification", name: "Identificação", icon: Users },
  { id: "processing", name: "Tratamento", icon: FileText },
  { id: "security", name: "Segurança", icon: Lock },
  { id: "rights", name: "Direitos", icon: Shield },
  { id: "international", name: "Internacional", icon: Globe },
  { id: "incidents", name: "Incidentes", icon: AlertTriangle },
  { id: "retention", name: "Retenção", icon: Clock },
];

// Templates de cláusulas padrão
const STANDARD_CLAUSE_TEMPLATES = [
  {
    id: "cl_identificacao_partes",
    category: "identification",
    name: "Identificação das Partes",
    description: "Cláusula padrão para identificação de controlador e operador",
    tags: ["controlador", "operador", "partes"],
    popularity: 95,
    content: `**CLÁUSULA {{numero}} - IDENTIFICAÇÃO DAS PARTES E PAPÉIS**

{{numero}}.1. Para os fins desta cláusula e em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), as Partes declaram que:

a) **{{nome_controlador}}**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cnpj_controlador}}, com sede em {{endereco_controlador}}, atua na qualidade de **CONTROLADOR** dos dados pessoais, sendo responsável pelas decisões referentes ao tratamento de dados pessoais;

b) **{{nome_operador}}**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cnpj_operador}}, com sede em {{endereco_operador}}, atua na qualidade de **OPERADOR** dos dados pessoais, realizando o tratamento de dados pessoais em nome do Controlador.

{{numero}}.2. O Operador declara que possui estrutura técnica e organizacional adequada para garantir a segurança e confidencialidade dos dados pessoais tratados.`,
  },
  {
    id: "cl_finalidades_tratamento",
    category: "processing",
    name: "Finalidades do Tratamento",
    description: "Define as finalidades específicas para o tratamento de dados",
    tags: ["finalidade", "tratamento", "lgpd"],
    popularity: 92,
    content: `**CLÁUSULA {{numero}} - FINALIDADES DO TRATAMENTO**

{{numero}}.1. O tratamento de dados pessoais objeto deste instrumento tem como finalidades exclusivas:

{{#each finalidades}}
{{@index}}. {{this}};
{{/each}}

{{numero}}.2. O Operador compromete-se a não utilizar os dados pessoais para finalidades diversas das estabelecidas nesta cláusula, salvo mediante autorização prévia e expressa do Controlador.

{{numero}}.3. Qualquer alteração nas finalidades do tratamento deverá ser previamente comunicada ao Controlador e aos titulares dos dados, quando aplicável.`,
  },
  {
    id: "cl_bases_legais",
    category: "processing",
    name: "Bases Legais",
    description: "Especifica as bases legais para o tratamento de dados",
    tags: ["base legal", "consentimento", "lgpd"],
    popularity: 90,
    content: `**CLÁUSULA {{numero}} - BASES LEGAIS PARA O TRATAMENTO**

{{numero}}.1. O tratamento de dados pessoais objeto deste instrumento fundamenta-se nas seguintes bases legais previstas no art. 7º da LGPD:

{{#if base_consentimento}}
a) Consentimento do titular (art. 7º, I);
{{/if}}
{{#if base_contrato}}
b) Execução de contrato ou procedimentos preliminares (art. 7º, V);
{{/if}}
{{#if base_legitimo_interesse}}
c) Legítimo interesse do controlador (art. 7º, IX);
{{/if}}
{{#if base_obrigacao_legal}}
d) Cumprimento de obrigação legal ou regulatória (art. 7º, II);
{{/if}}

{{numero}}.2. O Controlador declara que mantém registro das bases legais aplicáveis a cada operação de tratamento, conforme exigido pela LGPD.`,
  },
  {
    id: "cl_categorias_dados",
    category: "processing",
    name: "Categorias de Dados",
    description: "Especifica as categorias de dados pessoais tratados",
    tags: ["categorias", "dados pessoais", "sensíveis"],
    popularity: 88,
    content: `**CLÁUSULA {{numero}} - CATEGORIAS DE DADOS PESSOAIS**

{{numero}}.1. As categorias de dados pessoais objeto do tratamento são:

**Dados de identificação:**
- Nome completo, CPF, RG, data de nascimento;
- Endereço residencial e comercial;
- Dados de contato (telefone, e-mail).

{{#if dados_sensiveis}}
**Dados sensíveis (art. 11 da LGPD):**
{{#each dados_sensiveis}}
- {{this}};
{{/each}}
{{/if}}

{{numero}}.2. O tratamento de dados sensíveis, quando aplicável, observará as hipóteses específicas previstas no art. 11 da LGPD.

{{numero}}.3. As categorias de titulares dos dados são: {{categorias_titulares}}.`,
  },
  {
    id: "cl_menores",
    category: "processing",
    name: "Dados de Menores",
    description: "Tratamento de dados de crianças e adolescentes",
    tags: ["menores", "crianças", "adolescentes", "consentimento"],
    popularity: 75,
    content: `**CLÁUSULA {{numero}} - TRATAMENTO DE DADOS DE CRIANÇAS E ADOLESCENTES**

{{numero}}.1. O tratamento de dados pessoais de crianças (menores de 12 anos) será realizado exclusivamente:

a) Com o consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal;
b) No melhor interesse da criança, conforme art. 14 da LGPD.

{{numero}}.2. Para o tratamento de dados de adolescentes (12 a 18 anos), será observado o disposto no Estatuto da Criança e do Adolescente, garantindo-se a participação do menor na manifestação de vontade, quando aplicável.

{{numero}}.3. O Operador implementará controles específicos para verificação da idade dos titulares e obtenção do consentimento parental, quando necessário.`,
  },
  {
    id: "cl_seguranca_tecnica",
    category: "security",
    name: "Medidas de Segurança Técnicas",
    description: "Medidas técnicas de segurança da informação",
    tags: ["segurança", "técnico", "criptografia"],
    popularity: 94,
    content: `**CLÁUSULA {{numero}} - MEDIDAS DE SEGURANÇA TÉCNICAS**

{{numero}}.1. O Operador implementará e manterá as seguintes medidas técnicas de segurança:

a) **Criptografia:** Utilização de criptografia AES-256 para dados em repouso e TLS 1.3 para dados em trânsito;

b) **Controle de acesso:** Implementação de autenticação multifator (MFA) e princípio do menor privilégio;

c) **Monitoramento:** Sistemas de detecção de intrusão (IDS/IPS) e monitoramento contínuo de logs;

d) **Backup:** Realização de backups diários com retenção mínima de {{dias_backup}} dias e testes periódicos de restauração;

e) **Firewall:** Implementação de firewall de aplicação web (WAF) e firewall de rede.

{{numero}}.2. O Operador realizará testes de vulnerabilidade e penetração com periodicidade mínima {{periodicidade_testes}}.`,
  },
  {
    id: "cl_seguranca_organizacional",
    category: "security",
    name: "Medidas de Segurança Organizacionais",
    description: "Medidas organizacionais de proteção de dados",
    tags: ["segurança", "organizacional", "políticas"],
    popularity: 85,
    content: `**CLÁUSULA {{numero}} - MEDIDAS DE SEGURANÇA ORGANIZACIONAIS**

{{numero}}.1. O Operador manterá as seguintes medidas organizacionais:

a) **Política de Segurança da Informação:** Documento formal aprovado pela alta direção;

b) **Treinamento:** Programa de conscientização e treinamento em proteção de dados para todos os colaboradores;

c) **Termo de Confidencialidade:** Assinatura de termo de confidencialidade por todos os colaboradores com acesso a dados pessoais;

d) **Gestão de Acessos:** Processo formal de concessão, revisão e revogação de acessos;

e) **Classificação da Informação:** Sistema de classificação e rotulagem de dados.

{{numero}}.2. O Operador designará um Encarregado de Proteção de Dados (DPO) nos termos do art. 41 da LGPD.`,
  },
  {
    id: "cl_direitos_titulares",
    category: "rights",
    name: "Direitos dos Titulares",
    description: "Garantia dos direitos previstos na LGPD",
    tags: ["direitos", "titulares", "acesso", "correção"],
    popularity: 91,
    content: `**CLÁUSULA {{numero}} - DIREITOS DOS TITULARES**

{{numero}}.1. O Operador auxiliará o Controlador no atendimento aos direitos dos titulares previstos no art. 18 da LGPD:

a) Confirmação da existência de tratamento;
b) Acesso aos dados;
c) Correção de dados incompletos, inexatos ou desatualizados;
d) Anonimização, bloqueio ou eliminação de dados desnecessários;
e) Portabilidade dos dados;
f) Eliminação dos dados tratados com consentimento;
g) Informação sobre compartilhamento;
h) Informação sobre a possibilidade de não fornecer consentimento;
i) Revogação do consentimento.

{{numero}}.2. O prazo para resposta às solicitações dos titulares será de até {{prazo_resposta}} dias úteis.

{{numero}}.3. O Operador manterá canal de atendimento disponível em: {{canal_atendimento}}.`,
  },
  {
    id: "cl_transferencia_internacional",
    category: "international",
    name: "Transferência Internacional",
    description: "Regras para transferência internacional de dados",
    tags: ["internacional", "transferência", "adequação"],
    popularity: 70,
    content: `**CLÁUSULA {{numero}} - TRANSFERÊNCIA INTERNACIONAL DE DADOS**

{{numero}}.1. A transferência internacional de dados pessoais somente será realizada nas hipóteses previstas no art. 33 da LGPD:

a) Para países ou organismos internacionais que proporcionem grau de proteção adequado;
b) Mediante cláusulas contratuais específicas aprovadas pela ANPD;
c) Mediante cláusulas-padrão contratuais;
d) Com o consentimento específico e em destaque do titular.

{{numero}}.2. Os países de destino dos dados são: {{paises_destino}}.

{{numero}}.3. O Operador garante que os destinatários internacionais manterão nível de proteção equivalente ao exigido pela LGPD.`,
  },
  {
    id: "cl_incidentes_seguranca",
    category: "incidents",
    name: "Gestão de Incidentes",
    description: "Procedimentos para incidentes de segurança",
    tags: ["incidentes", "vazamento", "notificação"],
    popularity: 93,
    content: `**CLÁUSULA {{numero}} - GESTÃO DE INCIDENTES DE SEGURANÇA**

{{numero}}.1. O Operador notificará o Controlador sobre qualquer incidente de segurança que possa acarretar risco ou dano relevante aos titulares no prazo máximo de **{{prazo_notificacao}} horas** após a ciência do incidente.

{{numero}}.2. A notificação conterá, no mínimo:

a) Descrição da natureza dos dados pessoais afetados;
b) Informações sobre os titulares envolvidos;
c) Indicação das medidas técnicas e de segurança utilizadas;
d) Riscos relacionados ao incidente;
e) Medidas adotadas para reverter ou mitigar os efeitos.

{{numero}}.3. O Operador manterá registro de todos os incidentes de segurança, incluindo aqueles que não geraram notificação.

{{numero}}.4. O Operador colaborará com o Controlador na comunicação à ANPD e aos titulares, quando necessário.`,
  },
  {
    id: "cl_retencao_eliminacao",
    category: "retention",
    name: "Retenção e Eliminação",
    description: "Prazos de retenção e procedimentos de eliminação",
    tags: ["retenção", "eliminação", "prazo"],
    popularity: 87,
    content: `**CLÁUSULA {{numero}} - RETENÇÃO E ELIMINAÇÃO DE DADOS**

{{numero}}.1. Os dados pessoais serão retidos pelo período necessário ao cumprimento das finalidades para as quais foram coletados, observando-se:

a) Prazo de retenção padrão: {{prazo_retencao}};
b) Prazos legais específicos, quando aplicáveis;
c) Necessidade de guarda para defesa em processos judiciais ou administrativos.

{{numero}}.2. Ao término do tratamento, os dados pessoais serão eliminados de forma segura, mediante:

a) Destruição física de mídias;
b) Sobrescrita segura de dados digitais;
c) Anonimização irreversível.

{{numero}}.3. O Operador fornecerá certificado de eliminação ao Controlador no prazo de {{prazo_certificado}} dias após a conclusão do processo.`,
  },
  {
    id: "cl_suboperadores",
    category: "processing",
    name: "Suboperadores",
    description: "Regras para contratação de suboperadores",
    tags: ["suboperador", "terceiros", "autorização"],
    popularity: 82,
    content: `**CLÁUSULA {{numero}} - SUBOPERADORES**

{{numero}}.1. O Operador {{#if permite_suboperador}}poderá{{else}}não poderá{{/if}} contratar suboperadores para auxiliar no tratamento de dados pessoais{{#if permite_suboperador}}, mediante prévia autorização {{#if autorizacao_especifica}}específica{{else}}genérica{{/if}} do Controlador{{/if}}.

{{#if permite_suboperador}}
{{numero}}.2. Os suboperadores autorizados são:
{{#each suboperadores}}
- {{nome}}: {{finalidade}};
{{/each}}

{{numero}}.3. O Operador garantirá que os suboperadores estejam vinculados a obrigações de proteção de dados equivalentes às estabelecidas neste instrumento.

{{numero}}.4. O Operador permanecerá integralmente responsável perante o Controlador pelos atos de seus suboperadores.
{{/if}}`,
  },
  {
    id: "cl_auditoria",
    category: "security",
    name: "Auditoria e Fiscalização",
    description: "Direitos de auditoria do controlador",
    tags: ["auditoria", "fiscalização", "compliance"],
    popularity: 80,
    content: `**CLÁUSULA {{numero}} - AUDITORIA E FISCALIZAÇÃO**

{{numero}}.1. O Controlador terá direito de realizar auditorias nas instalações e sistemas do Operador para verificar o cumprimento das obrigações de proteção de dados, mediante aviso prévio de {{prazo_aviso}} dias úteis.

{{numero}}.2. O Operador disponibilizará ao Controlador:

a) Relatórios de conformidade;
b) Resultados de testes de segurança;
c) Registros de tratamento de dados;
d) Evidências de treinamentos realizados.

{{numero}}.3. As auditorias poderão ser realizadas pelo Controlador ou por auditor independente por ele designado, observada a confidencialidade das informações.

{{numero}}.4. O Operador corrigirá as não conformidades identificadas no prazo de {{prazo_correcao}} dias.`,
  },
  {
    id: "cl_responsabilidade_civil",
    category: "rights",
    name: "Responsabilidade Civil",
    description: "Responsabilização por danos causados",
    tags: ["responsabilidade", "indenização", "danos"],
    popularity: 78,
    content: `**CLÁUSULA {{numero}} - RESPONSABILIDADE CIVIL**

{{numero}}.1. O Operador será responsável pelos danos causados aos titulares em decorrência de:

a) Violação da legislação de proteção de dados;
b) Descumprimento das obrigações previstas neste instrumento;
c) Tratamento irregular ou não autorizado de dados pessoais.

{{numero}}.2. O Operador indenizará o Controlador por quaisquer perdas, danos, custos ou despesas decorrentes de:

a) Ações judiciais ou administrativas movidas por titulares;
b) Sanções aplicadas pela ANPD;
c) Incidentes de segurança causados por negligência do Operador.

{{numero}}.3. A responsabilidade do Operador {{#if limite_responsabilidade}}está limitada a {{limite_responsabilidade}}{{else}}não possui limitação de valor{{/if}}.`,
  },
  {
    id: "cl_clausula_minima",
    category: "processing",
    name: "Cláusula Mínima LGPD",
    description: "Cláusula simplificada para contratos sem tratamento de dados pessoais",
    tags: ["mínima", "simplificada", "sem dados"],
    popularity: 65,
    content: `**CLÁUSULA {{numero}} - PROTEÇÃO DE DADOS PESSOAIS**

{{numero}}.1. As Partes declaram que o presente instrumento não envolve o tratamento de dados pessoais, nos termos da Lei nº 13.709/2018 (LGPD).

{{numero}}.2. Caso, no curso da execução contratual, venha a ocorrer tratamento de dados pessoais não previsto originalmente, as Partes comprometem-se a celebrar termo aditivo específico estabelecendo as condições de tratamento em conformidade com a LGPD.

{{numero}}.3. As Partes declaram estar cientes das disposições da LGPD e comprometem-se a observá-las em todas as suas atividades.`,
  },
];

interface ClauseTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertClause: (clause: { id: string; name: string; content: string }) => void;
  organizationId?: number;
}

export function ClauseTemplateLibrary({
  isOpen,
  onClose,
  onInsertClause,
  organizationId,
}: ClauseTemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedClause, setSelectedClause] = useState<typeof STANDARD_CLAUSE_TEMPLATES[0] | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Filtrar cláusulas
  const filteredClauses = useMemo(() => {
    return STANDARD_CLAUSE_TEMPLATES.filter((clause) => {
      const matchesSearch =
        searchTerm === "" ||
        clause.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clause.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clause.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || clause.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      // Favoritos primeiro
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      // Depois por popularidade
      return b.popularity - a.popularity;
    });
  }, [searchTerm, selectedCategory, favorites]);

  const toggleFavorite = (clauseId: string) => {
    setFavorites((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  const handleInsert = (clause: typeof STANDARD_CLAUSE_TEMPLATES[0]) => {
    onInsertClause({
      id: clause.id,
      name: clause.name,
      content: clause.content,
    });
    toast.success(`Cláusula "${clause.name}" inserida com sucesso!`);
    onClose();
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Cláusula copiada para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-purple-800 to-violet-900 text-white px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur">
                <Library className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <span className="text-lg font-normal">Biblioteca de Cláusulas LGPD</span>
                <p className="text-sm text-white/70 font-light mt-1">
                  Templates padrão reutilizáveis para contratos
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Barra de busca */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Buscar por nome, descrição ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de categorias */}
          <div className="w-56 border-r bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase mb-3">Categorias</p>
            <div className="space-y-1">
              {CLAUSE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const count = category.id === "all"
                  ? STANDARD_CLAUSE_TEMPLATES.length
                  : STANDARD_CLAUSE_TEMPLATES.filter((c) => c.category === category.id).length;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>

            <Separator className="my-4" />

            <p className="text-xs font-medium text-slate-500 uppercase mb-3">Favoritos</p>
            <div className="text-xs text-slate-500">
              {favorites.length === 0 ? (
                <p>Nenhum favorito ainda</p>
              ) : (
                <p>{favorites.length} cláusula(s) favoritada(s)</p>
              )}
            </div>
          </div>

          {/* Lista de cláusulas */}
          <div className="flex-1 flex">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {filteredClauses.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma cláusula encontrada</p>
                    <p className="text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                ) : (
                  filteredClauses.map((clause) => (
                    <Card
                      key={clause.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedClause?.id === clause.id
                          ? "ring-2 ring-violet-500 bg-violet-50"
                          : ""
                      }`}
                      onClick={() => setSelectedClause(clause)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {clause.name}
                              {favorites.includes(clause.id) && (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              )}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {clause.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(clause.id);
                              }}
                            >
                              {favorites.includes(clause.id) ? (
                                <BookmarkCheck className="h-4 w-4 text-violet-600" />
                              ) : (
                                <Bookmark className="h-4 w-4 text-slate-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {clause.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          <div className="flex-1" />
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {clause.popularity}% popular
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Preview da cláusula selecionada */}
            {selectedClause && (
              <div className="w-96 border-l bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-800">Preview</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedClause.content)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] rounded-lg border bg-slate-50 p-4">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700">
                      {selectedClause.content}
                    </pre>
                  </div>
                </ScrollArea>

                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => handleInsert(selectedClause)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Inserir na Análise
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(selectedClause.content)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar para Área de Transferência
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700">
                    <strong>Dica:</strong> As variáveis entre {"{{"}chaves{"}}"}
                    serão substituídas automaticamente com os dados da análise.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-slate-500">
              {filteredClauses.length} cláusula(s) disponível(is)
            </p>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente auxiliar para ícone de tendência
function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
