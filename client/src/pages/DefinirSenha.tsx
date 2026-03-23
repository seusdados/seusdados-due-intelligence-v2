import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Lock, Check, X, AlertCircle } from "lucide-react";

export default function DefinirSenha() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Dados do sessionStorage
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("firstAccess_email");
    const storedPassword = sessionStorage.getItem("firstAccess_password");
    const storedName = sessionStorage.getItem("firstAccess_name");

    if (!storedEmail || !storedPassword) {
      // Sem dados de primeiro acesso, redirecionar para login
      window.location.href = "/login-local";
      return;
    }

    setEmail(storedEmail);
    setCurrentPassword(storedPassword);
    setUserName(storedName || "");
  }, []);

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

  const setPasswordMutation = trpc.localAuth.setInitialPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      // Limpar sessionStorage
      sessionStorage.removeItem("firstAccess_email");
      sessionStorage.removeItem("firstAccess_password");
      sessionStorage.removeItem("firstAccess_name");
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = "/login-local";
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Erro ao definir nova senha.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setPasswordMutation.mutate({
      email,
      currentPassword,
      newPassword,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)`,
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <img
            src="/seusdados-logo.png"
            alt="Seusdados"
            className="h-16 mb-8"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">Senha Definida</h2>
            <p className="text-white/70 font-extralight">
              Sua nova senha foi definida com sucesso. Você será redirecionado para o login em instantes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <img
          src="/seusdados-logo.png"
          alt="Seusdados"
          className="h-16 mb-8"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          <h2 className="text-2xl font-light text-white text-center mb-2">
            Definir Nova Senha
          </h2>
          <p className="text-white/70 font-extralight text-center mb-6">
            Olá, {userName || "Usuário"}! Por segurança, defina uma nova senha para continuar acessando a plataforma.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-500/20 border-red-500/30">
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
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {passwordsMatch ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">As senhas coincidem</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">As senhas não coincidem</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || setPasswordMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              {setPasswordMutation.isPending ? "Salvando..." : "Definir Nova Senha"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/40 text-xs font-extralight">
          <p>Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="https://www.seusdados.com" className="hover:text-white/60">www.seusdados.com</a>
            <span>|</span>
            <a href="mailto:dpo@seusdados.com" className="hover:text-white/60">dpo@seusdados.com</a>
            <span>|</span>
            <span>+55 11 4040 5552</span>
          </div>
        </div>
      </div>
    </div>
  );
}
