import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TaskDelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  organizationId: number;
  taskTitle: string;
  onSuccess?: () => void;
}

export function TaskDelegationModal({
  isOpen,
  onClose,
  taskId,
  organizationId,
  taskTitle,
  onSuccess,
}: TaskDelegationModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users, isLoading: loadingUsers } = trpc.actionPlan.getOrganizationUsers.useQuery(
    { organizationId },
    { enabled: isOpen }
  );

  const delegateMutation = trpc.actionPlan.delegateTask.useMutation();

  const handleDelegate = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    try {
      await delegateMutation.mutateAsync({
        actionPlanId: taskId,
        newResponsibleId: parseInt(selectedUserId),
      });

      setSelectedUserId("");
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao delegar tarefa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delegar Tarefa</DialogTitle>
          <DialogDescription>
            Reatribuir a tarefa "{taskTitle}" para outro membro da equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Responsável
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <SelectItem value="loading" disabled>
                    Carregando...
                  </SelectItem>
                ) : users && users.length > 0 ? (
                  users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    Nenhum usuário disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelegate}
              disabled={!selectedUserId || isSubmitting}
              className="btn-gradient-seusdados text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delegar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
