import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type UserRole = 
  | 'admin_global' 
  | 'admin_global' 
  | 'consultor' 
  | 'consultor'
  | 'sponsor' 
  | 'sponsor' 
  | 'comite' 
  | 'lider_processo' 
  | 'gestor_area' 
  | 'sponsor' 
  | 'terceiro';

export type ClientRole = 'sponsor' | 'comite' | 'lider_processo' | 'gestor_area';

const EQUIPE_INTERNA_ROLES: UserRole[] = ['admin_global', 'consultor'];
const CLIENT_ROLES: ClientRole[] = ['sponsor', 'comite', 'lider_processo', 'gestor_area'];

const ROLE_LABELS: Record<UserRole | ClientRole, string> = {
  admin_global: 'Admin Global',
  consultor: 'Consultor',
  sponsor: 'Sponsor',
  comite: 'Comitê',
  lider_processo: 'Líder de Processo',
  gestor_area: 'Gestor de Área',
  terceiro: 'Terceiro',
};

interface RoleSelectorProps {
  mainRole: UserRole;
  clientRoles: ClientRole[];
  onMainRoleChange: (role: UserRole) => void;
  onClientRolesChange: (roles: ClientRole[]) => void;
  disabled?: boolean;
}

export function RoleSelector({
  mainRole,
  clientRoles,
  onMainRoleChange,
  onClientRolesChange,
  disabled = false,
}: RoleSelectorProps) {
  const [isClientRolesOpen, setIsClientRolesOpen] = useState(false);

  const isInternalTeam = EQUIPE_INTERNA_ROLES.includes(mainRole);
  const selectedClientRolesText = clientRoles.length > 0 
    ? `${clientRoles.length} papel(éis) selecionado(s)`
    : 'Nenhum papel Cliente selecionado';

  const toggleClientRole = (role: ClientRole) => {
    if (clientRoles.includes(role)) {
      onClientRolesChange(clientRoles.filter(r => r !== role));
    } else {
      onClientRolesChange([...clientRoles, role]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Role Selection */}
      <div className="space-y-2">
        <Label htmlFor="main-role">Perfil de Acesso Principal</Label>
        <Select
          value={mainRole}
          onValueChange={(value) => onMainRoleChange(value as UserRole)}
          disabled={disabled}
        >
          <SelectTrigger id="main-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin_global">Admin Global</SelectItem>
            <SelectItem value="admin_global">PMO</SelectItem>
            <SelectItem value="consultor">Consultor</SelectItem>
            <SelectItem value="consultor">Consultor Par</SelectItem>
            <SelectItem value="sponsor">Sponsor</SelectItem>
            <SelectItem value="sponsor">DPO Interno</SelectItem>
            <SelectItem value="comite">Comitê</SelectItem>
            <SelectItem value="lider_processo">Líder de Processo</SelectItem>
            <SelectItem value="gestor_area">Gestor de Área</SelectItem>
            <SelectItem value="sponsor">Usuário</SelectItem>
            <SelectItem value="terceiro">Terceiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Roles Multi-Selection (only for internal team) */}
      {isInternalTeam && (
        <div className="space-y-2">
          <Label>Papéis Cliente Adicionais (Multi-seleção)</Label>
          <Popover open={isClientRolesOpen} onOpenChange={setIsClientRolesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={disabled}
              >
                {selectedClientRolesText}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-4" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Selecione os papéis Cliente:</p>
                {CLIENT_ROLES.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`client-role-${role}`}
                      checked={clientRoles.includes(role)}
                      onCheckedChange={() => toggleClientRole(role)}
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`client-role-${role}`}
                      className="font-normal cursor-pointer"
                    >
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Display selected roles as badges */}
          {clientRoles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {clientRoles.map((role) => (
                <div
                  key={role}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {ROLE_LABELS[role]}
                  <button
                    onClick={() => toggleClientRole(role)}
                    className="ml-1 text-blue-600 hover:text-blue-900"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info message */}
      {!isInternalTeam && (
        <p className="text-sm text-gray-500">
          Apenas usuários da Equipe Interna (Admin/Consultor) podem ter papéis Cliente adicionais.
        </p>
      )}
    </div>
  );
}
