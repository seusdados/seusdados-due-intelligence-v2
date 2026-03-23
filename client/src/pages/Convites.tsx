import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Copy,
  Building2,
  Send,
  Trash2,
  AlertTriangle
} from "lucide-react";

const roleLabels: Record<string, string> = {
  admin_global: "Admin Global",
  consultor: "Consultor",
  sponsor: "Sponsor",
  comite: "Comitê",
  lider_processo: "Líder de Processo",
  gestor_area: "Gestor de Área",
  terceiro: "Terceiro",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  accepted: { label: "Aceito", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Convites() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("sponsor");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

  const utils = trpc.useUtils();
  
  const { data: invites, isLoading } = trpc.userInvite.list.useQuery({});
  const { data: organizations } = trpc.organization.list.useQuery();

  const createInviteMutation = trpc.userInvite.create.useMutation({
    onSuccess: (data) => {
      toast.success("Convite criado com sucesso!");
      setCreatedInviteLink(data.link);
      utils.userInvite.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar convite");
    },
  });

  const resendMutation = trpc.userInvite.resend.useMutation({
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso!");
      utils.userInvite.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao reenviar convite");
    },
  });

  const cancelMutation = trpc.userInvite.cancel.useMutation({
    onSuccess: () => {
      toast.success("Convite cancelado");
      utils.userInvite.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cancelar convite");
    },
  });

  const handleCreateInvite = () => {
    if (!email) {
      toast.error("E-mail é obrigatório");
      return;
    }

    createInviteMutation.mutate({
      email,
      name: name || undefined,
      role: role as any,
      organizationId: organizationId ? parseInt(organizationId) : undefined,
      message: message || undefined,
      expiresInDays: parseInt(expiresInDays),
    });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência");
  };

  const resetForm = () => {
    setEmail("");
    setName("");
    setRole("sponsor");
    setOrganizationId("");
    setMessage("");
    setExpiresInDays("7");
    setCreatedInviteLink(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Verificar se é admin ou consultor
  if (user?.role !== 'admin_global' && user?.role !== 'consultor') {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <p className="text-amber-800">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - Padrão Visual Seusdados */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="heading-2">Convites de Usuários</h1>
            <p className="body-small">
              Gerencie convites para novos usuários da plataforma
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <UserPlus className="h-4 w-4" />
              Novo Convite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {!createdInviteLink ? (
              <>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Envie um convite por e-mail para um novo usuário acessar a plataforma.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      placeholder="Nome do usuário"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Papel</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
<SelectContent className="z-[200] max-h-[300px]" position="popper" sideOffset={4}>
                        {/* Todos os 7 perfis oficiais estão disponíveis */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Equipe Interna</div>
                        <SelectItem value="admin_global">Admin Global</SelectItem>
                        <SelectItem value="consultor">Consultor</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Cliente</div>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="comite">Comitê</SelectItem>
                        <SelectItem value="lider_processo">Líder de Processo</SelectItem>
                        <SelectItem value="gestor_area">Gestor de Área</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Externo</div>
                        <SelectItem value="terceiro">Terceiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {['sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro'].includes(role) && organizations && organizations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organização</Label>
                      <Select value={organizationId} onValueChange={setOrganizationId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>
<SelectContent className="z-[200]">
                           {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="expires">Validade do Convite</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
<SelectContent className="z-[200]">
                         <SelectItem value="1">1 dia</SelectItem>
                        <SelectItem value="3">3 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="14">14 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem Personalizada (opcional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Adicione uma mensagem para o convidado..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateInvite}
                    disabled={createInviteMutation.isPending}
                    className="gap-2"
                  >
                    {createInviteMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar Convite
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <DialogTitle>Convite Criado com Sucesso!</DialogTitle>
                  </div>
                  <DialogDescription>
                    O convite foi enviado para {email}. Você também pode copiar o link abaixo.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <Label>Link do Convite</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={createdInviteLink}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyLink(createdInviteLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Copie e envie este link por outro canal se necessário.
                  </p>
                </div>

                <DialogFooter>
                  <Button onClick={closeDialog}>
                    Fechar
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Convites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Convites Enviados</CardTitle>
          <CardDescription>
            Histórico de todos os convites enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !invites || invites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum convite enviado ainda.</p>
              <p className="text-sm">Clique em "Novo Convite" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const isExpired = new Date() > new Date(invite.expiresAt);
                  const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status;
                  const statusInfo = statusLabels[status] || statusLabels.pending;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>{invite.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[invite.role] || invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invite.organizationId ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="text-sm">
                              {organizations?.find(o => o.id === invite.organizationId)?.name || `ID: ${invite.organizationId}`}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="body-small">
                        {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="body-small">
                        {invite.emailSentCount || 0}x
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {invite.status === 'pending' && !isExpired && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const baseUrl = window.location.origin;
                                  handleCopyLink(`${baseUrl}/convite/${invite.token}`);
                                }}
                                title="Copiar link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resendMutation.mutate({ id: invite.id })}
                                disabled={resendMutation.isPending}
                                title="Reenviar"
                              >
                                <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => cancelMutation.mutate({ id: invite.id })}
                                disabled={cancelMutation.isPending}
                                title="Cancelar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {invite.status === 'accepted' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {(invite.status === 'cancelled' || isExpired) && (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
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
