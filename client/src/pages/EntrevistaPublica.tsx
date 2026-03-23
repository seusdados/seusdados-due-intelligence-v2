import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, CheckCircle2, ArrowLeft, ArrowRight, Pencil, XCircle, Save, Loader2, ChevronUp, ChevronDown, Trash2, FileDown, GripVertical, X } from "lucide-react";
import { OperatorsEditor, type OperatorRecord } from "@/components/OperatorsEditor";

type Purpose = { code: string; label: string; examples?: string[] };
type DataUse = {
  subjectGroup: string;
  dataElement: string;
  purposes: string[];
  legalBasisSuggested?: { code?: string; rationale?: string; confidence?: number; ruleId?: string };
  riskSignals?: any;
  legalBasisValidated?: { code: string; justification?: string; status?: "accepted"|"adjusted"|"rejected" };
};

type ProcessStep = {
  title: string;
  actor?: string;
  channel?: string[];
  systems?: string[];
  dataUsed?: string[];
  operations?: string[];
  sharing?: string[];
  controls?: string;
  notes?: string;
};

function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center ml-2 w-6 h-6 rounded-full border text-muted-foreground">
          <Info className="w-4 h-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[360px] text-sm leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-base font-semibold">{title}</div>
      {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
    </div>
  );
}

const TITULARES = [
  "Clientes","Colaboradores","Candidatos","Fornecedores","Prestadores","Leads/Prospects","Visitantes","Usuários","Crianças/Adolescentes"
];

const DADOS_COMUNS = [
  "Nome","CPF","E-mail","Telefone","Endereço","Data de nascimento","Foto/Imagem","Dados bancários","Localização"
];

const MEDIDAS_SEG = [
  "Controle de acesso (perfis/RBAC)","MFA (2 fatores)","Logs de acesso","Criptografia","Backup","Antivírus/EDR","Treinamento","Políticas documentadas"
];

const CANAIS = ["Site","App","WhatsApp","E-mail","Telefone","Presencial","Integração/API","Formulário físico"];
const FONTES = ["Do titular","De terceiros","Base pública","Parceiro"];
const SISTEMAS = ["ERP","CRM","E-mail/Office","Planilha","Drive/Documentos","SaaS (fornecedor)","Helpdesk/Chamados"];

const BASES_LEGAIS = [
  { value: "obrigacao_legal", label: "Obrigação legal/regulatória" },
  { value: "execucao_contrato", label: "Execução de contrato/procedimentos preliminares" },
  { value: "exercicio_direitos", label: "Exercício regular de direitos" },
  { value: "tutela_saude", label: "Tutela da saúde (sensível)" },
  { value: "legitimo_interesse", label: "Legítimo interesse" },
  { value: "consentimento", label: "Consentimento" },
];


type PopDraftContext = {
  processTitle?: string;
  department?: string;
  channels?: string[];
  systems?: string[];
  dataUsed?: string[];
  operators?: string[];
  retention?: string;
  logs?: string;
  disposal?: string;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map(x => String(x).trim()).filter(Boolean)));
}

/**
 * Gera um rascunho de etapas POP:
 * - Não é “realidade inventada”: é um esqueleto operacional padrão para o usuário ajustar.
 * - Usa o que já foi informado (canais/sistemas/dados/operadores/retenção/logs).
 */
function buildPopDraftSteps(ctx: PopDraftContext) {
  const channels = uniq(ctx.channels || []);
  const systems = uniq(ctx.systems || []);
  const dataUsed = uniq(ctx.dataUsed || []);
  const operators = uniq(ctx.operators || []);

  const baseControls = [
    ctx.logs ? `Logs: ${ctx.logs}` : null,
    systems.length ? `Perfis/RBAC em ${systems.join(", ")}` : null,
  ].filter(Boolean).join(" | ") || "PENDENTE";

  const steps = [
    {
      title: "Coleta/Recebimento",
      actor: ctx.department || "Área responsável",
      channel: channels.length ? channels : ["PENDENTE"],
      systems: systems.length ? systems : ["PENDENTE"],
      dataUsed: dataUsed.length ? dataUsed : ["PENDENTE"],
      operations: ["coleta", "registro"],
      sharing: [],
      controls: baseControls,
      notes: "Ajuste esta etapa para refletir como o dado entra no processo (site/app/whatsapp/e-mail/presencial).",
    },
    {
      title: "Processamento/Análise",
      actor: ctx.department || "Área responsável",
      channel: channels.length ? channels : ["PENDENTE"],
      systems: systems.length ? systems : ["PENDENTE"],
      dataUsed: dataUsed.length ? dataUsed : ["PENDENTE"],
      operations: ["consulta", "uso", "análise"],
      sharing: operators.length ? operators : [],
      controls: baseControls,
      notes: "Descreva a análise/decisão (aprovação, avaliação, execução de atividade) e onde isso fica registrado.",
    },
    {
      title: "Compartilhamento (se aplicável)",
      actor: ctx.department || "Área responsável",
      channel: channels.length ? channels : ["PENDENTE"],
      systems: systems.length ? systems : ["PENDENTE"],
      dataUsed: dataUsed.length ? dataUsed : ["PENDENTE"],
      operations: operators.length ? ["compartilhamento"] : ["PENDENTE"],
      sharing: operators.length ? operators : ["—"],
      controls: operators.length ? "Contrato/DPA/Anexo de Segurança (PENDENTE se não houver)" : "—",
      notes: operators.length ? "Liste para quem vai, por quê, e qual evidência existe (contrato/DPA/SLA)." : "Remova esta etapa se não houver compartilhamento.",
    },
    {
      title: "Retenção e descarte",
      actor: "TI/Área + Governança",
      channel: ["—"],
      systems: systems.length ? systems : ["PENDENTE"],
      dataUsed: dataUsed.length ? dataUsed : ["PENDENTE"],
      operations: ["armazenamento", "retenção", "eliminação/anonimização"],
      sharing: [],
      controls: [
        ctx.retention ? `Retenção: ${ctx.retention}` : "Retenção: PENDENTE",
        ctx.disposal ? `Descarte: ${ctx.disposal}` : "Descarte: PENDENTE",
      ].join(" | "),
      notes: "Defina onde fica armazenado, por quanto tempo e como descarta/anonimiza.",
    },
  ];

  // Se não há operadores, remove a etapa 3 automaticamente (evita ruído)
  if (!operators.length) {
    steps.splice(2, 1);
  }

  return steps;
}

export default function EntrevistaPublica() {
  const { token } = useParams<{ token: string }>();
  const interview = trpc.mapeamento.getInterview.useQuery({ token });
  const save = trpc.mapeamento.saveResponse.useMutation();
  const finalize = trpc.mapeamento.finalizeInterview.useMutation();

  const purposesQ = trpc.mapeamento.getPurposeCatalog.useQuery();
  const suggestDataUsesM = trpc.mapeamento.suggestDataUses.useMutation();
  const reassignM = trpc.mapeamento.reassignProcess.useMutation();

  const data = interview.data;
  const processes = data?.processes || [];
  const mode = (data as any)?.mode || "area";
  const isProcessMode = mode === "process";

  const initialMap = useMemo(() => {
    const map: Record<number, any> = {};
    for (const r of (data?.responses || [])) map[r.processId] = r;
    return map;
  }, [data?.responses]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [local, setLocal] = useState<Record<number, any>>({});
  const [step, setStep] = useState(0);

  useEffect(() => {
    setLocal(initialMap);
    if (!selectedId && processes.length) setSelectedId(processes[0].id);
  }, [processes.length, initialMap]);

  const selectedProcess = processes.find((p: any) => p.id === selectedId) || null;
  const response = selectedId ? (local[selectedId] || {}) : {};
  const ropa = response.ropaData || {};

  const setField = (k: string, v: any) => {
    if (!selectedId) return;
    console.log("[DEBUG] setField:", k, v);
    setLocal(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], [k]: v } }));
  };
  const setRopa = (k: string, v: any) => {
    const current = response.ropaData || {};
    console.log("[DEBUG] setRopa:", k, v);
    setField("ropaData", { ...current, [k]: v });
  };

  const purposeCatalog: Purpose[] = (purposesQ.data as any)?.purposes || [];
  const [purposeByData, setPurposeByData] = useState<Record<string, string[]>>({});
  const dataUses: DataUse[] = (ropa.dataUses || []) as any[];

  const togglePurpose = (dataElement: string, code: string) => {
    setPurposeByData(prev => {
      const cur = prev[dataElement] || [];
      const set = new Set(cur);
      if (set.has(code)) set.delete(code); else set.add(code);
      return { ...prev, [dataElement]: Array.from(set) };
    });
  };

  const setDataUses = (next: DataUse[]) => setRopa("dataUses", next);

  // Steps (Apple/Google): curto, guiado, sem redundância
  const steps = [
    { title: "Contexto do processo", subtitle: "Só confirme o essencial (sem juridiquês)." },
    { title: "Jornada do dado", subtitle: "Entrada → uso → saída → guarda (ROPA)." },
    { title: "Titulares e dados", subtitle: "Quem são e quais dados são usados." },
    { title: "Finalidades por dado (FIN)", subtitle: "Selecione finalidades; a base legal vem depois, sugerida." },
    { title: "Sugestões (base legal e risco)", subtitle: "Aceite, ajuste ou rejeite. Tudo auditável." },
    { title: "Etapas do processo (POP real)", subtitle: "Passo a passo + diagrama do fluxo." },
    { title: "Revisão e finalizar", subtitle: "Resumo e finalização por processo." },
  ];

  // Track visited steps for progress bar
  const [stepVisited, setStepVisited] = useState<Set<number>>(new Set([0]));
  const [autoSaving, setAutoSaving] = useState(false);
  const prevStepRef = useRef(step);

  // RESET_ON_PROCESS_CHANGE
  useEffect(() => {
    if (!selectedId) return;
    setStep(0);
    setStepVisited(new Set([0]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);


  
  // Auto-save when changing steps (silent)
  useEffect(() => {
    if (prevStepRef.current !== step && selectedId) {
      prevStepRef.current = step;
      setStepVisited(prev => {
        const arr = Array.from(prev);
        arr.push(step);
        return new Set(arr);
      });
      const doAutoSave = async () => {
        setAutoSaving(true);
        try {
          await save.mutateAsync({
            token,
            processId: selectedId,
            data: {
              titularCategories: response.titularCategories || [],
              dataCategories: response.dataCategories || [],
              legalBase: response.legalBase,
              sharing: response.sharing || [],
              consentObtained: response.consentObtained,
              retentionPeriod: response.retentionPeriod,
              storageLocation: response.storageLocation,
              securityMeasures: response.securityMeasures || [],
              internationalTransfer: !!response.internationalTransfer,
              internationalCountries: response.internationalCountries || [],
              notes: response.notes,
              ropaData: response.ropaData,
            },
            completed: false,
          });
          dirtyRef.current = false;
        } catch (e) {
          // silencioso
        } finally {
          setAutoSaving(false);
        }
      };
      doAutoSave();
    }
  }, [step, selectedId]);

  // Debounced autosave on edits (prevents data loss)
  const dirtyRef = useRef(false);
  const debounceRef = useRef<any>(null);

  const minimalPayload = useMemo(() => {
    if (!selectedId) return "";
    const r = response || {};
    const d = {
      processId: selectedId,
      titularCategories: r.titularCategories || [],
      dataCategories: r.dataCategories || [],
      legalBase: r.legalBase || null,
      retentionPeriod: r.retentionPeriod || null,
      storageLocation: r.storageLocation || null,
      securityMeasures: r.securityMeasures || [],
      internationalTransfer: !!r.internationalTransfer,
      internationalCountries: r.internationalCountries || [],
      sharing: r.sharing || [],
      notes: r.notes || null,
      ropaData: r.ropaData || null,
    };
    return JSON.stringify(d);
  }, [selectedId, response]);

  useEffect(() => {
    if (!selectedId) return;
    dirtyRef.current = true;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await save.mutateAsync({
          token,
          processId: selectedId,
          data: {
            titularCategories: response.titularCategories || [],
            dataCategories: response.dataCategories || [],
            legalBase: response.legalBase,
            sharing: response.sharing || [],
            consentObtained: response.consentObtained,
            retentionPeriod: response.retentionPeriod,
            storageLocation: response.storageLocation,
            securityMeasures: response.securityMeasures || [],
            internationalTransfer: !!response.internationalTransfer,
            internationalCountries: response.internationalCountries || [],
            notes: response.notes,
            ropaData: response.ropaData,
          },
          completed: false,
        });
        dirtyRef.current = false;
      } catch (e) {
        // silencioso
      } finally {
        setAutoSaving(false);
      }
    }, 1200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [minimalPayload]);

  useEffect(() => {
    const handler = (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);


  const canNext = () => true;

  const saveCurrent = async (markComplete?: boolean) => {
    if (!selectedId) return;
    await save.mutateAsync({
      token,
      processId: selectedId,
      data: {
        titularCategories: response.titularCategories || [],
        dataCategories: response.dataCategories || [],
        legalBase: response.legalBase,
        sharing: response.sharing || [],
        consentObtained: response.consentObtained,
        retentionPeriod: response.retentionPeriod,
        storageLocation: response.storageLocation,
        securityMeasures: response.securityMeasures || [],
        internationalTransfer: !!response.internationalTransfer,
        internationalCountries: response.internationalCountries || [],
        notes: response.notes,
        ropaData: response.ropaData,
      },
      completed: !!markComplete,
    });
    await interview.refetch();
  };

  const finalizeProcess = async () => {
    await finalize.mutateAsync({ token });
    await interview.refetch();
    alert("Processo finalizado ✅");
  };

  if (interview.isLoading) return <div className="p-6">Carregando entrevista…</div>;
  if (interview.error || !data) return <div className="p-6">Entrevista inválida ou expirada.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 pb-28 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapeamento de Dados — Entrevista (Premium)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Respondente: <b>{data.respondent?.name}</b> ({data.respondent?.email}) • Área: <b>{data.respondent?.areaName || "—"}</b>
            </div>
            <div className="text-sm text-muted-foreground">
              Modo: <b>{isProcessMode ? "Por processo (token individual)" : "Por área (token por área)"}</b>
            </div>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Processo atual: </span>
                <b>{selectedProcess?.title || "—"}</b>
                {(() => {
                  const r = selectedId ? (local[selectedId] || initialMap[selectedId] || {}) : {};
                  return r?.completed ? <Badge className="ml-2">Concluído</Badge> : <Badge className="ml-2" variant="secondary">Pendente</Badge>;
                })()}
              </div>

              {!isProcessMode && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="secondary">Trocar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Selecione um processo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-2">
                      {processes.map((p: any) => {
                        const r = local[p.id] || initialMap[p.id] || {};
                        const done = !!r.completed;
                        const active = p.id === selectedId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedId(p.id); }}
                            className={`px-3 py-2 rounded-lg border text-sm ${active ? "bg-muted" : "bg-background"}`}
                          >
                            <div className="font-medium">{p.title}</div>
                            <div className="mt-1">
                              {done ? <Badge>Concluído</Badge> : <Badge variant="secondary">Pendente</Badge>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Dica: ao trocar de processo, o formulário volta para a Etapa 1 para evitar confusão.
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {selectedProcess?.description ? (
              <div className="text-xs text-muted-foreground">
                {selectedProcess.description}
              </div>
            ) : null}
          </CardContent>
        </Card>
{/* Stepper com barra de progresso */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Etapa {step + 1} de {steps.length}</CardTitle>
              {autoSaving && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando...
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-1">
              {steps.map((s, i) => {
                const isCurrent = i === step;
                const isVisited = stepVisited.has(i) && i < step;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={s.title}
                  >
                    <div
                      className={`h-2 w-full rounded-full transition-colors ${
                        isCurrent
                          ? "bg-primary"
                          : isVisited
                            ? "bg-primary/40"
                            : "bg-muted"
                      }`}
                    />
                    <span className={`text-[10px] leading-tight text-center hidden md:block ${
                      isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StepHeader title={steps[step].title} subtitle={steps[step].subtitle} />

            {step === 0 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="text-sm"><b>{selectedProcess?.title}</b></div>
                  <div className="text-xs text-muted-foreground">{selectedProcess?.description || ""}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Sistemas usados (ROPA)</Label>
                    <Help text="Selecione os sistemas que participam deste processo. Você pode adicionar outros." />
                  </div>
                  <ChipMultiSelect
                    options={SISTEMAS}
                    values={ropa.systemsUsed || []}
                    onChange={(v) => setRopa("systemsUsed", v)}
                    placeholder="Adicionar sistema..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Operadores/Terceiros</Label>
                    <Help text="Liste fornecedores que tratam dados em nome da empresa. Isso melhora ROT e DPIA." />
                  </div>
                  <OperatorsEditor
                    operators={(ropa.operators || []) as OperatorRecord[]}
                    onChange={(ops) => setRopa("operators", ops)}
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Fonte de coleta (ROPA)</Label>
                    <Help text="De onde vêm os dados? (titular, terceiro, base pública...)" />
                  </div>
                  <ChipMultiSelect
                    options={FONTES}
                    values={ropa.collectionSources || []}
                    onChange={(v) => setRopa("collectionSources", v)}
                    placeholder="Adicionar fonte..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Canais de coleta (ROPA)</Label>
                    <Help text="Por onde os dados entram? Site, app, WhatsApp, e-mail..." />
                  </div>
                  <ChipMultiSelect
                    options={CANAIS}
                    values={ropa.collectionChannels || []}
                    onChange={(v) => setRopa("collectionChannels", v)}
                    placeholder="Adicionar canal..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Retenção (prazo)</Label>
                    <Input value={response.retentionPeriod || ""} onChange={(e)=>setField("retentionPeriod", e.target.value)} placeholder="Ex.: 5 anos; enquanto durar contrato..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Base/justificativa da retenção</Label>
                    <Input value={ropa.retentionLegalBasis || ""} onChange={(e)=>setRopa("retentionLegalBasis", e.target.value)} placeholder="Ex.: obrigação fiscal, contrato..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Logs e rastreabilidade</Label>
                  <Input value={ropa.logsAndTraceability || ""} onChange={(e)=>setRopa("logsAndTraceability", e.target.value)} placeholder="Ex.: logs no ERP por 180 dias, SIEM..." />
                </div>

                <div className="space-y-1">
                  <Label>Descarte/eliminação</Label>
                  <Input value={ropa.disposalCriteria || ""} onChange={(e)=>setRopa("disposalCriteria", e.target.value)} placeholder="Ex.: anonimiza após X; exclui após Y..." />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Quem são os titulares?</Label>
                    <Help text="Selecione os grupos de pessoas envolvidos neste processo." />
                  </div>
                  <ChipMultiSelect
                    options={TITULARES}
                    values={response.titularCategories || []}
                    onChange={(v) => setField("titularCategories", v)}
                    placeholder="Adicionar titular..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Quais dados são usados?</Label>
                    <Help text="Selecione categorias de dados. Se houver sensível, inclua explicitamente." />
                  </div>
                  <ChipMultiSelect
                    options={DADOS_COMUNS}
                    values={(response.dataCategories || []).map((d:any)=>d?.name || d).filter(Boolean)}
                    onChange={(names) => {
                      const next = names.map((n:string)=>({ name: n, sensivel: false }));
                      setField("dataCategories", next);
                    }}
                    placeholder="Adicionar dado..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label className="text-base">Medidas de segurança</Label>
                    <Help text="Marque o que existe de verdade. Se não souber, deixe pendente para TI (não trava)." />
                  </div>
                  <ChipMultiSelect
                    options={MEDIDAS_SEG}
                    values={response.securityMeasures || []}
                    onChange={(v) => setField("securityMeasures", v)}
                    placeholder="Adicionar controle..."
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Label className="text-base">Finalidades por dado (FIN)</Label>
                  <Help text="Selecione finalidades por dado. O sistema sugerirá base legal e risco com 'por quê' para você validar." />
                </div>

                {!purposeCatalog.length ? (
                  <div className="text-sm text-muted-foreground">Carregando catálogo de finalidades…</div>
                ) : (
                  <>
                    {((response.dataCategories || []) as any[]).map((d:any) => {
                      const de = d?.name || d;
                      if (!de) return null;
                      const selected = purposeByData[de] || [];
                      return (
                        <div key={de} className="p-3 rounded-lg border bg-background space-y-2">
                          <div className="font-medium text-sm">{de}</div>
                          <div className="flex flex-wrap gap-2">
                            {purposeCatalog.map((p) => {
                              const on = selected.includes(p.code);
                              return (
                                <button
                                  key={p.code}
                                  type="button"
                                  className={`px-3 py-1 rounded-full text-sm border ${on ? "bg-muted" : "bg-background"}`}
                                  onClick={() => togglePurpose(de, p.code)}
                                  title={(p.examples || []).join(", ")}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        const subjects = response.titularCategories || [];
                        const dataElements = response.dataCategories || [];
                        const res = await suggestDataUsesM.mutateAsync({
                          subjectGroups: subjects,
                          dataElements,
                          purposeByDataElement: purposeByData,
                          systems: ropa.systemsUsed || [],
                          channels: ropa.collectionChannels || [],
                          recipients: response.sharing || [],
                          internationalTransfer: !!response.internationalTransfer,
                          operatorsCount: (ropa.operators || []).length || 0,
                          volumeFrequency: ropa.volumeFrequency || "",
                          monitoring: !!ropa.systematicMonitoring,
                        });
                        setDataUses(res.uses || []);
                        setStep(4);
                      }}
                      disabled={suggestDataUsesM.isPending}
                    >
                      Gerar sugestões (base legal e risco)
                    </Button>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Para cada “uso de dado”, valide a base legal sugerida. Você pode ajustar ou rejeitar com justificativa curta.
                </div>

                {!dataUses.length ? (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma sugestão gerada ainda. Volte e clique “Gerar sugestões”.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataUses.map((u, idx) => (
                      <DataUseValidationCard
                        key={idx}
                        use={u}
                        onChange={(next) => {
                          const copy = [...dataUses];
                          copy[idx] = next;
                          setDataUses(copy);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Label className="text-base">Etapas do processo (POP real + diagrama)</Label>
                  <Help text="Se não preencher, o POP fica com PENDENTE. Use etapas curtas, sem texto longo." />
                </div>
                <ProcessStepsEditor
                  value={(ropa.processSteps || []) as ProcessStep[]}
                  onChange={(v) => setRopa("processSteps", v)}
                />

                {isProcessMode ? (
                  <div className="p-3 rounded-lg border bg-muted/20">
                    <div className="text-sm font-medium">Reatribuição (se você não é o dono do processo)</div>
                    <div className="text-xs text-muted-foreground">Redirecione para o verdadeiro responsável — gera novo token e registra log.</div>
                    <ReassignDialog
                      onSubmit={async (name, email) => {
                        const res = await reassignM.mutateAsync({ token, newName: name, newEmail: email });
                        alert(`Processo reatribuído. Novo token gerado para ${email}.`);
                        return res;
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="font-medium text-sm">Resumo (o essencial)</div>
                  <div className="text-xs text-muted-foreground">
                    Este resumo alimenta ROT/ROPA/POP e, se necessário, RIPD/DPIA.
                  </div>
                  <div className="mt-2 text-sm">
                    <div><b>Processo:</b> {selectedProcess?.title}</div>
                    <div><b>Titulares:</b> {(response.titularCategories || []).join(", ") || "—"}</div>
                    <div><b>Dados:</b> {(response.dataCategories || []).map((d:any)=>d?.name||d).join(", ") || "—"}</div>
                    <div><b>Sistemas:</b> {(ropa.systemsUsed || []).join(", ") || "—"}</div>
                    <div><b>Canais:</b> {(ropa.collectionChannels || []).join(", ") || "—"}</div>
                    <div><b>DataUses:</b> {dataUses.length}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => saveCurrent(false)} disabled={save.isPending}>
                    Salvar rascunho
                  </Button>
                  <Button type="button" onClick={() => saveCurrent(true)} disabled={save.isPending}>
                    Salvar e marcar concluído
                  </Button>
                </div>

                {isProcessMode ? (
                  <Button type="button" onClick={finalizeProcess} disabled={finalize.isPending} className="w-full">
                    Finalizar este processo
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Modo por área: finalize quando todos os processos estiverem concluídos.
                  </div>
                )}
              </div>
            )}

            {/* Nav */}
            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s)=>Math.max(0, s-1))}
                disabled={step === 0}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>

              <div className="text-xs text-muted-foreground">
                {autoSaving ? (
                  <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
                ) : (
                  <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Rascunho salvo</span>
                )}
              </div>

              <Button
                type="button"
                onClick={() => canNext() && setStep((s)=>Math.min(steps.length-1, s+1))}
                disabled={step === steps.length-1}
                className="gap-2"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChipMultiSelect({
  options,
  values,
  onChange,
  placeholder,
}: {
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}) {
  const [custom, setCustom] = useState("");
  const toggle = (v: string) => {
    const set = new Set(values || []);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange(Array.from(set));
  };
  const handleCheckChange = (v: string, checked: boolean | string) => {
    const set = new Set(values || []);
    if (checked) set.add(v);
    else set.delete(v);
    onChange(Array.from(set));
  };
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    const set = new Set(values || []);
    set.add(v);
    onChange(Array.from(set));
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 p-3 rounded-lg border bg-background">
            <Checkbox checked={(values || []).includes(o)} onCheckedChange={(checked) => handleCheckChange(o, checked)} />
            <span className="text-sm">{o}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={custom} onChange={(e)=>setCustom(e.target.value)} placeholder={placeholder} />
        <Button type="button" variant="outline" onClick={addCustom}>Adicionar</Button>
      </div>
      {!!(values||[]).length && (
        <div className="text-xs text-muted-foreground">Selecionado: {(values||[]).join(", ")}</div>
      )}
    </div>
  );
}

function DataUseValidationCard({ use, onChange }: { use: DataUse; onChange: (next: DataUse) => void }) {
  const suggested = use.legalBasisSuggested;
  const validated = use.legalBasisValidated;

  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(validated?.code || suggested?.code || "legitimo_interesse");
  const [just, setJust] = useState(validated?.justification || "");

  const accept = () => {
    onChange({
      ...use,
      legalBasisValidated: { code: suggested?.code || picked, justification: suggested?.rationale || "", status: "accepted" }
    });
  };

  const reject = () => {
    setOpen(true);
    setJust("Rejeitado: justificar em 1 frase.");
  };

  const adjust = () => setOpen(true);

  return (
    <div className="p-4 rounded-lg border bg-background space-y-2">
      <div className="text-sm">
        <b>{use.subjectGroup}</b> + <b>{use.dataElement}</b>
      </div>
      <div className="text-xs text-muted-foreground">
        FIN: {(use.purposes || []).join(", ")}
      </div>

      <div className="text-sm">
        Sugestão: <b>{suggested?.code || "—"}</b>
        {suggested?.rationale ? <span className="text-xs text-muted-foreground"> — {suggested.rationale}</span> : null}
      </div>

      {validated?.code ? (
        <div className="text-sm">
          Validado: <b>{validated.code}</b>{" "}
          <span className="text-xs text-muted-foreground">({validated.status || "accepted"})</span>
          {validated.justification ? <div className="text-xs text-muted-foreground mt-1">{validated.justification}</div> : null}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Ainda não validado.</div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={accept} className="gap-2">
          <CheckCircle2 className="w-4 h-4" /> Aceitar
        </Button>
        <Button type="button" variant="outline" onClick={adjust} className="gap-2">
          <Pencil className="w-4 h-4" /> Ajustar
        </Button>
        <Button type="button" variant="ghost" onClick={reject} className="gap-2">
          <XCircle className="w-4 h-4" /> Rejeitar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validar base legal</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Base legal</Label>
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BASES_LEGAIS.map((b)=>(
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Justificativa (1 frase)</Label>
              <Textarea value={just} onChange={(e)=>setJust(e.target.value)} placeholder="Explique em 1 frase o porquê." />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button>
              <Button
                type="button"
                onClick={() => {
                  onChange({
                    ...use,
                    legalBasisValidated: { code: picked, justification: just, status: picked === (suggested?.code||picked) ? "accepted" : "adjusted" }
                  });
                  setOpen(false);
                }}
              >
                Salvar validação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagInput({ tags, onAdd, onRemove, placeholder }: { tags: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string }) {
  const [val, setVal] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = val.trim();
      if (v) { onAdd(v); setVal(""); }
    }
  };
  return (
    <div className="space-y-1">
      <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={handleKey} placeholder={placeholder} />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {tags.map((t, i) => (
            <span key={`${t}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
              {t}
              <button type="button" onClick={() => onRemove(t)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessStepsEditor({ value, onChange }: { value: ProcessStep[]; onChange: (v: ProcessStep[]) => void }) {
  const steps = Array.isArray(value) ? value : [];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(steps.length > 0 ? 0 : null);
  const add = () => {
    const newSteps = [ ...steps, { title: "", actor:"", channel:[], systems:[], dataUsed:[], operations:[], sharing:[], controls:"", notes:"" } ];
    onChange(newSteps);
    setExpandedIdx(newSteps.length - 1);
  };
  const remove = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };
  const patch = (idx: number, p: Partial<ProcessStep>) => onChange(steps.map((s, i) => i === idx ? { ...s, ...p } : s));

  const addTag = (idx: number, key: keyof ProcessStep, raw: string) => {
    const v = raw.trim(); if (!v) return;
    const cur = Array.isArray((steps[idx] as any)[key]) ? (steps[idx] as any)[key] : [];
    const set = new Set(cur); set.add(v);
    patch(idx, { [key]: Array.from(set) } as any);
  };
  const removeTag = (idx: number, key: keyof ProcessStep, tag: string) => {
    const cur = Array.isArray((steps[idx] as any)[key]) ? (steps[idx] as any)[key] : [];
    patch(idx, { [key]: cur.filter((t: string) => t !== tag) } as any);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...steps];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
    setExpandedIdx(idx - 1);
  };
  const moveDown = (idx: number) => {
    if (idx >= steps.length - 1) return;
    const arr = [...steps];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(arr);
    setExpandedIdx(idx + 1);
  };

  const filledCount = (s: ProcessStep) => {
    let c = 0;
    if (s.title) c++;
    if (s.actor) c++;
    if ((s.channel || []).length) c++;
    if ((s.systems || []).length) c++;
    if ((s.dataUsed || []).length) c++;
    if ((s.operations || []).length) c++;
    if ((s.sharing || []).length) c++;
    if (s.controls) c++;
    if (s.notes) c++;
    return c;
  };

  return (
    <div className="space-y-2">
      {steps.map((s, idx) => {
        const isExpanded = expandedIdx === idx;
        const filled = filledCount(s);
        return (
          <div key={idx} className={`rounded-lg border transition-all ${isExpanded ? 'bg-background shadow-sm' : 'bg-muted/30'}`}>
            {/* Header da etapa (sempre visível) */}
            <div
              className="flex items-center gap-2 p-3 cursor-pointer select-none"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="font-medium text-sm truncate">{s.title || "(sem título)"}</span>
                {s.actor && <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {s.actor}</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{filled}/9</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); moveUp(idx); }} disabled={idx === 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); moveDown(idx); }} disabled={idx >= steps.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); remove(idx); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Corpo expandido */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Título da etapa</Label>
                    <Input value={s.title || ""} onChange={(e) => patch(idx, { title: e.target.value })} placeholder="Ex.: Receber solicitação" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Responsável</Label>
                    <Input value={s.actor || ""} onChange={(e) => patch(idx, { actor: e.target.value })} placeholder="Ex.: Financeiro/RH" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Canais (tecle Enter para adicionar)</Label>
                    <TagInput
                      tags={s.channel || []}
                      onAdd={(v) => addTag(idx, "channel", v)}
                      onRemove={(v) => removeTag(idx, "channel", v)}
                      placeholder="E-mail, WhatsApp..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Sistemas (tecle Enter para adicionar)</Label>
                    <TagInput
                      tags={s.systems || []}
                      onAdd={(v) => addTag(idx, "systems", v)}
                      onRemove={(v) => removeTag(idx, "systems", v)}
                      placeholder="ERP, CRM..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Dados usados (tecle Enter para adicionar)</Label>
                    <TagInput
                      tags={s.dataUsed || []}
                      onAdd={(v) => addTag(idx, "dataUsed", v)}
                      onRemove={(v) => removeTag(idx, "dataUsed", v)}
                      placeholder="CPF, E-mail..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Operações (tecle Enter para adicionar)</Label>
                    <TagInput
                      tags={s.operations || []}
                      onAdd={(v) => addTag(idx, "operations", v)}
                      onRemove={(v) => removeTag(idx, "operations", v)}
                      placeholder="coleta, registro..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Compartilhamentos (tecle Enter para adicionar)</Label>
                  <TagInput
                    tags={s.sharing || []}
                    onAdd={(v) => addTag(idx, "sharing", v)}
                    onRemove={(v) => removeTag(idx, "sharing", v)}
                    placeholder="Contabilidade, Operador X..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Controles/Logs</Label>
                  <Input value={s.controls || ""} onChange={(e) => patch(idx, { controls: e.target.value })} placeholder="log no ERP, RBAC..." />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Observações</Label>
                  <Textarea value={s.notes || ""} onChange={(e) => patch(idx, { notes: e.target.value })} placeholder="Detalhes úteis." rows={2} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const currentSteps = (steps || []);
            if (currentSteps.length) {
              const ok = window.confirm("Já existem etapas. Deseja substituir pelo rascunho automático? (Você poderá editar depois)");
              if (!ok) return;
            }
            const ctx = {
              processTitle: selectedProcess?.title,
              department: data?.area?.name,
              channels: response?.ropaData?.collectionChannels || [],
              systems: response?.ropaData?.systemsUsed || [],
              dataUsed: (response?.dataCategories || []).map((d:any)=>d?.name).filter(Boolean),
              operators: (response?.ropaData?.operators || []).map((o:any)=>o?.name).filter(Boolean),
              retention: response?.retentionPeriod || response?.ropaData?.retentionPeriod,
              logs: response?.ropaData?.logsAndTraceability,
              disposal: response?.ropaData?.disposalCriteria,
            };
            const draft = buildPopDraftSteps(ctx);
            onChange(draft);
            setExpandedIdx(0);
          }}
        >
          Gerar rascunho de etapas POP
        </Button>
        <Button type="button" variant="secondary" onClick={add}>Adicionar etapa</Button>
        {steps.length > 0 && (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                const res = await fetch('/api/trpc/mapeamento.exportPopPdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    json: {
                      processTitle: selectedProcess?.title || 'Processo',
                      department: data?.area?.name || '',
                      organizationName: data?.organizationName || '',
                      steps: steps,
                    }
                  }),
                });
                if (!res.ok) throw new Error('Falha ao gerar PDF');
                const result = await res.json();
                const htmlContent = result?.result?.data?.json?.html;
                if (htmlContent) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    // Aguardar fontes carregarem antes de imprimir
                    printWindow.onload = () => {
                      setTimeout(() => printWindow.print(), 500);
                    };
                  }
                }
              } catch (e) {
                alert('Erro ao exportar PDF. Tente novamente.');
              }
            }}
          >
            <FileDown className="w-4 h-4" /> Exportar POP em PDF
          </Button>
        )}
      </div>
    </div>
  );
}

function ReassignDialog({ onSubmit }: { onSubmit: (name: string, email: string) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="mt-2">Redirecionar processo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Redirecionar para o dono do processo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={async ()=>{ await onSubmit(name, email); setOpen(false); setName(""); setEmail(""); }}
              disabled={!name || !email}
            >
              Gerar novo token
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
