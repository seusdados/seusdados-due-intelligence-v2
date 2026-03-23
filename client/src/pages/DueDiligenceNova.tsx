import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FileSearch, Plus, Copy, Check, Mail, Link2, ExternalLink, Building2, Users, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";

export default function DueDiligenceNova() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedOrg = params.get('org');
  const preselectedTp = params.get('tp');
  
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [organizationId, setOrganizationId] = useState(preselectedOrg || "");
  const [thirdPartyId, setThirdPartyId] = useState(preselectedTp || "");
  const [sendEmail, setSendEmail] = useState(false);
  const [generateLink, setGenerateLink] = useState(true);
  
  // Dialog states
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [createdAssessmentId, setCreatedAssessmentId] = useState<number | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: organizations } = trpc.organization.list.useQuery();
  const { data: thirdParties } = trpc.thirdParty.list.useQuery(
    organizationId ? { organizationId: parseInt(organizationId) } : { organizationId: 0 },
    { enabled: !!organizationId }
  );
  
  const createMutation = trpc.thirdPartyAssessment.create.useMutation();
  const createLinkMutation = trpc.accessLink.create.useMutation();
  const sendEmailMutation = trpc.accessLink.sendEmail.useMutation();

  const selectedThirdParty = thirdParties?.find(tp => tp.id.toString() === thirdPartyId);

  useEffect(() => {
    if (preselectedOrg) {
      setOrganizationId(preselectedOrg);
    } else if (user?.organizationId) {
      setOrganizationId(user.organizationId.toString());
    }
  }, [preselectedOrg, user]);

  useEffect(() => {
    if (preselectedTp) {
      setThirdPartyId(preselectedTp);
    }
  }, [preselectedTp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Informe o título da avaliação");
      return;
    }
    if (!organizationId) {
      toast.error("Selecione uma organização");
      return;
    }
    if (!thirdPartyId) {
      toast.error("Selecione um terceiro");
      return;
    }

    try {
      // 1. Criar a avaliação
      const result = await createMutation.mutateAsync({
        title,
        notes,
        organizationId: parseInt(organizationId),
        thirdPartyId: parseInt(thirdPartyId),
      });
      
      setCreatedAssessmentId(result.id);
      
      // 2. Gerar link se solicitado
      if (generateLink) {
        const linkResult = await createLinkMutation.mutateAsync({
          thirdPartyId: parseInt(thirdPartyId),
          organizationId: parseInt(organizationId),
          assessmentId: result.id,
          type: 'due_diligence',
          expiresInDays: 30,
        });
        setGeneratedLink(linkResult.link);
        
        // 3. Enviar e-mail se solicitado
        if (sendEmail && selectedThirdParty?.contactEmail) {
          try {
            await sendEmailMutation.mutateAsync({
              thirdPartyId: parseInt(thirdPartyId),
              organizationId: parseInt(organizationId),
              assessmentId: result.id,
              token: linkResult.token,
              expiresInDays: 30,
            });
            setEmailSent(true);
          } catch (emailError) {
            console.error("Erro ao enviar e-mail:", emailError);
            // Não bloqueia o fluxo se o e-mail falhar
          }
        }
      }
      
      toast.success("Avaliação criada com sucesso!");
      setShowResultDialog(true);
      
    } catch (error) {
      toast.error("Erro ao criar avaliação");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseDialog = () => {
    setShowResultDialog(false);
    if (createdAssessmentId) {
      // Voltar para o dashboard do cliente
      setLocation("/cliente/" + organizationId);
    }
  };

  const handleGoToAssessment = () => {
    setShowResultDialog(false);
    if (createdAssessmentId) {
      setLocation("/due-diligence/avaliacao/" + createdAssessmentId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/due-diligence')}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <FileSearch className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Nova Avaliação Due Diligence
                </h1>
                <p className="text-white/70 text-sm">
                  Crie uma nova avaliação de risco para um terceiro
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-12">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Dados da Avaliação</CardTitle>
                <CardDescription>
                  Preencha as informações para iniciar a avaliação de due diligence
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organization" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-500" />
                  Organização *
                </Label>
                <Select value={organizationId} onValueChange={(v) => {
                  setOrganizationId(v);
                  setThirdPartyId(""); // Reset third party when org changes
                }}>
                  <SelectTrigger className="border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Selecione a organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="thirdParty" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    Terceiro *
                  </Label>
                  {organizationId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation("/terceiros/novo?org=" + organizationId)}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Novo Terceiro
                    </Button>
                  )}
                </div>
                <Select 
                  value={thirdPartyId} 
                  onValueChange={setThirdPartyId}
                  disabled={!organizationId}
                >
                  <SelectTrigger className="border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder={organizationId ? "Selecione o terceiro" : "Selecione uma organização primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {thirdParties?.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id.toString()}>
                        {tp.name} ({tp.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedThirdParty && (
                  <p className="body-small bg-orange-50 p-2 rounded-lg">
                    E-mail: {selectedThirdParty.contactEmail || "Não cadastrado"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-orange-500" />
                  Título da Avaliação *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Due Diligence - Fornecedor XYZ - 2024"
                  className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações ou contexto sobre esta avaliação..."
                  rows={3}
                  className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              {/* Opções de envio */}
              <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-orange-500" />
                  Opções de Envio
                </h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="generateLink" 
                    checked={generateLink}
                    onCheckedChange={(checked) => setGenerateLink(checked === true)}
                    className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <label htmlFor="generateLink" className="text-sm cursor-pointer flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Gerar link para o terceiro responder
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sendEmail" 
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked === true)}
                    disabled={!generateLink || !selectedThirdParty?.contactEmail}
                    className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <label 
                    htmlFor="sendEmail" 
                    className={"text-sm cursor-pointer flex items-center gap-2 " + 
                      (!generateLink || !selectedThirdParty?.contactEmail ? 'text-muted-foreground' : '')
                    }
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Enviar link por e-mail para o terceiro
                    {!selectedThirdParty?.contactEmail && thirdPartyId && (
                      <span className="text-xs text-orange-500">(sem e-mail cadastrado)</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation('/due-diligence')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || createLinkMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  {createMutation.isPending || createLinkMutation.isPending 
                    ? "Criando..." 
                    : "Criar Avaliação"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de resultado */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Avaliação Criada com Sucesso!
            </DialogTitle>
            <DialogDescription>
              A avaliação de due diligence foi criada e está pronta para ser respondida.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {generatedLink && (
              <div className="space-y-2">
                <Label>Link para o Terceiro</Label>
                <div className="flex gap-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copie este link e envie para o terceiro responder a avaliação.
                </p>
              </div>
            )}

            {emailSent && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  E-mail enviado para {selectedThirdParty?.contactEmail}
                </span>
              </div>
            )}

            {sendEmail && !emailSent && selectedThirdParty?.contactEmail && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Mail className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  Não foi possível enviar o e-mail. Use o link acima para enviar manualmente.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Voltar ao Dashboard
            </Button>
            <Button onClick={handleGoToAssessment} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
              <ExternalLink className="mr-2 h-4 w-4" />
              Responder Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
