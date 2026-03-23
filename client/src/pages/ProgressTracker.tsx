import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface DomainProgress {
  id: string;
  name: string;
  totalQuestions: number;
  answeredQuestions: number;
  progress: number;
  status: 'não_iniciado' | 'em_andamento' | 'concluído';
}

interface RespondentProgress {
  id: number;
  name: string;
  email: string;
  totalDomains: number;
  completedDomains: number;
  progress: number;
  status: 'não_iniciado' | 'em_andamento' | 'concluído';
}

export function ProgressTracker() {
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [respondentProgress, setRespondentProgress] = useState<RespondentProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // Simular dados de progresso
  useEffect(() => {
    const mockDomains: DomainProgress[] = [
      { id: '1', name: 'Governança de Dados', totalQuestions: 5, answeredQuestions: 3, progress: 60, status: 'em_andamento' },
      { id: '2', name: 'Segurança da Informação', totalQuestions: 8, answeredQuestions: 8, progress: 100, status: 'concluído' },
      { id: '3', name: 'Conformidade Legal', totalQuestions: 6, answeredQuestions: 0, progress: 0, status: 'não_iniciado' },
      { id: '4', name: 'Incidentes e Breach', totalQuestions: 4, answeredQuestions: 2, progress: 50, status: 'em_andamento' },
    ];

    const mockRespondents: RespondentProgress[] = [
      { id: 1, name: 'João Silva', email: 'joao@empresa.com', totalDomains: 4, completedDomains: 2, progress: 50, status: 'em_andamento' },
      { id: 2, name: 'Maria Santos', email: 'maria@empresa.com', totalDomains: 4, completedDomains: 4, progress: 100, status: 'concluído' },
      { id: 3, name: 'Pedro Costa', email: 'pedro@empresa.com', totalDomains: 4, completedDomains: 1, progress: 25, status: 'em_andamento' },
    ];

    setDomainProgress(mockDomains);
    setRespondentProgress(mockRespondents);

    // Calcular progresso geral
    const totalAnswers = mockDomains.reduce((sum, d) => sum + d.answeredQuestions, 0);
    const totalQuestions = mockDomains.reduce((sum, d) => sum + d.totalQuestions, 0);
    setOverallProgress(Math.round((totalAnswers / totalQuestions) * 100));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluído':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800';
      case 'não_iniciado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluído':
        return '✓ Concluído';
      case 'em_andamento':
        return '⟳ Em Progresso';
      case 'não_iniciado':
        return '○ Não Iniciado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Progresso da Avaliação</h1>
          <p className="text-lg text-gray-600">Acompanhe o progresso em tempo real</p>
        </div>

        {/* Progresso Geral */}
        <Card className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Progresso Geral</h2>
            <span className="text-4xl font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 bg-white/30" />
          <p className="text-sm mt-3 text-white/90">
            {domainProgress.reduce((sum, d) => sum + d.answeredQuestions, 0)} de{' '}
            {domainProgress.reduce((sum, d) => sum + d.totalQuestions, 0)} questões respondidas
          </p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Progresso por Domínio */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Progresso por Domínio</h2>

            <div className="space-y-4">
              {domainProgress.map(domain => (
                <div key={domain.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{domain.name}</h3>
                    <Badge className={`${getStatusColor(domain.status)}`}>
                      {getStatusLabel(domain.status)}
                    </Badge>
                  </div>

                  <Progress value={domain.progress} className="h-2 mb-2" />

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{domain.answeredQuestions} de {domain.totalQuestions} questões</span>
                    <span className="font-semibold">{domain.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Progresso por Respondente */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Progresso por Respondente</h2>

            <div className="space-y-4">
              {respondentProgress.map(respondent => (
                <div key={respondent.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{respondent.name}</h3>
                      <p className="text-sm text-gray-600">{respondent.email}</p>
                    </div>
                    <Badge className={`${getStatusColor(respondent.status)}`}>
                      {getStatusLabel(respondent.status)}
                    </Badge>
                  </div>

                  <Progress value={respondent.progress} className="h-2 mb-2" />

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{respondent.completedDomains} de {respondent.totalDomains} domínios</span>
                    <span className="font-semibold">{respondent.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Estatísticas */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-600 font-semibold">Concluídos</p>
            <p className="text-3xl font-bold text-green-700 mt-2">
              {domainProgress.filter(d => d.status === 'concluído').length}
            </p>
          </Card>

          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-600 font-semibold">Em Progresso</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">
              {domainProgress.filter(d => d.status === 'em_andamento').length}
            </p>
          </Card>

          <Card className="p-4 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600 font-semibold">Não Iniciados</p>
            <p className="text-3xl font-bold text-gray-700 mt-2">
              {domainProgress.filter(d => d.status === 'não_iniciado').length}
            </p>
          </Card>

          <Card className="p-4 bg-purple-50 border border-purple-200">
            <p className="text-sm text-purple-600 font-semibold">Total de Domínios</p>
            <p className="text-3xl font-bold text-purple-700 mt-2">{domainProgress.length}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
