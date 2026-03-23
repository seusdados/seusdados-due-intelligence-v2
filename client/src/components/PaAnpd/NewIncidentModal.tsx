import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface NewIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description: string;
    incidentType: string;
    severity: string;
    discoveryDate: Date;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function NewIncidentModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewIncidentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incidentType: '',
    severity: '',
    discoveryDate: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    if (!formData.incidentType) {
      newErrors.incidentType = 'Tipo de incidente é obrigatório';
    }
    if (!formData.severity) {
      newErrors.severity = 'Severidade é obrigatória';
    }
    if (!formData.discoveryDate) {
      newErrors.discoveryDate = 'Data de descoberta é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmit({
        title: formData.title,
        description: formData.description,
        incidentType: formData.incidentType,
        severity: formData.severity,
        discoveryDate: new Date(formData.discoveryDate),
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        incidentType: '',
        severity: '',
        discoveryDate: new Date().toISOString().split('T')[0],
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating incident:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Incidente</DialogTitle>
          <DialogDescription>
            Registre um novo incidente de segurança para acompanhamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Descrição breve do incidente"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais sobre o incidente"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Incident Type */}
          <div className="space-y-2">
            <Label htmlFor="incidentType">Tipo de Incidente *</Label>
            <Select value={formData.incidentType} onValueChange={(value) => setFormData({ ...formData, incidentType: value })}>
              <SelectTrigger className={errors.incidentType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vazamento_dados">Vazamento de Dados</SelectItem>
                <SelectItem value="acesso_nao_autorizado">Acesso Não Autorizado</SelectItem>
                <SelectItem value="malware">Malware</SelectItem>
                <SelectItem value="phishing">Phishing</SelectItem>
                <SelectItem value="ransomware">Ransomware</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.incidentType && (
              <p className="text-sm text-red-500">{errors.incidentType}</p>
            )}
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severidade *</Label>
            <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
              <SelectTrigger className={errors.severity ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione a severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            {errors.severity && <p className="text-sm text-red-500">{errors.severity}</p>}
          </div>

          {/* Discovery Date */}
          <div className="space-y-2">
            <Label htmlFor="discoveryDate">Data de Descoberta *</Label>
            <Input
              id="discoveryDate"
              type="date"
              value={formData.discoveryDate}
              onChange={(e) => setFormData({ ...formData, discoveryDate: e.target.value })}
              className={errors.discoveryDate ? 'border-red-500' : ''}
            />
            {errors.discoveryDate && (
              <p className="text-sm text-red-500">{errors.discoveryDate}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar Incidente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
