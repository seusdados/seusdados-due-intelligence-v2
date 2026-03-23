import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CinematicLoader } from '@/components/CinematicLoader';

interface Domain {
  id: string;
  name: string;
  description: string;
  questions: number;
}

interface Respondent {
  id: number;
  name: string;
  email: string;
}

export function AssignmentDomains() {
  const [, navigate] = useLocation();
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedRespondents, setSelectedRespondents] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Simular dados de domínios (em produção, viriam do backend)
  const mockDomains: Domain[] = [
    { id: '1', name: 'Governança de Dados', description: 'Políticas e estrutura de governança', questions: 5 },
    { id: '2', name: 'Segurança da Informação', description: 'Proteção e segurança de dados', questions: 8 },
    { id: '3', name: 'Conformidade Legal', description: 'Conformidade com legislação', questions: 6 },
    { id: '4', name: 'Incidentes e Breach', description: 'Gestão de incidentes de segurança', questions: 4 },
  ];

  // Simular dados de respondentes
  const mockRespondents: Respondent[] = [
    { id: 1, name: 'João Silva', email: 'joao@empresa.com' },
    { id: 2, name: 'Maria Santos', email: 'maria@empresa.com' },
    { id: 3, name: 'Pedro Costa', email: 'pedro@empresa.com' },
  ];

  useEffect(() => {
    setDomains(mockDomains);
    setRespondents(mockRespondents);
  }, []);

  const toggleDomain = (domainId: string) => {
    const newSelected = new Set(selectedDomains);
    if (newSelected.has(domainId)) {
      newSelected.delete(domainId);
    } else {
      newSelected.add(domainId);
    }
    setSelectedDomains(newSelected);
  };

  const toggleRespondent = (respondentId: number) => {
    const newSelected = new Set(selectedRespondents);
    if (newSelected.has(respondentId)) {
      newSelected.delete(respondentId);
    } else {
      newSelected.add(respondentId);
    }
    setSelectedRespondents(newSelected);
  };

  const selectAllDomains = () => {
    if (selectedDomains.size === domains.length) {
      setSelectedDomains(new Set());
    } else {
      setSelectedDomains(new Set(domains.map(d => d.id)));
    }
  };

  const selectAllRespondents = () => {
    if (selectedRespondents.size === respondents.length) {
      setSelectedRespondents(new Set());
    } else {
      setSelectedRespondents(new Set(respondents.map(r => r.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedDomains.size === 0 || selectedRespondents.size === 0) {
      alert('Selecione pelo menos um domínio e um respondente');
      return;
    }

    setLoading(true);
    try {
      // TODO: Chamar endpoint para salvar atribuições
      alert(`Atribuído ${selectedDomains.size} domínio(s) para ${selectedRespondents.size} respondente(s)`);
      
      // Redirecionar para dashboard de avaliação
      navigate(`/avaliacoes/${assessmentId}`);
    } catch (error) {
      alert('Erro ao atribuir domínios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CinematicLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Atribuir Domínios</h1>
          <p className="text-lg text-gray-600">Selecione os domínios e respondentes para esta avaliação</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Domínios */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Domínios</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllDomains}
                className="text-blue-600 hover:bg-blue-50"
              >
                {selectedDomains.size === domains.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="space-y-3">
              {domains.map(domain => (
                <div
                  key={domain.id}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => toggleDomain(domain.id)}
                >
                  <Checkbox
                    checked={selectedDomains.has(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{domain.name}</p>
                    <p className="text-sm text-gray-600">{domain.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{domain.questions} questões</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{selectedDomains.size}</strong> de <strong>{domains.length}</strong> domínios selecionados
            </p>
            </div>
          </Card>

          {/* Respondentes */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Respondentes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllRespondents}
                className="text-blue-600 hover:bg-blue-50"
              >
                {selectedRespondents.size === respondents.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="space-y-3">
              {respondents.map(respondent => (
                <div
                  key={respondent.id}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => toggleRespondent(respondent.id)}
                >
                  <Checkbox
                    checked={selectedRespondents.has(respondent.id)}
                    onChange={() => toggleRespondent(respondent.id)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{respondent.name}</p>
                    <p className="text-sm text-gray-600">{respondent.email}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{selectedRespondents.size}</strong> de <strong>{respondents.length}</strong> respondentes selecionados
              </p>
            </div>
          </Card>
        </div>

        {/* Botões de Ação */}
        <div className="mt-8 flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/avaliacoes')}
            className="px-6 py-2"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedDomains.size === 0 || selectedRespondents.size === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Atribuir Domínios
          </Button>
        </div>
      </div>
    </div>
  );
}
