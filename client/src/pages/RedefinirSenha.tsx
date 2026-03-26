import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Eye, EyeOff, Lock, Check, X, AlertCircle, CheckCircle2, XCircle, Clock, ShieldAlert, Loader2 } from "lucide-react";

export default function RedefinirSenha() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validar token
  const { data: tokenData, isLoading: isValidating, error: validateError } = trpc.localAuth.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Requisitos de senha
  const requirements = useMemo(() => [
    { label: "Pelo menos 8 caracteres", met: newPassword.length >= 8 },
    { label: "Pelo menos uma letra maiúscula", met: /[A-Z]/.test(newPassword) },
    { label: "Pelo menos uma letra minúscula", met: /[a-z]/.test(newPassword) },
    { label: "Pelo menos um número", met: /[0-9]/.test(newPassword) },
    { label: "Pelo menos um caractere especial", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ], [newPassword]);

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRequirementsMet && passwordsMatch;

  const resetMutation = trpc.localAuth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      // Redirecionar para a página principal após 2 segundos (já logado via cookie)
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Erro ao redefinir senha.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    resetMutation.mutate({ token, newPassword });
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
          </div>
          <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-white/60 animate-spin mx-auto mb-4" />
            <p className="text-white/70 text-sm">Validando seu link de redefinição...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (validateError || !tokenData || !tokenData.valid) {
    const reason = tokenData?.reason || 'not_found';
    
    const reasonConfig: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
      not_found: {
        title: "Link Inválido",
        description: "Este link de redefinição não existe ou já foi utilizado. Solicite um novo link pela opção 'Esqueceu a senha?' na tela de login.",
        icon: <XCircle className="h-10 w-10 text-red-400" />,
      },
      expired: {
        title: "Link Expirado",
        description: "Este link de redefinição expirou (validade de 1 hora). Solicite um novo link pela opção 'Esqueceu a senha?' na tela de login.",
        icon: <Clock className="h-10 w-10 text-amber-400" />,
      },
      inactive: {
        title: "Conta Inativa",
        description: "Sua conta está desativada. Entre em contato com o administrador da plataforma para mais informações.",
        icon: <ShieldAlert className="h-10 w-10 text-red-400" />,
      },
    };

    const config = reasonConfig[reason] || reasonConfig.not_found;

    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
          </div>
          <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <div className="mb-4">{config.icon}</div>
            <h2 className="text-xl font-semibold text-white mb-2">{config.title}</h2>
            <p className="text-white/60 text-sm mb-6">{config.description}</p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = "/esqueceu-senha"}
                className="w-full py-5 text-base font-normal rounded-lg"
                style={{ background: '#d4a853', color: '#1a2744' }}
              >
                Solicitar Novo Link
              </Button>
              <Button
                onClick={() => window.location.href = "/login"}
                variant="ghost"
                className="w-full py-5 text-base font-normal rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                Voltar ao Login
              </Button>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 py-4 px-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
            <div className="mb-2 md:mb-0">
              <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Limitada</span>
              <br className="md:hidden" />
              <span className="hidden md:inline"> | </span>
              CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
              Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP
            </div>
            <div className="text-center md:text-right">
              <a href="https://seusdados.com" className="hover:text-white/70">seusdados.com</a>
              <span className="mx-2">|</span>
              <a href="mailto:dpo@seusdados.com" className="hover:text-white/70">dpo@seusdados.com</a>
              <br className="md:hidden" />
              <span className="hidden md:inline mx-2">|</span>
              <span>+55 11 4040 5552</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
          </div>
          <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Senha Redefinida com Sucesso!</h2>
            <p className="text-white/60 text-sm">
              Você será redirecionado para a plataforma em instantes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 100px)` }} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-1">Redefinir Senha</h2>
            <p className="text-white/60 text-sm">
              Olá, <strong className="text-white/80">{tokenData.userName || 'Usuário'}</strong>! Defina sua nova senha abaixo.
            </p>
            {tokenData.userEmail && (
              <p className="text-white/40 text-xs mt-2">
                {tokenData.userEmail}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-white/80 font-light">
                Nova Senha
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Requisitos de senha */}
              {newPassword.length > 0 && (
                <div className="mt-3 space-y-1">
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <X className="w-3 h-3 text-red-400" />
                      )}
                      <span className={req.met ? "text-green-400" : "text-red-400"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white/80 font-light">
                Confirmar Nova Senha
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-red-400 text-xs mt-1">As senhas não coincidem</p>
              )}
              {passwordsMatch && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Senhas coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-base font-normal rounded-lg"
              style={{ background: canSubmit ? '#d4a853' : '#6b7280', color: '#1a2744' }}
              disabled={!canSubmit || resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir Senha e Acessar"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 py-4 px-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
          <div className="mb-2 md:mb-0">
            <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Limitada</span>
            <br className="md:hidden" />
            <span className="hidden md:inline"> | </span>
            CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
            Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP
          </div>
          <div className="text-center md:text-right">
            <a href="https://seusdados.com" className="hover:text-white/70">seusdados.com</a>
            <span className="mx-2">|</span>
            <a href="mailto:dpo@seusdados.com" className="hover:text-white/70">dpo@seusdados.com</a>
            <br className="md:hidden" />
            <span className="hidden md:inline mx-2">|</span>
            <span>+55 11 4040 5552</span>
          </div>
        </div>
      </div>
    </div>
  );
}
