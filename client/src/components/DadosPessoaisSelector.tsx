import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, X, AlertTriangle, Database } from "lucide-react";
import {
  DADOS_PESSOAIS_COMUNS,
  DADOS_SENSIVEIS,
} from "../../../shared/lgpdConstants";

interface DadoSelecionado {
  id: string;
  label: string;
  sensivel: boolean;
  categoria: string;
}

interface DadosPessoaisSelectorProps {
  value: DadoSelecionado[];
  onChange: (dados: DadoSelecionado[]) => void;
  label?: string;
  placeholder?: string;
}

export function DadosPessoaisSelector({
  value = [],
  onChange,
  label = "Dados Pessoais Tratados",
  placeholder = "Selecione os dados pessoais...",
}: DadosPessoaisSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("comuns");
  const [tempSelection, setTempSelection] = useState<DadoSelecionado[]>(value);
  const [customDado, setCustomDado] = useState("");
  const [customSensivel, setCustomSensivel] = useState(false);

  // Agrupar dados por categoria
  const dadosComunsAgrupados = useMemo(() => {
    const grupos: Record<string, typeof DADOS_PESSOAIS_COMUNS> = {};
    DADOS_PESSOAIS_COMUNS.forEach((dado) => {
      if (!grupos[dado.categoria]) {
        grupos[dado.categoria] = [];
      }
      grupos[dado.categoria].push(dado);
    });
    return grupos;
  }, []);

  const dadosSensiveisAgrupados = useMemo(() => {
    const grupos: Record<string, typeof DADOS_SENSIVEIS> = {};
    DADOS_SENSIVEIS.forEach((dado) => {
      if (!grupos[dado.categoria]) {
        grupos[dado.categoria] = [];
      }
      grupos[dado.categoria].push(dado);
    });
    return grupos;
  }, []);

  // Filtrar por busca
  const filteredComuns = useMemo(() => {
    if (!searchTerm) return dadosComunsAgrupados;
    const filtered: Record<string, typeof DADOS_PESSOAIS_COMUNS> = {};
    Object.entries(dadosComunsAgrupados).forEach(([cat, dados]) => {
      const matches = dados.filter((d) =>
        d.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matches.length > 0) {
        filtered[cat] = matches;
      }
    });
    return filtered;
  }, [dadosComunsAgrupados, searchTerm]);

  const filteredSensiveis = useMemo(() => {
    if (!searchTerm) return dadosSensiveisAgrupados;
    const filtered: Record<string, typeof DADOS_SENSIVEIS> = {};
    Object.entries(dadosSensiveisAgrupados).forEach(([cat, dados]) => {
      const matches = dados.filter((d) =>
        d.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matches.length > 0) {
        filtered[cat] = matches;
      }
    });
    return filtered;
  }, [dadosSensiveisAgrupados, searchTerm]);

  const isSelected = (id: string) => tempSelection.some((d) => d.id === id);

  const toggleDado = (dado: { id: string; label: string; categoria: string }, sensivel: boolean) => {
    if (isSelected(dado.id)) {
      setTempSelection(tempSelection.filter((d) => d.id !== dado.id));
    } else {
      setTempSelection([
        ...tempSelection,
        { id: dado.id, label: dado.label, sensivel, categoria: dado.categoria },
      ]);
    }
  };

  const addCustomDado = () => {
    if (customDado.trim()) {
      const id = `custom_${Date.now()}`;
      setTempSelection([
        ...tempSelection,
        {
          id,
          label: customDado.trim(),
          sensivel: customSensivel,
          categoria: "Personalizado",
        },
      ]);
      setCustomDado("");
      setCustomSensivel(false);
    }
  };

  const handleConfirm = () => {
    onChange(tempSelection);
    setOpen(false);
  };

  const handleOpen = () => {
    setTempSelection(value);
    setOpen(true);
  };

  const removeDado = (id: string) => {
    onChange(value.filter((d) => d.id !== id));
  };

  const totalSensiveis = value.filter((d) => d.sensivel).length;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Dados selecionados */}
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/30">
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          value.map((dado) => (
            <Badge
              key={dado.id}
              variant={dado.sensivel ? "destructive" : "secondary"}
              className="gap-1 pr-1"
            >
              {dado.label}
              {dado.sensivel && <AlertTriangle className="h-3 w-3" />}
              <button
                type="button"
                onClick={() => removeDado(dado.id)}
                className="ml-1 hover:bg-white/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Resumo */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} dado(s) selecionado(s)
          {totalSensiveis > 0 && (
            <span className="text-red-600 ml-2">
              ({totalSensiveis} sensível(is) - Art. 11 LGPD)
            </span>
          )}
        </p>
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
            <Database className="h-4 w-4" />
            Selecionar Dados Pessoais
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Selecionar Dados Pessoais
            </DialogTitle>
          </DialogHeader>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar dados pessoais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comuns">Dados Comuns</TabsTrigger>
              <TabsTrigger value="sensiveis" className="text-red-600">
                Dados Sensíveis
              </TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
            </TabsList>

            {/* Dados Comuns */}
            <TabsContent value="comuns">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {Object.entries(filteredComuns).map(([categoria, dados]) => (
                    <div key={categoria}>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {categoria}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {dados.map((dado) => (
                          <label
                            key={dado.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              isSelected(dado.id)
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected(dado.id)}
                              onCheckedChange={() => toggleDado(dado, false)}
                            />
                            <span className="text-sm">{dado.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Dados Sensíveis */}
            <TabsContent value="sensiveis">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Dados Sensíveis (Art. 11 LGPD)
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Requerem base legal específica e medidas de segurança reforçadas.
                </p>
              </div>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4">
                  {Object.entries(filteredSensiveis).map(([categoria, dados]) => (
                    <div key={categoria}>
                      <h4 className="font-medium text-sm text-red-600 mb-2">
                        {categoria}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {dados.map((dado) => (
                          <label
                            key={dado.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              isSelected(dado.id)
                                ? "bg-red-100 border-red-400"
                                : "hover:bg-red-50 border-red-200"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected(dado.id)}
                              onCheckedChange={() => toggleDado(dado, true)}
                            />
                            <span className="text-sm">{dado.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Personalizado */}
            <TabsContent value="custom">
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Adicione um dado pessoal que não está na lista padrão.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do dado pessoal..."
                    value={customDado}
                    onChange={(e) => setCustomDado(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomDado()}
                  />
                  <label className="flex items-center gap-2 whitespace-nowrap">
                    <Checkbox
                      checked={customSensivel}
                      onCheckedChange={(c) => setCustomSensivel(!!c)}
                    />
                    <span className="text-sm text-red-600">Sensível</span>
                  </label>
                  <Button type="button" onClick={addCustomDado}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Selecionados */}
                <div className="mt-6">
                  <h4 className="font-medium text-sm mb-2">
                    Dados Selecionados ({tempSelection.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[100px]">
                    {tempSelection.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Nenhum dado selecionado
                      </span>
                    ) : (
                      tempSelection.map((dado) => (
                        <Badge
                          key={dado.id}
                          variant={dado.sensivel ? "destructive" : "secondary"}
                          className="gap-1"
                        >
                          {dado.label}
                          <button
                            type="button"
                            onClick={() =>
                              setTempSelection(
                                tempSelection.filter((d) => d.id !== dado.id)
                              )
                            }
                            className="ml-1 hover:bg-white/20 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar ({tempSelection.length} selecionados)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
