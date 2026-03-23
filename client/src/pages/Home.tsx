import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  ClipboardCheck, 
  Search, 
  FileText, 
  Landmark, 
  Headphones,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  // Se autenticado, redirecionar para dashboard
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)]">
        {/* Hero Section para usuários logados */}
        <div className="bg-gradient-to-br from-[var(--brand-accent)] to-[var(--brand-accent-dark)] text-white">
          <div className="max-w-[1400px] mx-auto px-6 py-16">
            <div className="flex items-center gap-4 mb-4">
              <ShieldCheck className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Bem-vindo, {user.name?.split(' ')[0]}!</h1>
            </div>
            <p className="text-xl opacity-90 max-w-2xl">
              Acesse os módulos da plataforma para gerenciar conformidade, due diligence e governança de dados.
            </p>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickAccessCard
              icon={ClipboardCheck}
              title="Conformidade"
              description="Assessments de conformidade LGPD e mapeamentos de dados"
              href="/avaliacoes"
              color="var(--module-conformidade)"
            />
            <QuickAccessCard
              icon={Search}
              title="Due Diligence"
              description="Avaliação de terceiros e gestão de riscos"
              href="/due-diligence"
              color="var(--module-duediligence)"
            />
            <QuickAccessCard
              icon={FileText}
              title="Contratos"
              description="Análise de contratos com IA e gestão de cláusulas"
              href="/analise-contratos"
              color="var(--module-contratos)"
            />
            <QuickAccessCard
              icon={Landmark}
              title="Governança"
              description="Comitês, políticas e estrutura de governança"
              href="/governanca"
              color="var(--module-governanca)"
            />
            <QuickAccessCard
              icon={Headphones}
              title="MeuDPO"
              description="Assistente de IA para dúvidas de privacidade"
              href="/meudpo"
              color="var(--module-meudpo)"
            />
            <QuickAccessCard
              icon={TrendingUp}
              title="Dashboard"
              description="Visão geral de métricas e indicadores"
              href="/dashboard"
              color="var(--brand-accent)"
            />
          </div>
        </div>
      </div>
    );
  }

  // Landing page para visitantes
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[var(--brand-accent)] via-[var(--brand-accent)] to-[var(--brand-accent-dark)] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-14 h-14" />
              <span className="text-2xl font-bold">Seusdados</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Plataforma completa de<br />
              <span className="text-[var(--brand-accent-light)]">Privacidade e Proteção de Dados</span>
            </h1>
            <p className="text-xl opacity-90 mb-8 leading-relaxed">
              Gerencie conformidade LGPD, due diligence de terceiros, análise de contratos 
              e governança de dados em uma única plataforma integrada.
            </p>
            <div className="flex gap-4">
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-white text-[var(--brand-accent)] hover:bg-gray-100 font-semibold px-8">
                  Acessar Plataforma
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Módulos Integrados
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Uma solução completa para gestão de privacidade e proteção de dados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={ClipboardCheck}
            title="Conformidade LGPD"
            description="Assessments estruturados, mapeamento de dados, ROPA e planos de ação automatizados."
            features={['Assessments personalizados', 'Mapeamento de processos', 'Geração de ROPA']}
          />
          <FeatureCard
            icon={Search}
            title="Due Diligence"
            description="Avaliação completa de terceiros com questionários, scoring de risco e monitoramento."
            features={['Questionários customizados', 'Score de risco', 'Monitoramento contínuo']}
          />
          <FeatureCard
            icon={FileText}
            title="Análise de Contratos"
            description="Análise inteligente de contratos com IA, identificação de cláusulas e recomendações."
            features={['Análise com IA', 'Biblioteca de cláusulas', 'Sugestões automáticas']}
          />
          <FeatureCard
            icon={Landmark}
            title="Governança"
            description="Gestão de comitês, políticas, treinamentos e estrutura de governança de dados."
            features={['Gestão de comitês', 'Políticas e normas', 'Treinamentos']}
          />
          <FeatureCard
            icon={Headphones}
            title="MeuDPO"
            description="Assistente virtual com IA para dúvidas sobre privacidade e proteção de dados."
            features={['Chat com IA', 'Base de conhecimento', 'Respostas contextuais']}
          />
          <FeatureCard
            icon={TrendingUp}
            title="Dashboards"
            description="Visão consolidada de métricas, indicadores e status de conformidade."
            features={['KPIs em tempo real', 'Relatórios executivos', 'Alertas automáticos']}
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-[var(--bg-subtle)] py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem icon={Building2} value="500+" label="Organizações" />
            <StatItem icon={Users} value="2.000+" label="Usuários ativos" />
            <StatItem icon={ClipboardCheck} value="10.000+" label="Assessments" />
            <StatItem icon={CheckCircle2} value="99.9%" label="Uptime" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-accent-dark)] rounded-2xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Acesse a plataforma e comece a gerenciar a privacidade e proteção de dados da sua organização.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-white text-[var(--brand-accent)] hover:bg-gray-100 font-semibold px-8">
              Acessar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] py-8">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold">Seusdados</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              © 2024 Seusdados Consultoria. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componentes auxiliares
function QuickAccessCard({ 
  icon: Icon, 
  title, 
  description, 
  href, 
  color 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  href: string; 
  color: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl p-6 border border-[var(--border-default)] hover:shadow-lg hover:border-[var(--brand-accent)] transition-all cursor-pointer group">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand-accent)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </Link>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  features 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  features: string[];
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-[var(--border-default)]">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-accent-light)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[var(--brand-accent)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--semantic-success)]" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="text-center">
      <Icon className="w-8 h-8 text-[var(--brand-accent)] mx-auto mb-2" />
      <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}
