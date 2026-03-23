import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Scale, Info, AlertTriangle, Check } from "lucide-react";
import {
  BASES_LEGAIS_ART7,
  BASES_LEGAIS_ART11,
} from "../../../shared/lgpdConstants";

interface BaseLegalSelecionada {
  id: string;
  inciso: string;
  titulo: string;
  artigo: "7" | "11";
}

interface BaseLegalSelectorProps {
  value: BaseLegalSelecionada | null;
  onChange: (base: BaseLegalSelecionada | null) => void;
  hasDadosSensiveis?: boolean;
  label?: string;
}

export function BaseLegalSelector({
  value,
  onChange,
  hasDadosSensiveis = false,
  label = "Base Legal",
}: BaseLegalSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(hasDadosSensiveis ? "art11" : "art7");
  const [tempSelection, setTempSelection] = useState<BaseLegalSelecionada | null>(value);

  const handleSelect = (base: typeof BASES_LEGAIS_ART7[0], artigo: "7" | "11") => {
    setTempSelection({
      id: base.id,
      inciso: base.inciso,
      titulo: base.titulo,
      artigo,
    });
  };

  const handleConfirm = () => {
    onChange(tempSelection);
    setOpen(false);
  };

  const handleOpen = () => {
    setTempSelection(value);
    if (hasDadosSensiveis) {
      setSelectedTab("art11");
    }
    setOpen(true);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Base selecionada */}
      <div className="p-3 border rounded-lg bg-muted/30 min-h-[60px]">
        {value ? (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={value.artigo === "11" ? "destructive" : "default"}>
                  Art. {value.artigo}, {value.inciso}
                </Badge>
                <span className="font-medium">{value.titulo}</span>
              </div>
              {value.artigo === "11" && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Base legal para dados sensíveis
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              Alterar
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            Nenhuma base legal selecionada
          </span>
        )}
      </div>

      {/* Aviso de dados sensíveis */}
      {hasDadosSensiveis && !value?.artigo?.includes("11") && value && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Você selecionou dados sensíveis. Considere usar uma base legal do Art. 11.
        </div>
      )}

      {/* Botão para abrir seletor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleOpen}
          >
            <Scale className="h-4 w-4" />
            Selecionar Base Legal
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Selecionar Base Legal LGPD
            </DialogTitle>
            <DialogDescription>
              Escolha a base legal que justifica o tratamento de dados pessoais.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="art7">
                Art. 7 - Dados Comuns
              </TabsTrigger>
              <TabsTrigger value="art11" className="text-red-600">
                Art. 11 - Dados Sensíveis
              </TabsTrigger>
            </TabsList>

            {/* Art. 7 - Dados Comuns */}
            <TabsContent value="art7">
              <ScrollArea className="h-[400px] pr-4">
                <RadioGroup
                  value={tempSelection?.id || ""}
                  onValueChange={(id) => {
                    const base = BASES_LEGAIS_ART7.find((b) => b.id === id);
                    if (base) handleSelect(base, "7");
                  }}
                >
                  <div className="space-y-3">
                    {BASES_LEGAIS_ART7.map((base) => (
                      <TooltipProvider key={base.id}>
                        <label
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            tempSelection?.id === base.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <RadioGroupItem value={base.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Art. 7, {base.inciso}
                              </Badge>
                              <span className="font-medium">{base.titulo}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="text-sm">{base.descricao}</p>
                                    <div>
                                      <p className="text-xs font-medium">Requisitos:</p>
                                      <ul className="text-xs list-disc pl-4">
                                        {base.requisitos.map((req, i) => (
                                          <li key={i}>{req}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Ex: {base.exemplo}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {base.descricao}
                            </p>
                          </div>
                          {tempSelection?.id === base.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </label>
                      </TooltipProvider>
                    ))}
                  </div>
                </RadioGroup>
              </ScrollArea>
            </TabsContent>

            {/* Art. 11 - Dados Sensíveis */}
            <TabsContent value="art11">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Bases Legais para Dados Sensíveis (Art. 11 LGPD)
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Use estas bases legais quando tratar dados sensíveis como saúde, biometria, religião, etc.
                </p>
              </div>
              <ScrollArea className="h-[350px] pr-4">
                <RadioGroup
                  value={tempSelection?.id || ""}
                  onValueChange={(id) => {
                    const base = BASES_LEGAIS_ART11.find((b) => b.id === id);
                    if (base) handleSelect(base, "11");
                  }}
                >
                  <div className="space-y-3">
                    {BASES_LEGAIS_ART11.map((base) => (
                      <TooltipProvider key={base.id}>
                        <label
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            tempSelection?.id === base.id
                              ? "bg-red-100 border-red-400"
                              : "hover:bg-red-50 border-red-200"
                          }`}
                        >
                          <RadioGroupItem value={base.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">
                                Art. 11, {base.inciso}
                              </Badge>
                              <span className="font-medium">{base.titulo}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="text-sm">{base.descricao}</p>
                                    <div>
                                      <p className="text-xs font-medium">Requisitos:</p>
                                      <ul className="text-xs list-disc pl-4">
                                        {base.requisitos.map((req, i) => (
                                          <li key={i}>{req}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Ex: {base.exemplo}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {base.descricao}
                            </p>
                          </div>
                          {tempSelection?.id === base.id && (
                            <Check className="h-5 w-5 text-red-600" />
                          )}
                        </label>
                      </TooltipProvider>
                    ))}
                  </div>
                </RadioGroup>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!tempSelection}>
              Confirmar Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
