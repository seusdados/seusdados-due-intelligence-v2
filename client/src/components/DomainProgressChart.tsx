import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Domain {
  id: string | number;
  titulo: string;
  questoes: Array<{ id: string | number }>;
}

interface DomainProgressChartProps {
  domains: Domain[];
  responses: Record<string, { level: number; notes: string }>;
}

export function DomainProgressChart({ domains, responses }: DomainProgressChartProps) {
  const chartData = useMemo(() => {
    return domains.map(domain => {
      const totalQuestions = domain.questoes.length;
      const answeredQuestions = domain.questoes.filter(q => 
        responses[`${domain.id}-${q.id}`]?.level > 0
      ).length;
      const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

      return {
        name: domain.titulo.substring(0, 15),
        progress: progressPercent,
        answered: answeredQuestions,
        total: totalQuestions,
        fullName: domain.titulo
      };
    });
  }, [domains, responses]);

  const getBarColor = (progress: number) => {
    if (progress === 0) return '#ef4444';
    if (progress < 33) return '#f97316';
    if (progress < 66) return '#eab308';
    if (progress < 100) return '#84cc16';
    return '#22c55e';
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]}
            label={{ value: 'Progresso (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value, name, props) => {
              if (name === 'progress') {
                return [`${value}% (${props.payload.answered}/${props.payload.total} questões)`, 'Progresso'];
              }
              return value;
            }}
            contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="progress" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.progress)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getBarColor(item.progress) }}
            />
            <span className="truncate">{item.fullName}: {item.progress}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
