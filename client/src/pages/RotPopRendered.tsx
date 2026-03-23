import React, { useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import MarkdownPretty from "@/components/MarkdownPretty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Viewer interno para ROT/POP renderizado:
 * - Não abre arquivo .md do GED (que aparece "cru")
 * - Puxa conteúdo via tRPC e renderiza bonito
 *
 * Rotas:
 * - /doc/rot/:rotId
 * - /doc/pop/:rotId
 */

export default function RotPopRendered() {
  const { rotId, kind } = useParams<{ rotId: string; kind: string }>();
  const id = Number(rotId);
  const isRot = kind === "rot";
  const isPop = kind === "pop";

  const rotQ = trpc.rot.getById.useQuery({ id }, { enabled: Number.isFinite(id) && id > 0 });

  const mdQ = trpc.mapeamento.exportROT.useQuery(
    { rot: rotQ.data as any },
    { enabled: !!rotQ.data && isRot }
  );

  const popObj = useMemo(() => {
    if (!rotQ.data) return null;
    const r: any = rotQ.data;
    return {
      title: `POP - ${r.title}`,
      processTitle: r.title,
      department: r.department || r.areaName || "PENDENTE",
      pointFocal: { name: r.pointFocalName || "", email: r.pointFocalEmail || "" },
      titularCategories: r.titularCategory ? [r.titularCategory] : (r.titularCategories || []),
      dataCategories: r.dataCategories || [],
      legalBase: r.legalBase || "PENDENTE",
      retentionPeriod: r.retentionPeriod || "PENDENTE",
      storageLocation: r.storageLocation || "PENDENTE",
      securityMeasures: r.securityMeasures || [],
      sharing: r.sharing || [],
      internationalTransfer: !!r.internationalTransfer,
      internationalCountries: r.internationalCountries || [],
      ropaData: r.ropaData || null,
      responsibilities: [
        { role: "DPO / Encarregado", description: "Validar conformidade, orientar e revisar periodicamente." },
        { role: "Gestor da Área", description: "Garantir execução do procedimento e evidências." },
        { role: "Operação", description: "Executar as etapas e registrar evidências." },
      ],
      documents: ["ROT", "POP"],
      records: ["Evidências por etapa", "Logs (quando aplicável)"],
      indicators: ["Revisões no período", "Incidentes/Não conformidades"],
      revision: { frequency: "Anual", criteria: ["Mudanças no processo", "Mudanças regulatórias", "Incidentes relevantes"] },
    };
  }, [rotQ.data]);

  const popMdQ = trpc.mapeamento.exportPOP.useQuery(
    { pop: popObj as any },
    { enabled: !!popObj && isPop }
  );

  const title = isRot ? "ROT (renderizado)" : "POP (renderizado)";
  const markdown = isRot ? (mdQ.data as any) : (popMdQ.data as any);

  if (rotQ.isLoading) return <div className="p-6">Carregando…</div>;
  if (rotQ.error) return <div className="p-6">Erro: {String(rotQ.error.message)}</div>;
  if (!rotQ.data) return <div className="p-6">ROT não encontrado.</div>;
  if (!isRot && !isPop) return <div className="p-6">Tipo inválido.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{title}: {rotQ.data.title}</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => (window.location.href = `/rot/${id}`)}>
              Voltar ao Viewer
            </Button>
            <Button variant="outline" onClick={() => window.open(isRot ? (rotQ.data as any).rotFileUrl : (rotQ.data as any).popFileUrl, "_blank")}>
              Abrir .md bruto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(isRot ? mdQ.isLoading : popMdQ.isLoading) ? (
            <div>Gerando documento…</div>
          ) : (isRot ? mdQ.error : popMdQ.error) ? (
            <div>Erro ao gerar documento.</div>
          ) : (
            <MarkdownPretty markdown={markdown || ""} />
          )}
        </CardContent>
      </Card>

      <style>{`
        .md-root h1 { font-size: 22px; margin: 14px 0 10px; }
        .md-root h2 { font-size: 18px; margin: 14px 0 8px; }
        .md-root h3 { font-size: 16px; margin: 12px 0 6px; }
        .md-root p { margin: 6px 0; line-height: 1.5; }
        .md-root ul { margin: 8px 0 8px 20px; }
        .md-root li { margin: 4px 0; }
        .md-root blockquote { border-left: 3px solid #ddd; padding-left: 10px; color: #666; margin: 8px 0; }
        .md-root hr { border: 0; border-top: 1px solid #eee; margin: 14px 0; }
        .md-root code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 6px; }
        .md-root .md-code { background: rgba(0,0,0,0.04); padding: 12px; border-radius: 10px; overflow:auto; }
        .md-root .md-table table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .md-root .md-table th, .md-root .md-table td { border: 1px solid #eee; padding: 8px; vertical-align: top; }
        .md-root .md-table th { background: rgba(0,0,0,0.03); text-align: left; }
        .md-root .md-spacer { height: 6px; }
      `}</style>
    </div>
  );
}
