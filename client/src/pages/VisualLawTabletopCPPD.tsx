import React from "react";

type SectionProps = {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

type ScenarioProps = {
  trimestre: string;
  tema: string;
  risco: "Baixo" | "Médio" | "Alto" | "Crítico";
  tipo: string;
  children: React.ReactNode;
};

type ActProps = {
  titulo: string;
  foco: string;
  bullets: string[];
};

const Pill: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700 bg-white">
    {label}
  </span>
);

const RiskBadge: React.FC<{ nivel: ScenarioProps["risco"] }> = ({ nivel }) => {
  const map = {
    Baixo: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Médio: "bg-amber-100 text-amber-800 border-amber-300",
    Alto: "bg-orange-100 text-orange-800 border-orange-300",
    Crítico: "bg-red-100 text-red-800 border-red-300",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[nivel]}`}
    >
      {nivel.toUpperCase()}
    </span>
  );
};

const IconShield: React.FC = () => (
  <svg
    aria-hidden="true"
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M12 3L5 6v6c0 4.418 2.686 6.92 7 9 4.314-2.08 7-4.582 7-9V6l-7-3Z"
      className="fill-sky-500/10 stroke-sky-600"
      strokeWidth={1.4}
    />
    <path
      d="M9.5 12.5 11 14l3.5-4"
      className="stroke-sky-700"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconClock: React.FC = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="8"
      className="stroke-slate-500"
      strokeWidth={1.5}
    />
    <path
      d="M12 8v4l2.5 1.5"
      className="stroke-slate-700"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconList: React.FC = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="2"
      className="fill-slate-400/50"
      rx="1"
    />
    <rect
      x="4"
      y="11"
      width="16"
      height="2"
      className="fill-slate-400/50"
      rx="1"
    />
    <rect
      x="4"
      y="16"
      width="10"
      height="2"
      className="fill-slate-400/50"
      rx="1"
    />
  </svg>
);

const Section: React.FC<SectionProps> = ({ id, title, subtitle, children }) => (
  <section
    id={id}
    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6"
  >
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        )}
      </div>
      <div className="h-8 w-1 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500" />
    </div>
    <div className="space-y-3 text-sm text-slate-700">{children}</div>
  </section>
);

const ScenarioCard: React.FC<ScenarioProps> = ({
  trimestre,
  tema,
  risco,
  tipo,
  children,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Exercício trimestral
        </p>
        <h3 className="text-sm font-semibold text-slate-900">
          {trimestre} – {tema}
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Tipo de cenário: {tipo}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <RiskBadge nivel={risco} />
        <Pill label="Simulação em mesa (tabletop)" />
      </div>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-3">{children}</div>
  </div>
);

const ActCard: React.FC<ActProps> = ({ titulo, foco, bullets }) => (
  <div className="flex flex-col rounded-xl border border-slate-200 bg-white/70 p-3">
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
        {titulo}
      </span>
      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 border border-sky-100">
        Foco: {foco}
      </span>
    </div>
    <ul className="mt-1 space-y-1.5 text-[11px] text-slate-700">
      {bullets.map((item, idx) => (
        <li key={idx} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const VisualLawTabletopCPPD: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 md:px-8 lg:px-16">
      {/* Cabeçalho principal */}
      <header className="mx-auto mb-8 max-w-6xl rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 p-6 text-white shadow-md">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/30">
              <IconShield />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-snug md:text-xl">
                Visual Law – Exercícios de Resposta a Incidentes do CPPD
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-sky-50/90">
                Roteiros visuais para simulações em mesa (tabletops) de
                incidentes de segurança, alinhados à LGPD e às boas práticas de
                governança em privacidade.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 rounded-2xl bg-black/15 px-3 py-2">
              <IconClock />
              <div>
                <p className="font-medium">Duração sugerida do exercício</p>
                <p className="text-sky-50/85">90 minutos por cenário</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-black/10 px-3 py-2">
              <IconList />
              <div>
                <p className="font-medium">Saídas obrigatórias</p>
                <p className="text-sky-50/85">
                  Linha do tempo, decisões, evidências, plano de ação
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6">
        {/* OBJETIVO + COMO FUNCIONA */}
        <div className="grid gap-4 md:grid-cols-[1.3fr,1fr]">
          <Section
            id="objetivo"
            title="Objetivo deste material"
            subtitle="Apoiar o CPPD na condução de simulações de incidentes de segurança com linguagem acessível e foco em decisão."
          >
            <p>
              Este documento apresenta, em formato visual, quatro roteiros
              trimestrais de exercícios de simulação de incidentes (tabletops).
              Cada roteiro está estruturado em atos, com fatos liberados em
              etapas, decisões esperadas e saídas obrigatórias.
            </p>
            <p>
              A proposta é permitir que o comitê exercite, de forma periódica,
              a capacidade de detectar, analisar, decidir e comunicar incidentes
              relevantes à privacidade e proteção de dados pessoais.
            </p>
          </Section>

          <Section
            id="como-funciona"
            title="Como funciona o exercício em mesa"
          >
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Estrutura básica
                </p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  <li>• Duração sugerida: 60 a 90 minutos</li>
                  <li>• Formato: simulação guiada, sem uso de sistemas reais</li>
                  <li>• Condução: facilitador do CPPD ou DPO</li>
                </ul>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Participantes principais
                </p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  <li>• Encarregado (DPO) ou coordenador do CPPD</li>
                  <li>• Jurídico / conformidade</li>
                  <li>• Tecnologia da Informação e Segurança</li>
                  <li>• Comunicação / relações institucionais</li>
                  <li>• Representantes de áreas de negócio afetadas</li>
                </ul>
              </div>
            </div>
          </Section>
        </div>

        {/* SAÍDAS ESPERADAS */}
        <Section
          id="saidas"
          title="Saídas esperadas de cada simulação"
          subtitle="O foco não é encontrar culpados, mas fortalecer o processo de resposta."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registros e evidências
              </p>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                <li>• Linha do tempo detalhada do incidente simulado</li>
                <li>• Decisões tomadas e respectivos responsáveis</li>
                <li>• Evidências mínimas que deveriam existir na prática</li>
                <li>• Avaliação da necessidade de comunicar ANPD e titulares</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aprendizado e melhoria contínua
              </p>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                <li>• Lista de lacunas (gaps) identificadas</li>
                <li>• Plano de ação com responsáveis e prazos</li>
                <li>• Métricas preliminares (tempos e qualidade da resposta)</li>
                <li>• Sugestões para aprimorar políticas e fluxos reais</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* CENÁRIOS TRIMESTRAIS */}
        <Section
          id="cenarios"
          title="Roteiros trimestrais de tabletop"
          subtitle="Quatro cenários sugeridos para o ciclo anual de exercícios do CPPD."
        >
          <div className="space-y-4">
            {/* Q1 */}
            <ScenarioCard
              trimestre="Q1"
              tema="Comprometimento de conta por phishing e vazamento de dados de clientes"
              risco="Alto"
              tipo="Ameaça externa / Engenharia social"
            >
              <ActCard
                titulo="Ato 1 – Detecção"
                foco="Reconhecer o incidente"
                bullets={[
                  "Alerta de login suspeito em conta de colaborador (localização incomum).",
                  "Envio automático de dezenas ou centenas de e-mails com planilha de clientes.",
                  "Primeira percepção: incidente técnico ou erro operacional?",
                  "Decisão: classificar como possível incidente de segurança e acionar TI e DPO.",
                ]}
              />
              <ActCard
                titulo="Ato 2 – Análise"
                foco="Escopo e gravidade"
                bullets={[
                  "Confirmação de que a planilha contém dados pessoais (nome, e-mail, telefone, pedidos).",
                  "Análise inicial de volume de titulares afetados.",
                  "Verificação de acesso externo não autorizado à conta.",
                  "Avaliação prévia de risco e necessidade de comunicação à ANPD.",
                ]}
              />
              <ActCard
                titulo="Ato 3 – Comunicação"
                foco="Resposta e transparência"
                bullets={[
                  "Definir se haverá comunicação à ANPD e aos titulares, com base nos critérios da LGPD.",
                  "Desenhar mensagem clara, objetiva e proporcional ao risco.",
                  "Planejar orientações práticas aos titulares para reduzir danos.",
                  "Registrar todas as decisões para fins de prestação de contas.",
                ]}
              />
            </ScenarioCard>

            {/* Q2 */}
            <ScenarioCard
              trimestre="Q2"
              tema="Envio indevido de base de clientes a operador errado"
              risco="Médio"
              tipo="Erro humano / Operador de dados"
            >
              <ActCard
                titulo="Ato 1 – Detecção"
                foco="Reconhecer o envio indevido"
                bullets={[
                  "Colaborador identifica que enviou arquivo errado para um fornecedor.",
                  "Fornecedor confirma o recebimento do arquivo.",
                  "Identificar rapidamente o conteúdo do arquivo (quais dados pessoais constam).",
                  "Acionar jurídico, DPO e quem faz gestão de contratos com operadores.",
                ]}
              />
              <ActCard
                titulo="Ato 2 – Análise"
                foco="Risco e operador"
                bullets={[
                  "Analisar se o fornecedor é de fato operador ou terceiro sem legitimidade.",
                  "Exigir evidência concreta de deleção segura do arquivo.",
                  "Verificar cláusulas contratuais sobre incidente, sigilo e deleção.",
                  "Avaliar risco de reuso ou vazamento futuro dos dados enviados.",
                ]}
              />
              <ActCard
                titulo="Ato 3 – Comunicação"
                foco="Tratamento com transparência"
                bullets={[
                  "Decidir se é caso de comunicação à ANPD e aos titulares.",
                  "Reforçar ou revisar contratos com operadores para evitar recorrência.",
                  "Definir ações de prevenção interna (treinamento, revisão de fluxos e anexos).",
                  "Registrar evidências de cooperação e medidas adotadas.",
                ]}
              />
            </ScenarioCard>

            {/* Q3 */}
            <ScenarioCard
              trimestre="Q3"
              tema="Exposição acidental de armazenamento em nuvem (bucket público)"
              risco="Alto"
              tipo="Configuração inadequada / Nuvem"
            >
              <ActCard
                titulo="Ato 1 – Detecção"
                foco="Identificar exposição"
                bullets={[
                  "Ferramenta de monitoramento ou auditoria identifica bucket com acesso público.",
                  "Checar rapidamente que tipo de arquivos estão armazenados e se há dados pessoais.",
                  "Verificar se indexadores ou robôs de busca acessaram o conteúdo.",
                  "Acionar times de nuvem, segurança e DPO imediatamente.",
                ]}
              />
              <ActCard
                titulo="Ato 2 – Análise"
                foco="Escopo e acessos"
                bullets={[
                  "Remover o acesso público e registrar o momento exato da correção.",
                  "Analisar logs para identificar quantidade e origem de downloads.",
                  "Classificar dados expostos (comuns, sensíveis, crianças, etc.).",
                  "Avaliar probabilidade de uso indevido das informações.",
                ]}
              />
              <ActCard
                titulo="Ato 3 – Comunicação"
                foco="Mitigação externa"
                bullets={[
                  "Definir se o incidente exige comunicação à ANPD e aos titulares.",
                  "Preparar orientações específicas sobre riscos de golpes e fraudes.",
                  "Considerar necessidade de nota oficial ou esclarecimentos públicos.",
                  "Documentar aprendizado para revisão de controles de configuração em nuvem.",
                ]}
              />
            </ScenarioCard>

            {/* Q4 */}
            <ScenarioCard
              trimestre="Q4"
              tema="Incidente envolvendo dados de crianças e adolescentes em ambiente escolar"
              risco="Crítico"
              tipo="Dados de menores / alta sensibilidade"
            >
              <ActCard
                titulo="Ato 1 – Detecção"
                foco="Resposta rápida"
                bullets={[
                  "Pais ou responsáveis relatam que dados de crianças aparecem em grupos de mensagens.",
                  "Confirmar se os dados têm origem em sistemas da instituição.",
                  "Acionar, com máxima prioridade, DPO, direção, TI e jurídico.",
                  "Preservar evidências sem ampliar a circulação das informações.",
                ]}
              />
              <ActCard
                titulo="Ato 2 – Análise"
                foco="Proteção integral"
                bullets={[
                  "Verificar se há dados sensíveis (saúde, deficiência, religião, etc.).",
                  "Identificar tipos de arquivos: fotos, boletins, listas de alunos, endereços.",
                  "Avaliar riscos à integridade física, moral e emocional das crianças.",
                  "Mapear necessidade de intervenção de autoridades competentes.",
                ]}
              />
              <ActCard
                titulo="Ato 3 – Comunicação"
                foco="Cuidado com famílias"
                bullets={[
                  "Comunicar rapidamente pais e responsáveis, com linguagem acolhedora e objetiva.",
                  "Definir medidas emergenciais para proteção das crianças no ambiente digital.",
                  "Avaliar necessidade de comunicação à ANPD, quase sempre presente neste cenário.",
                  "Planejar ações pedagógicas preventivas e de apoio emocional às famílias.",
                ]}
              />
            </ScenarioCard>
          </div>
        </Section>

        {/* MODELOS DE COMUNICAÇÃO */}
        <Section
          id="modelos-comunicacao"
          title="Modelos visuais de comunicação de incidente"
          subtitle="Estruturas básicas para comunicação à ANPD e aos titulares."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Comunicação à ANPD
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Estrutura sugerida, a ser ajustada conforme o caso concreto:
              </p>
              <ol className="mt-2 space-y-1.5 text-sm text-slate-700 list-decimal list-inside">
                <li>Descrição objetiva do incidente e sua origem.</li>
                <li>Categoria e natureza dos dados pessoais afetados.</li>
                <li>Perfil e quantidade aproximada de titulares envolvidos.</li>
                <li>Riscos e impactos identificados para os titulares.</li>
                <li>Medidas técnicas e administrativas já adotadas.</li>
                <li>Plano de ação para correção e prevenção.</li>
                <li>Dados de contato do encarregado pelo tratamento.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Comunicação aos titulares de dados
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Estrutura para aviso transparente e compreensível:
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                <li>• Explicar de forma simples o que ocorreu.</li>
                <li>• Detalhar quais dados podem ter sido afetados.</li>
                <li>
                  • Descrever as medidas adotadas para conter e mitigar o dano.
                </li>
                <li>
                  • Orientar o titular sobre ações preventivas (por exemplo,
                  cuidado com contatos suspeitos).
                </li>
                <li>• Indicar um canal de contato direto com o DPO.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* CHECKLISTS E MÉTRICAS */}
        <Section
          id="checklists-metricas"
          title="Checklists visuais e métricas de acompanhamento"
          subtitle="Referenciais para avaliação de prontidão e melhoria contínua."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evidências mínimas por incidente
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                <li>• Linha do tempo com marcos principais.</li>
                <li>• Registro da cadeia de decisões do CPPD.</li>
                <li>• Logs principais preservados e organizados.</li>
                <li>• Versão final das comunicações emitidas.</li>
                <li>• Lista de ações de follow-up e seu status.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Métricas sugeridas para o CPPD
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                <li>
                  • Tempo para identificar o incidente (MTTA – do fato à
                  detecção).
                </li>
                <li>
                  • Tempo para conter o incidente (MTTC – da detecção à
                  contenção).
                </li>
                <li>
                  • Tempo até a decisão formal sobre comunicação à ANPD e
                  titulares.
                </li>
                <li>
                  • Percentual de ações de melhoria concluídas dentro do prazo.
                </li>
                <li>
                  • Quantidade de lacunas recorrentes entre exercícios
                  trimestrais.
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
};
