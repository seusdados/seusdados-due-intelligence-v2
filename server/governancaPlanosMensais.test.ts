import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import {
  getAllPlanoAnualTemplates,
  getPlanoAnualTemplateByType,
  seedPlanoAnualTemplates,
  calcularProgressoPlano,
} from "./governancaService";
import { planoAno1, planoEmCurso } from "./seeds/governancaPlanosMensais";

describe("Governança Planos Mensais", () => {
  describe("Templates de Planos Anuais", () => {
    it("deve retornar todos os templates de planos anuais", () => {
      const templates = getAllPlanoAnualTemplates();
      expect(templates).toHaveLength(2);
      expect(templates[0].programModel).toBe("ano1");
      expect(templates[1].programModel).toBe("em_curso");
    });

    it("deve retornar o template correto por tipo ano1", () => {
      const template = getPlanoAnualTemplateByType("ano1");
      expect(template).toBeDefined();
      expect(template?.programModel).toBe("ano1");
      expect(template?.totalMonths).toBe(10);
      expect(template?.months).toHaveLength(10);
    });

    it("deve retornar o template correto por tipo em_curso", () => {
      const template = getPlanoAnualTemplateByType("em_curso");
      expect(template).toBeDefined();
      expect(template?.programModel).toBe("em_curso");
      expect(template?.totalMonths).toBe(10);
      expect(template?.months).toHaveLength(10);
    });

    it("deve ter todos os meses com atividades e entregáveis no template ano1", () => {
      for (const mes of planoAno1.months) {
        expect(mes.monthNumber).toBeGreaterThan(0);
        expect(mes.monthNumber).toBeLessThanOrEqual(10);
        expect(mes.activities.length).toBeGreaterThan(0);
        expect(mes.deliverables.length).toBeGreaterThan(0);
        expect(mes.macroBlock).toBeTruthy();
        expect(mes.title).toBeTruthy();
        expect(mes.theme).toBeTruthy();
      }
    });

    it("deve ter todos os meses com atividades e entregáveis no template em_curso", () => {
      for (const mes of planoEmCurso.months) {
        expect(mes.monthNumber).toBeGreaterThan(0);
        expect(mes.monthNumber).toBeLessThanOrEqual(10);
        expect(mes.activities.length).toBeGreaterThan(0);
        expect(mes.deliverables.length).toBeGreaterThan(0);
        expect(mes.macroBlock).toBeTruthy();
        expect(mes.title).toBeTruthy();
        expect(mes.theme).toBeTruthy();
      }
    });
  });

  describe("Cálculo de Progresso", () => {
    it("deve calcular progresso zero quando não há atividades concluídas", () => {
      const meses = [
        {
          atividades: [{ status: "pendente" }, { status: "pendente" }],
          entregaveis: [{ status: "pendente" }, { status: "pendente" }],
        },
      ];

      const progresso = calcularProgressoPlano(meses);

      expect(progresso.totalAtividades).toBe(2);
      expect(progresso.atividadesConcluidas).toBe(0);
      expect(progresso.totalEntregaveis).toBe(2);
      expect(progresso.entregaveisConcluidos).toBe(0);
      expect(progresso.percentualAtividades).toBe(0);
      expect(progresso.percentualEntregaveis).toBe(0);
      expect(progresso.percentualGeral).toBe(0);
    });

    it("deve calcular progresso 100% quando todas atividades e entregáveis estão concluídos", () => {
      const meses = [
        {
          atividades: [{ status: "concluida" }, { status: "concluida" }],
          entregaveis: [{ status: "aprovado" }, { status: "aprovado" }],
        },
      ];

      const progresso = calcularProgressoPlano(meses);

      expect(progresso.totalAtividades).toBe(2);
      expect(progresso.atividadesConcluidas).toBe(2);
      expect(progresso.totalEntregaveis).toBe(2);
      expect(progresso.entregaveisConcluidos).toBe(2);
      expect(progresso.percentualAtividades).toBe(100);
      expect(progresso.percentualEntregaveis).toBe(100);
      expect(progresso.percentualGeral).toBe(100);
    });

    it("deve calcular progresso parcial corretamente", () => {
      const meses = [
        {
          atividades: [{ status: "concluida" }, { status: "pendente" }, { status: "pendente" }, { status: "pendente" }],
          entregaveis: [{ status: "aprovado" }, { status: "pendente" }],
        },
      ];

      const progresso = calcularProgressoPlano(meses);

      expect(progresso.totalAtividades).toBe(4);
      expect(progresso.atividadesConcluidas).toBe(1);
      expect(progresso.totalEntregaveis).toBe(2);
      expect(progresso.entregaveisConcluidos).toBe(1);
      expect(progresso.percentualAtividades).toBe(25);
      expect(progresso.percentualEntregaveis).toBe(50);
      expect(progresso.percentualGeral).toBe(38); // (25 + 50) / 2 = 37.5 arredondado
    });

    it("deve calcular progresso com múltiplos meses", () => {
      const meses = [
        {
          atividades: [{ status: "concluida" }, { status: "concluida" }],
          entregaveis: [{ status: "aprovado" }],
        },
        {
          atividades: [{ status: "pendente" }, { status: "pendente" }],
          entregaveis: [{ status: "pendente" }],
        },
      ];

      const progresso = calcularProgressoPlano(meses);

      expect(progresso.totalAtividades).toBe(4);
      expect(progresso.atividadesConcluidas).toBe(2);
      expect(progresso.totalEntregaveis).toBe(2);
      expect(progresso.entregaveisConcluidos).toBe(1);
      expect(progresso.percentualAtividades).toBe(50);
      expect(progresso.percentualEntregaveis).toBe(50);
      expect(progresso.percentualGeral).toBe(50);
    });

    it("deve lidar com meses vazios", () => {
      const meses: Array<{ atividades: Array<{ status: string }>; entregaveis: Array<{ status: string }> }> = [];

      const progresso = calcularProgressoPlano(meses);

      expect(progresso.totalAtividades).toBe(0);
      expect(progresso.atividadesConcluidas).toBe(0);
      expect(progresso.totalEntregaveis).toBe(0);
      expect(progresso.entregaveisConcluidos).toBe(0);
      expect(progresso.percentualAtividades).toBe(0);
      expect(progresso.percentualEntregaveis).toBe(0);
      expect(progresso.percentualGeral).toBe(0);
    });
  });

  describe("Estrutura dos Templates", () => {
    it("template ano1 deve ter blocos macro corretos", () => {
      const blocosEsperados = [
        "Fundamentos e Mapeamento",
        "Conformidade Legal",
        "Riscos e Políticas",
        "Pessoas e Segurança",
        "Direitos e Auditoria",
      ];

      const blocosEncontrados = new Set(planoAno1.months.map(m => m.macroBlock));
      
      for (const bloco of blocosEsperados) {
        expect(blocosEncontrados.has(bloco)).toBe(true);
      }
    });

    it("template em_curso deve ter blocos macro corretos", () => {
      const blocosEsperados = [
        "Planejamento e Revisão",
        "Conformidade e Contratos",
        "Privacy by Design",
        "Terceiros e TID",
        "Riscos e EIPD",
        "Direitos e Transparência",
        "Auditoria e Monitoramento",
        "Consolidação",
      ];

      const blocosEncontrados = new Set(planoEmCurso.months.map(m => m.macroBlock));
      
      for (const bloco of blocosEsperados) {
        expect(blocosEncontrados.has(bloco)).toBe(true);
      }
    });

    it("todos os meses devem ter ícones válidos", () => {
      const iconesValidos = [
        "FileSearch", "Database", "Scale", "Users", "AlertTriangle", "FileText",
        "GraduationCap", "Shield", "UserCheck", "ClipboardCheck", "Calendar",
        "Lightbulb", "Globe", "Award", "RefreshCw", "Target",
      ];

      for (const mes of [...planoAno1.months, ...planoEmCurso.months]) {
        expect(iconesValidos).toContain(mes.icon);
      }
    });

    it("todos os meses devem ter cores de bloco válidas", () => {
      const coresValidas = ["#5f29cc", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899"];

      for (const mes of [...planoAno1.months, ...planoEmCurso.months]) {
        expect(coresValidas).toContain(mes.blockColor);
      }
    });
  });

  describe("Seed de Templates no Banco", () => {
    it("deve fazer seed dos templates sem erro", async () => {
      // Esta função deve ser idempotente
      await expect(seedPlanoAnualTemplates()).resolves.not.toThrow();
    });

    it("deve listar templates do banco após seed", async () => {
      await seedPlanoAnualTemplates();
      const templates = await db.listPlanoAnualTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });
  });
});
