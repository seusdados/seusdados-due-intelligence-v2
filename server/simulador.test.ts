// Testes unitários para o módulo Simulador CPPD
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as simuladorService from './simuladorService';
import * as scenarioService from './scenarioService';
import { getDb } from './db';
import {
  simulations,
  simulationScenarios,
  simulationDecisions,
  simulationEvents,
  simulationFeedback,
} from '../drizzle/schema';

describe('Módulo Simulador CPPD', () => {
  let testOrgId = 1;
  let testUserId = 1;
  let testScenarioId: number;
  let testSimulationId: number;

  describe('Estrutura do Schema', () => {
    it('deve ter tabela de cenários', () => {
      expect(simulationScenarios).toBeDefined();
    });

    it('deve ter tabela de simulações', () => {
      expect(simulations).toBeDefined();
    });

    it('deve ter tabela de decisões', () => {
      expect(simulationDecisions).toBeDefined();
    });

    it('deve ter tabela de eventos', () => {
      expect(simulationEvents).toBeDefined();
    });

    it('deve ter tabela de feedback', () => {
      expect(simulationFeedback).toBeDefined();
    });
  });

  describe('Gerenciamento de Cenários', () => {
    it('deve criar um cenário corretamente', async () => {
      testScenarioId = await scenarioService.createScenario({
        organizationId: testOrgId,
        createdById: testUserId,
        nome: 'Teste - Phishing em Massa',
        tipoIncidente: 'Phishing',
        descricao: 'Cenário de teste para phishing em massa',
        areasEnvolvidas: ['TI', 'Segurança', 'Jurídico'],
        sistemasAfetados: ['E-mail', 'CRM'],
        objetivos: ['Testar resposta rápida', 'Validar comunicação'],
        papeisChave: ['DPO', 'CISO', 'Jurídico'],
        criteriosSucesso: ['Detecção em < 30min', 'Contenção em < 2h'],
        trimestre: '2025-Q1',
      });

      expect(testScenarioId).toBeGreaterThan(0);
    });

    it('deve listar cenários por organização', async () => {
      const scenarios = await scenarioService.listScenarios(testOrgId);
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('deve obter cenário por ID', async () => {
      const scenario = await scenarioService.getScenarioById(testScenarioId);
      expect(scenario).toBeDefined();
      expect(scenario.nome).toBe('Teste - Phishing em Massa');
      expect(scenario.organizationId).toBe(testOrgId);
    });

    it('deve atualizar cenário', async () => {
      await scenarioService.updateScenario(testScenarioId, {
        descricao: 'Descrição atualizada para teste',
      });

      const updated = await scenarioService.getScenarioById(testScenarioId);
      expect(updated.descricao).toBe('Descrição atualizada para teste');
    });

    it('deve duplicar cenário', async () => {
      const newId = await scenarioService.duplicateScenario(
        testScenarioId,
        'Teste - Phishing em Massa (Cópia)',
        testUserId
      );

      expect(newId).toBeGreaterThan(0);
      expect(newId).not.toBe(testScenarioId);

      const duplicate = await scenarioService.getScenarioById(newId);
      expect(duplicate.nome).toBe('Teste - Phishing em Massa (Cópia)');
    });
  });

  describe('Gerenciamento de Simulações', () => {
    it('deve criar uma simulação corretamente', async () => {
      testSimulationId = await simuladorService.createSimulation({
        organizationId: testOrgId,
        scenarioId: testScenarioId,
        scenarioName: 'Teste - Phishing em Massa',
        createdById: testUserId,
        quarter: '2025-Q1',
        participants: ['João Silva', 'Maria Santos'],
      });

      expect(testSimulationId).toBeGreaterThan(0);
    });

    it('deve listar simulações por organização', async () => {
      const simList = await simuladorService.listSimulations(testOrgId);
      expect(Array.isArray(simList)).toBe(true);
      expect(simList.length).toBeGreaterThan(0);
    });

    it('deve obter simulação por ID', async () => {
      const simulation = await simuladorService.getSimulationById(testSimulationId);
      expect(simulation).toBeDefined();
      expect(simulation.organizationId).toBe(testOrgId);
      expect(simulation.status).toBe('planejada');
    });

    it('deve iniciar simulação', async () => {
      await simuladorService.startSimulation(testSimulationId);
      const simulation = await simuladorService.getSimulationById(testSimulationId);
      expect(simulation.status).toBe('em_andamento');
    });

    it('deve pausar simulação', async () => {
      await simuladorService.pauseSimulation(testSimulationId);
      const simulation = await simuladorService.getSimulationById(testSimulationId);
      expect(simulation.status).toBe('pausada');
    });

    it('deve atualizar simulação', async () => {
      await simuladorService.updateSimulation(testSimulationId, {
        notes: 'Notas de teste',
        phaseTimings: {
          detection: 25,
          triage: 15,
        },
      });

      const simulation = await simuladorService.getSimulationById(testSimulationId);
      expect(simulation.notes).toBe('Notas de teste');
      expect(simulation.phaseTimings.detection).toBe(25);
    });

    it('deve concluir simulação', async () => {
      await simuladorService.completeSimulation(testSimulationId, {
        phaseTimings: {
          detection: 25,
          triage: 15,
          containment: 45,
          recovery: 120,
        },
        kpiValues: {
          mttd: 25,
          mttr: 120,
        },
        playbookAdherence: 85,
        recordsCompleteness: 90,
        notes: 'Simulação concluída com sucesso',
      });

      const simulation = await simuladorService.getSimulationById(testSimulationId);
      expect(simulation.status).toBe('concluida');
      expect(simulation.endTime).toBeDefined();
      expect(simulation.playbookAdherence).toBe(85);
    });
  });

  describe('Registro de Decisões', () => {
    it('deve registrar uma decisão', async () => {
      const decisionId = await simuladorService.recordDecision({
        simulationId: testSimulationId,
        organizationId: testOrgId,
        phase: 'detection',
        description: 'Decisão de isolar sistema comprometido',
        decisionMaker: 'João Silva',
        decisionType: 'operational',
        notes: 'Ação imediata necessária',
      });

      expect(decisionId).toBeGreaterThan(0);
    });

    it('deve listar decisões de uma simulação', async () => {
      const decisions = await simuladorService.listDecisions(testSimulationId);
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].description).toBe('Decisão de isolar sistema comprometido');
    });
  });

  describe('Registro de Eventos', () => {
    it('deve registrar um evento', async () => {
      const eventId = await simuladorService.recordEvent({
        simulationId: testSimulationId,
        organizationId: testOrgId,
        phase: 'detection',
        eventType: 'alerta_seguranca',
        title: 'Alerta de Segurança',
        description: 'Sistema detectou atividade anômala',
        severity: 'alta',
      });

      expect(eventId).toBeGreaterThan(0);
    });

    it('deve listar eventos de uma simulação', async () => {
      const events = await simuladorService.listEvents(testSimulationId);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].title).toBe('Alerta de Segurança');
    });

    it('deve marcar evento como lido', async () => {
      const events = await simuladorService.listEvents(testSimulationId);
      const eventId = events[0].id;

      await simuladorService.markEventAsRead(eventId);

      const updatedEvents = await simuladorService.listEvents(testSimulationId);
      const updatedEvent = updatedEvents.find(e => e.id === eventId);
      expect(Boolean(updatedEvent?.isRead)).toBe(true);
    });
  });

  describe('Feedback de Participantes', () => {
    it('deve submeter feedback', async () => {
      const feedbackId = await simuladorService.submitFeedback({
        simulationId: testSimulationId,
        organizationId: testOrgId,
        participantId: testUserId,
        participantRole: 'DPO',
        clarityScore: 5,
        communicationScore: 4,
        toolsScore: 5,
        strengths: 'Boa comunicação entre equipes',
        weaknesses: 'Tempo de resposta inicial pode melhorar',
        suggestions: 'Adicionar mais cenários de treino',
      });

      expect(feedbackId).toBeGreaterThan(0);
    });

    it('deve listar feedback de uma simulação', async () => {
      const feedbackList = await simuladorService.listFeedback(testSimulationId);
      expect(Array.isArray(feedbackList)).toBe(true);
      expect(feedbackList.length).toBeGreaterThan(0);
      expect(feedbackList[0].clarityScore).toBe(5);
    });
  });

  describe('Métricas e Análises', () => {
    it('deve calcular métricas gerais', async () => {
      const metrics = await simuladorService.getMetrics(testOrgId);
      expect(metrics).toBeDefined();
      expect(metrics.totalSimulations).toBeGreaterThan(0);
      expect(metrics.completedSimulations).toBeGreaterThan(0);
      expect(typeof metrics.averageMttd).toBe('number');
      expect(typeof metrics.averageMttr).toBe('number');
    });

    it('deve calcular tendências por trimestre', async () => {
      const trends = await simuladorService.getTrends(testOrgId, ['2025-Q1']);
      expect(Array.isArray(trends)).toBe(true);
      if (trends.length > 0) {
        expect(trends[0].period).toBe('2025-Q1');
        expect(typeof trends[0].mttd).toBe('number');
        expect(typeof trends[0].mttr).toBe('number');
      }
    });
  });

  describe('Validações de Segurança', () => {
    it('deve rejeitar título de cenário vazio', async () => {
      await expect(scenarioService.createScenario({
        organizationId: testOrgId,
        createdById: testUserId,
        nome: '',
        tipoIncidente: 'Teste',
        descricao: 'Teste',
        areasEnvolvidas: [],
        sistemasAfetados: [],
        objetivos: [],
        papeisChave: [],
        criteriosSucesso: [],
      })).rejects.toThrow();
    });

    it('deve rejeitar scores de feedback fora do range', async () => {
      await expect(simuladorService.submitFeedback({
        simulationId: testSimulationId,
        organizationId: testOrgId,
        participantId: testUserId,
        participantRole: 'DPO',
        clarityScore: 6, // Inválido (deve ser 1-5)
        communicationScore: 4,
        toolsScore: 5,
      })).rejects.toThrow();
    });
  });

  describe('Multitenancy', () => {
    it('deve filtrar simulações por organizationId', async () => {
      const simList = await simuladorService.listSimulations(testOrgId);
      simList.forEach(sim => {
        expect(sim.organizationId).toBe(testOrgId);
      });
    });

    it('deve filtrar cenários por organizationId', async () => {
      const scenarios = await scenarioService.listScenarios(testOrgId);
      scenarios.forEach(scenario => {
        expect(scenario.organizationId).toBe(testOrgId);
      });
    });
  });
});
