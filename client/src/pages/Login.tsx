import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Mail, Lock, AlertCircle, User, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        if (data.user?.mustChangePassword) {
          sessionStorage.setItem('firstAccess_email', email);
          sessionStorage.setItem('firstAccess_password', password);
          sessionStorage.setItem('firstAccess_name', data.user.name || '');
          window.location.href = "/definir-senha";
        } else {
          window.location.href = "/";
        }
      }
    },
    onError: (err) => {
      setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
    },
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      setRegisterSuccess(true);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "Erro ao criar conta.");
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password || !confirmPassword) {
      setError("Preencha todos os campos");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError(null);
    setRegisterSuccess(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with diagonal stripes pattern */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)
          `,
        }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              135deg,
              transparent,
              transparent 50px,
              rgba(255,255,255,0.03) 50px,
              rgba(255,255,255,0.03) 100px
            )`
          }}
        />
        <div 
          className="absolute -right-32 top-1/4 w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/logo-seusdados.png" 
            alt="Seusdados" 
            className="h-16 md:h-20"
          />
        </div>

        {/* Login / Register Card */}
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              {mode === "login" ? "Acesso à Plataforma" : "Criar Conta"}
            </CardTitle>
            <CardDescription className="text-white/70">
              {mode === "login" 
                ? "Entre com seu e-mail e senha" 
                : "Preencha os dados para criar sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registerSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-white text-lg mb-2">Conta criada com sucesso!</p>
                <p className="text-white/70 text-sm mb-6">Você já pode fazer login com suas credenciais.</p>
                <Button
                  onClick={() => {
                    switchMode("login");
                    setPassword("");
                    setConfirmPassword("");
                    setName("");
                  }}
                  className="w-full py-6 text-base font-normal rounded-lg"
                  style={{ background: '#d4a853', color: '#1a2744' }}
                >
                  Ir para Login
                </Button>
              </div>
            ) : mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-white">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full py-6 text-base font-normal rounded-lg"
                  style={{ background: '#d4a853', color: '#1a2744' }}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-white">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-white/90">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-white/90">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-white/90">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm" className="text-white/90">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full py-6 text-base font-normal rounded-lg"
                  style={{ background: '#d4a853', color: '#1a2744' }}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            )}

            {/* Toggle between login and register */}
            {!registerSuccess && (
              <div className="mt-6 text-center">
                {mode === "login" ? (
                  <button
                    onClick={() => switchMode("register")}
                    className="text-white/50 hover:text-white/70 text-sm"
                  >
                    Não tem conta? <span className="underline" style={{ color: '#d4a853' }}>Criar conta</span>
                  </button>
                ) : (
                  <button
                    onClick={() => switchMode("login")}
                    className="text-white/50 hover:text-white/70 text-sm"
                  >
                    Já tem conta? <span className="underline" style={{ color: '#d4a853' }}>Fazer login</span>
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div 
        className="absolute bottom-0 left-0 right-0 py-4 px-6"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
          <div className="mb-2 md:mb-0">
            <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Ltda.</span>
            <br className="md:hidden" />
            <span className="hidden md:inline"> | </span>
            CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
          </div>
          <div className="text-center md:text-right">
            <a href="https://www.seusdados.com" className="hover:text-white/70">www.seusdados.com</a>
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
