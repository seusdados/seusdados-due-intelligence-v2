import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Target, Shield } from "lucide-react";
import { Chart as ChartJS, RadarController, PointElement, LineElement, Filler, Tooltip, Legend, DoughnutController, ArcElement } from "chart.js";
import { StatCard, InfoCard, CardGrid, SectionHeader } from "@/components/DashboardCard";

ChartJS.register(RadarController, PointElement, LineElement, Filler, Tooltip, Legend, DoughnutController, ArcElement);

export default function AssessmentDashboard() {
  const radarChartRef = useRef<HTMLCanvasElement>(null);
  const riskChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let radarChart: ChartJS | null = null;
    let riskChart: ChartJS | null = null;

    if (radarChartRef.current) {
      const ctx = radarChartRef.current.getContext("2d");
      if (ctx) {
        radarChart = new ChartJS(ctx, {
          type: "radar",
          data: {
            labels: ["Governança de IA", "Qualidade de Dados", "Segurança", "Conformidade", "Auditoria", "Documentação"],
            datasets: [{
              label: "Nível de Maturidade",
              data: [3.5, 2.8, 4.2, 3.1, 2.5, 3.8],
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              borderWidth: 2,
              pointBackgroundColor: "#8b5cf6",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 5,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              r: {
                beginAtZero: true,
                max: 5,
                ticks: { stepSize: 1 },
              },
            },
            plugins: {
              legend: { position: "top" as const },
            },
          },
        });
      }
    }

    if (riskChartRef.current) {
      const ctx = riskChartRef.current.getContext("2d");
      if (ctx) {
        riskChart = new ChartJS(ctx, {
          type: "doughnut",
          data: {
            labels: ["Baixa", "Média", "Alta", "Crítica"],
            datasets: [{
              data: [12, 8, 5, 2],
              backgroundColor: ["#10b981", "#f59e0b", "#f97316", "#dc2626"],
              borderColor: "#fff",
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { position: "right" as const },
            },
          },
        });
      }
    }

    return () => {
      radarChart?.destroy();
      riskChart?.destroy();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold !text-white">Painel de Avaliações</h1>
            <p className="!text-white/80 mt-1 font-light">Visualização consolidada de maturidade e riscos</p>
          </div>
          <Badge className="bg-white/20 !text-white text-sm px-4 py-1.5 border-0">8 Avaliações</Badge>
        </div>
      </div>

      {/* KPIs */}
      <CardGrid columns={4}>
        <StatCard
          icon={Target}
          iconGradient="violet"
          value="3.4/5"
          label="Maturidade Média"
          subtitle="Nível Intermediário"
        />
        <StatCard
          icon={AlertCircle}
          iconGradient="red"
          value="2"
          label="Riscos Críticos"
          subtitle="Requerem ação imediata"
        />
        <StatCard
          icon={Shield}
          iconGradient="emerald"
          value="85%"
          label="Conformidade"
          subtitle="Normas atendidas"
        />
        <StatCard
          icon={CheckCircle}
          iconGradient="blue"
          value="12"
          label="Planos de Ação"
          subtitle="Em andamento"
        />
      </CardGrid>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InfoCard
          icon={BarChart3}
          iconGradient="violet"
          title="Maturidade por Domínio"
          subtitle="Escala de 0 a 5"
        >
          <div style={{ position: "relative", height: "280px" }}>
            <canvas ref={radarChartRef}></canvas>
          </div>
        </InfoCard>

        <InfoCard
          icon={TrendingUp}
          iconGradient="blue"
          title="Distribuição de Riscos"
          subtitle="Por nível de severidade"
        >
          <div style={{ position: "relative", height: "280px" }}>
            <canvas ref={riskChartRef}></canvas>
          </div>
        </InfoCard>
      </div>

      {/* Principais Achados */}
      <InfoCard
        icon={AlertCircle}
        iconGradient="amber"
        title="Principais Achados"
        subtitle="Itens que requerem atenção"
      >
        <div className="space-y-3">
          {[
            { type: "critica", title: "Falta de Política de IA", domain: "Governança de IA", impact: "Crítica" },
            { type: "alta", title: "Dados não validados", domain: "Qualidade de Dados", impact: "Alta" },
            { type: "media", title: "Documentação incompleta", domain: "Documentação", impact: "Média" },
          ].map((finding, idx) => (
            <div key={idx} className="border border-border/50 rounded-lg p-4 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {finding.type === "critica" ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <p className="font-semibold text-card-foreground">{finding.title}</p>
                </div>
                <p className="text-sm text-muted-foreground font-light">{finding.domain}</p>
              </div>
              <Badge
                className={
                  finding.type === "critica"
                    ? "bg-red-100 text-red-800"
                    : finding.type === "alta"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-yellow-100 text-yellow-800"
                }
              >
                {finding.impact}
              </Badge>
            </div>
          ))}
        </div>
      </InfoCard>

      <div className="flex gap-4">
        <Button className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">Exportar Relatório</Button>
        <Button variant="outline" className="flex-1">
          Compartilhar Painel
        </Button>
      </div>
    </div>
  );
}
