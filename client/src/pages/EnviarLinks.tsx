import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  Send,
  Link2,
  Copy,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Building2,
  Mail,
  Search,
  ExternalLink
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function EnviarLinks() {
  const { user } = useAuth();
  const params = useParams<{ organizationId: string }>();
  const organizationId = parseInt(params.organizationId || "0");
  const [, setLocation] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [generatedLinks, setGeneratedLinks] = useState<Record<number, string>>({});

  const { data: thirdParties, isLoading } = trpc.thirdParty.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const generateLinkMutation = trpc.accessLink.create.useMutation({
    onSuccess: (data, variables) => {
      if (!data) return;
      setGeneratedLinks(prev => ({
        ...prev,
        [(variables as any).thirdPartyId]: (data as any).link
      }));
      toast.success('Link gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar link: ' + error.message);
    },
  });

  const filteredThirdParties = useMemo(() => {
    if (!thirdParties) return [];
    if (!searchTerm) return thirdParties;
    
    const term = searchTerm.toLowerCase();
    return thirdParties.filter(tp => 
      tp.name.toLowerCase().includes(term) ||
      tp.tradeName?.toLowerCase().includes(term) ||
      tp.cnpj?.includes(term)
    );
  }, [thirdParties, searchTerm]);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredThirdParties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredThirdParties.map(tp => tp.id));
    }
  }, [selectedIds, filteredThirdParties]);

  const handleGenerateLinks = useCallback(async () => {
    for (const id of selectedIds) {
      if (!generatedLinks[id]) {
        await generateLinkMutation.mutateAsync({
          thirdPartyId: id,
          organizationId,
          type: 'due_diligence',
          expiresInDays: 30,
        });
      }
    }
  }, [selectedIds, generatedLinks, generateLinkMutation, organizationId]);

  const handleCopyLink = useCallback((link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
  }, []);

  const handleCopyAllLinks = useCallback(() => {
    const links = selectedIds
      .map(id => generatedLinks[id])
      .filter(Boolean)
      .join('\n');
    
    if (links) {
      navigator.clipboard.writeText(links);
      toast.success('Todos os links copiados!');
    }
  }, [selectedIds, generatedLinks]);

  const sendEmailMutation = trpc.accessLink.sendEmail.useMutation({
    onSuccess: (data, variables) => {
      if (!data) return;
      if (data.success && 'link' in data && (data as any).link) {
        setGeneratedLinks(prev => ({
          ...prev,
          [(variables as any).thirdPartyId]: (data as any).link
        }));
        toast.success((data as any).message);
      } else {
        toast.error((data as any).message);
      }
    },
    onError: (error) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });

  const handleSendEmail = useCallback((thirdPartyId: number) => {
    sendEmailMutation.mutate({
      thirdPartyId,
      organizationId,
      expiresInDays: 30,
    });
  }, [sendEmailMutation, organizationId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation(`/cliente/${organizationId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-medium text-slate-800">Enviar Links de Avaliação</h1>
              <p className="text-sm text-slate-500">Gere e envie links para terceiros responderem a avaliação Due Diligence</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar terceiro por nome, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleSelectAll}
              >
                {selectedIds.length === filteredThirdParties.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {selectedIds.length} terceiro(s) selecionado(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyAllLinks}
                  disabled={!selectedIds.some(id => generatedLinks[id])}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Todos os Links
                </Button>
                <Button
                  onClick={handleGenerateLinks}
                  disabled={selectedIds.length === 0 || generateLinkMutation.isPending}
                  className="btn-gradient-seusdados text-white"
                >
                  {generateLinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Gerar Links
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third Parties List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Terceiros Cadastrados</CardTitle>
            <CardDescription>
              Selecione os terceiros para gerar links de avaliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-600" />
              </div>
            ) : filteredThirdParties.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum terceiro encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThirdParties.map((tp) => {
                  const isSelected = selectedIds.includes(tp.id);
                  const link = generatedLinks[tp.id];
                  
                  return (
                    <div 
                      key={tp.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isSelected ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(tp.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800">
                              {tp.tradeName || tp.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {tp.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-1">
                            {tp.cnpj}
                          </p>
                          {tp.contactEmail && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Mail className="h-3 w-3" />
                              {tp.contactEmail}
                            </div>
                          )}
                          
                          {/* Send Email Button */}
                          {tp.contactEmail && !link && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendEmail(tp.id)}
                                disabled={sendEmailMutation.isPending}
                                className="text-violet-600 border-violet-200 hover:bg-violet-50"
                              >
                                {sendEmailMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-4 w-4" />
                                )}
                                Enviar Link por E-mail
                              </Button>
                            </div>
                          )}
                          
                          {link && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Link Gerado</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={link}
                                  readOnly
                                  className="text-xs bg-white"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyLink(link)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <a 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
