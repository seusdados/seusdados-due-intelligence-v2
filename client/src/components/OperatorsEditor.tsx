/**
 * OperatorsEditor
 * Componente para gerenciar operadores/terceiros no contexto do ROPA premium.
 * Permite adicionar, editar e remover operadores com dados de contrato, DPA, etc.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OperatorRecord = {
  name: string;
  role?: "operador" | "suboperador" | "destinatario" | "controlador_conjunto" | "outro";
  serviceType?: string;
  dataShared?: string[];
  country?: string;
  hasContract?: boolean;
  hasDpa?: boolean;
  hasSecurityAnnex?: boolean;
  notes?: string;
};

interface OperatorsEditorProps {
  operators: OperatorRecord[];
  onChange: (operators: OperatorRecord[]) => void;
  disabled?: boolean;
}

const EMPTY_DRAFT: OperatorRecord = {
  name: "",
  role: "operador",
  serviceType: "",
  dataShared: [],
  country: "Brasil",
  hasContract: false,
  hasDpa: false,
  hasSecurityAnnex: false,
  notes: "",
};

const ROLE_LABELS: Record<string, string> = {
  operador: "Operador",
  suboperador: "Suboperador",
  destinatario: "Destinatário",
  controlador_conjunto: "Controlador conjunto",
  outro: "Outro",
};

export function OperatorsEditor({ operators, onChange, disabled }: OperatorsEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<OperatorRecord>({ ...EMPTY_DRAFT });

  const startNew = () => {
    setEditingIndex(null);
    setDraft({ ...EMPTY_DRAFT });
    setOpen(true);
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setDraft({ ...operators[idx] });
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    if (editingIndex === null) {
      onChange([...operators, { ...draft, name: draft.name.trim() }]);
    } else {
      onChange(operators.map((o, i) => (i === editingIndex ? { ...draft, name: draft.name.trim() } : o)));
    }
    setOpen(false);
  };

  const remove = (idx: number) => onChange(operators.filter((_, i) => i !== idx));

  const addDataShared = (v: string) => {
    const val = v.trim();
    if (!val) return;
    const set = new Set(draft.dataShared || []);
    set.add(val);
    setDraft({ ...draft, dataShared: Array.from(set) });
  };

  const removeDataShared = (tag: string) => {
    setDraft({ ...draft, dataShared: (draft.dataShared || []).filter(d => d !== tag) });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {operators.length ? (
          operators.map((o, idx) => (
            <div key={`${o.name}-${idx}`} className="p-3 rounded-lg border bg-background w-full">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{o.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABELS[o.role || "operador"] || o.role} &bull; {o.serviceType || "serviço não informado"} &bull; País: {o.country || "\u2014"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Contrato: {o.hasContract ? "Sim" : "Não"} &bull; DPA: {o.hasDpa ? "Sim" : "Não"} &bull; Anexo Segurança: {o.hasSecurityAnnex ? "Sim" : "Não"}
                  </div>
                  {(o.dataShared || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(o.dataShared || []).map((d) => (
                        <span key={d} className="px-2 py-0.5 bg-muted rounded-full text-xs">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!disabled && (
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(idx)}>Editar</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>Remover</Button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Nenhum operador listado ainda.</div>
        )}
      </div>

      {!disabled && (
        <Button type="button" variant="secondary" onClick={startNew}>Adicionar operador</Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingIndex === null ? "Adicionar operador" : "Editar operador"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome do operador / fornecedor</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex.: AWS, Microsoft, Contabilidade X, Callcenter Y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Papel</Label>
                <Select value={draft.role || "operador"} onValueChange={(v: any) => setDraft({ ...draft, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="suboperador">Suboperador</SelectItem>
                    <SelectItem value="destinatario">Destinatário</SelectItem>
                    <SelectItem value="controlador_conjunto">Controlador conjunto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Tipo de serviço</Label>
                <Input
                  value={draft.serviceType || ""}
                  onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })}
                  placeholder="Ex.: SaaS, Cloud, RH, Financeiro..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>País</Label>
              <Input
                value={draft.country || ""}
                onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                placeholder="Brasil"
              />
            </div>

            <div className="space-y-1">
              <Label>Dados compartilhados (tags)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex.: Nome, E-mail, CPF, Saúde..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDataShared(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
              {!!(draft.dataShared || []).length && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(draft.dataShared || []).map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 bg-muted rounded-full text-sm cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeDataShared(d)}
                      title="Clique para remover"
                    >
                      {d} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!draft.hasContract}
                  onCheckedChange={() => setDraft({ ...draft, hasContract: !draft.hasContract })}
                />
                Contrato existe
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!draft.hasDpa}
                  onCheckedChange={() => setDraft({ ...draft, hasDpa: !draft.hasDpa })}
                />
                DPA/Aditivo LGPD
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!draft.hasSecurityAnnex}
                  onCheckedChange={() => setDraft({ ...draft, hasSecurityAnnex: !draft.hasSecurityAnnex })}
                />
                Anexo Segurança/SLA
              </label>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={draft.notes || ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Ex.: contrato vence em..., auditoria SOC2, etc."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)} type="button">Cancelar</Button>
              <Button onClick={save} type="button">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
