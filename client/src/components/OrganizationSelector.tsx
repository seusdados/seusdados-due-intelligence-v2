import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/_core/hooks/useAuth';
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
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function OrganizationSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const { selectedOrganization, setSelectedOrganization, clearSelectedOrganization, isOrganizationRequired, isAutoSelecting } = useOrganization();
  const [open, setOpen] = useState(false);

  // Buscar lista de organizações
  const { data: organizations, isLoading } = trpc.organization.list.useQuery(undefined, {
    enabled: isOrganizationRequired,
  });

  // Não mostrar seletor para clientes (eles usam sua própria organização automaticamente)
  if (!isOrganizationRequired) {
    return null;
  }

  // Estado de loading durante seleção automática
  const showLoading = isLoading || isAutoSelecting;

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0",
              selectedOrganization ? "text-primary" : "text-muted-foreground"
            )}
            title={selectedOrganization?.name || "Selecionar organização"}
            disabled={showLoading}
          >
            {showLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start" side="right">
          <Command>
            <CommandInput placeholder="Buscar organização..." />
            <CommandList>
              <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
              <CommandGroup>
                {organizations?.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
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
    );
  }

  return (
    <div className="px-2 py-2 border-b border-sidebar-border">
      <div className="flex items-center gap-2 mb-1">
        {showLoading ? (
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Organização
        </span>
        {isAutoSelecting && (
          <span className="text-xs text-primary animate-pulse">
            Selecionando...
          </span>
        )}
      </div>
      
      {showLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">
              {isAutoSelecting ? 'Selecionando organização automaticamente...' : 'Carregando organizações...'}
            </span>
          </div>
        </div>
      ) : (
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-9 font-normal"
                disabled={showLoading}
              >
                {selectedOrganization ? (
                  <span className="truncate">{selectedOrganization.name}</span>
                ) : (
                  <span className="text-muted-foreground">Selecionar...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar organização..." />
                <CommandList>
                  <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
                  <CommandGroup>
                    {organizations?.map((org) => (
                      <CommandItem
                        key={org.id}
                        value={org.name}
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
          {selectedOrganization && (
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="text-xs truncate max-w-[180px]">
                {selectedOrganization.tradeName || selectedOrganization.name}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearSelectedOrganization}
                title="Limpar seleção"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
