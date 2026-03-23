import React from 'react';
import { SmartDPOButton } from '../SmartDPOButton';
import type { DPOActionContext } from './dpoContext';

/**
 * Wrapper padronizado para injetar o botão MeuDPO em qualquer item (ação, checklist, risco, evidência, questionário).
 * SmartDPOButton decide automaticamente se é "MeuDPO" (cliente) ou "Chamado ativo MeuDPO" (consultor/admin).
 */
export function DPOActionWrapper(props: { context: DPOActionContext; className?: string }) {
  const { context, className } = props;
  return (
    <div className={className ?? ''}>
      <SmartDPOButton context={context} />
    </div>
  );
}

export default DPOActionWrapper;
