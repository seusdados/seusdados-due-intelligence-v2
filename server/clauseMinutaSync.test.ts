/**
 * Testes de sincronização Cláusula ↔ Minuta
 * 
 * Valida que as funções de manipulação de cláusulas mantêm
 * acceptedClauses e hiddenClauses sincronizados corretamente.
 */
import { describe, it, expect } from "vitest";

// Simular a lógica de sincronização do ContractAnalysisDetail
function handleClauseAcceptance(
  acceptedClauses: Record<string, boolean>,
  hiddenClauses: Record<string, boolean>,
  clauseId: string,
  accepted: boolean
) {
  const newAccepted = { ...acceptedClauses, [clauseId]: accepted };
  const newHidden = { ...hiddenClauses, [clauseId]: !accepted };
  return { acceptedClauses: newAccepted, hiddenClauses: newHidden };
}

function handleHiddenChange(
  acceptedClauses: Record<string, boolean>,
  hiddenClauses: Record<string, boolean>,
  clauseId: string,
  hidden: boolean
) {
  const newHidden = { ...hiddenClauses, [clauseId]: hidden };
  const newAccepted = { ...acceptedClauses, [clauseId]: !hidden };
  return { acceptedClauses: newAccepted, hiddenClauses: newHidden };
}

function handleAcceptAll(clauseIds: string[]) {
  const allAccepted: Record<string, boolean> = {};
  const allVisible: Record<string, boolean> = {};
  clauseIds.forEach(id => {
    allAccepted[id] = true;
    allVisible[id] = false;
  });
  return { acceptedClauses: allAccepted, hiddenClauses: allVisible };
}

function initializeFromSaved(clauses: Array<{ clauseId: string; isAccepted?: boolean }>) {
  const initialAccepted: Record<string, boolean> = {};
  const initialHidden: Record<string, boolean> = {};
  clauses.forEach(c => {
    const accepted = c.isAccepted ?? true;
    initialAccepted[c.clauseId] = accepted;
    initialHidden[c.clauseId] = !accepted;
  });
  return { acceptedClauses: initialAccepted, hiddenClauses: initialHidden };
}

describe("Sincronização Cláusula ↔ Minuta", () => {
  const clauseIds = ["c1", "c2", "c3", "c4"];

  it("ao desmarcar uma cláusula, ela deve ser ocultada da Minuta", () => {
    const initial = handleAcceptAll(clauseIds);
    // Desmarcar c2
    const result = handleClauseAcceptance(
      initial.acceptedClauses,
      initial.hiddenClauses,
      "c2",
      false
    );
    expect(result.acceptedClauses["c2"]).toBe(false);
    expect(result.hiddenClauses["c2"]).toBe(true);
    // Demais permanecem visíveis
    expect(result.hiddenClauses["c1"]).toBe(false);
    expect(result.hiddenClauses["c3"]).toBe(false);
  });

  it("ao remarcar uma cláusula, ela deve voltar à Minuta", () => {
    const initial = handleAcceptAll(clauseIds);
    // Desmarcar c2
    let state = handleClauseAcceptance(
      initial.acceptedClauses,
      initial.hiddenClauses,
      "c2",
      false
    );
    // Remarcar c2
    state = handleClauseAcceptance(
      state.acceptedClauses,
      state.hiddenClauses,
      "c2",
      true
    );
    expect(state.acceptedClauses["c2"]).toBe(true);
    expect(state.hiddenClauses["c2"]).toBe(false);
  });

  it("ao ocultar via botão de olho, deve desmarcar o aceite", () => {
    const initial = handleAcceptAll(clauseIds);
    const result = handleHiddenChange(
      initial.acceptedClauses,
      initial.hiddenClauses,
      "c3",
      true
    );
    expect(result.hiddenClauses["c3"]).toBe(true);
    expect(result.acceptedClauses["c3"]).toBe(false);
  });

  it("ao mostrar via botão de olho, deve marcar como aceita", () => {
    const initial = handleAcceptAll(clauseIds);
    let state = handleHiddenChange(
      initial.acceptedClauses,
      initial.hiddenClauses,
      "c3",
      true
    );
    state = handleHiddenChange(
      state.acceptedClauses,
      state.hiddenClauses,
      "c3",
      false
    );
    expect(state.hiddenClauses["c3"]).toBe(false);
    expect(state.acceptedClauses["c3"]).toBe(true);
  });

  it("aceitar todas deve mostrar todas na Minuta", () => {
    const result = handleAcceptAll(clauseIds);
    clauseIds.forEach(id => {
      expect(result.acceptedClauses[id]).toBe(true);
      expect(result.hiddenClauses[id]).toBe(false);
    });
  });

  it("inicialização com cláusulas salvas deve sincronizar hidden com accepted", () => {
    const saved = [
      { clauseId: "c1", isAccepted: true },
      { clauseId: "c2", isAccepted: false },
      { clauseId: "c3", isAccepted: true },
      { clauseId: "c4", isAccepted: false },
    ];
    const result = initializeFromSaved(saved);
    expect(result.acceptedClauses["c1"]).toBe(true);
    expect(result.hiddenClauses["c1"]).toBe(false);
    expect(result.acceptedClauses["c2"]).toBe(false);
    expect(result.hiddenClauses["c2"]).toBe(true);
    expect(result.acceptedClauses["c4"]).toBe(false);
    expect(result.hiddenClauses["c4"]).toBe(true);
  });

  it("cláusulas sem isAccepted devem ser aceitas por padrão", () => {
    const saved = [
      { clauseId: "c1" },
      { clauseId: "c2" },
    ];
    const result = initializeFromSaved(saved);
    expect(result.acceptedClauses["c1"]).toBe(true);
    expect(result.hiddenClauses["c1"]).toBe(false);
    expect(result.acceptedClauses["c2"]).toBe(true);
    expect(result.hiddenClauses["c2"]).toBe(false);
  });

  it("visibleClauses deve filtrar corretamente com hiddenClauses", () => {
    const clauses = clauseIds.map(id => ({ id, titulo: `Cláusula ${id}`, conteudo: "..." }));
    const { hiddenClauses } = handleAcceptAll(clauseIds);
    // Ocultar c2 e c4
    hiddenClauses["c2"] = true;
    hiddenClauses["c4"] = true;
    
    const visibleClauses = clauses.filter(c => !hiddenClauses[c.id]);
    expect(visibleClauses.length).toBe(2);
    expect(visibleClauses.map(c => c.id)).toEqual(["c1", "c3"]);
  });
});
