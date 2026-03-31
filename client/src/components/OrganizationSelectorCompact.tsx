import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Building2, Check, ChevronDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente compacto de seleção de organização para uso no header
 * Design System v6.1
 */
export function OrganizationSelectorCompact() {
  const { 
    selectedOrganization, 
    setSelectedOrganization, 
    clearSelectedOrganization, 
    isOrganizationRequired, 
    isAutoSelecting 
  } = useOrganization();
  const [open, setOpen] = useState(false);

  // Buscar lista de organizações
  const { data: organizations, isLoading } = trpc.organization.list.useQuery(undefined, {
    enabled: isOrganizationRequired,
  });

  // Não mostrar seletor para clientes
  if (!isOrganizationRequired) {
    return null;
  }

  const showLoading = isLoading || isAutoSelecting;

  const fullOrgName = selectedOrganization 
    ? (selectedOrganization.tradeName || selectedOrganization.name)
    : null;

  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <Popover open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={showLoading}
                  className={cn(
                    "h-8 px-2 gap-1.5 font-normal text-[var(--text-sm)] border-[var(--border-default)]",
                    "bg-[var(--bg-white)] hover:bg-[var(--bg-subtle)]",
                    "min-w-[100px] max-w-[160px] justify-between"
                  )}
                >
                  {showLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                      <span className="text-[var(--text-muted)] truncate">Carregando...</span>
                    </>
                  ) : selectedOrganization ? (
                    <>
                      <Building2 className="h-4 w-4 text-[var(--brand-accent)] shrink-0" />
                      <span className="truncate text-[var(--text-primary)]">
                        {selectedOrganization.tradeName || selectedOrganization.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                      <span className="text-[var(--text-muted)] truncate">Selecionar...</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            {fullOrgName && (
              <TooltipContent 
                side="bottom" 
                className="bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs px-2 py-1"
              >
                {fullOrgName}
              </TooltipContent>
            )}
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar organização..." />
            <CommandList>
              <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
              <CommandGroup>
                {organizations?.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={`${org.name}__${org.id}`}
                    onSelect={() => {
                      setSelectedOrganization({
                        id: org.id,
                        name: org.name,
                        tradeName: org.tradeName,
                        cnpj: org.cnpj,
                      });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedOrganization?.id === org.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{org.name}</span>
                      {org.tradeName && (
                        <span className="text-xs text-muted-foreground">{org.tradeName}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
          </Popover>
        </Tooltip>
      </TooltipProvider>
      
      {selectedOrganization && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          onClick={clearSelectedOrganization}
          title="Limpar seleção"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
