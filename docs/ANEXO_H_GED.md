# Anexo H - Módulo GED (Gestão Eletrônica de Documentos)

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo **GED** (Gestão Eletrônica de Documentos) oferece armazenamento centralizado e organizado de documentos, com controle de acesso, versionamento e integração com todos os outros módulos da plataforma.

### Funcionalidades Principais

- Estrutura hierárquica de pastas
- Upload com drag-and-drop
- Versionamento de documentos
- Controle de acesso por organização
- Busca e filtros avançados
- Preview de documentos
- Miniaturas para imagens e PDFs
- Arrastar e soltar para mover
- Personalização de pastas (ícone e cor)
- Histórico de versões com restauração
- GED Seusdados vs GED Cliente

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `GED.tsx` | Interface principal |
| `GedDocumentPicker.tsx` | Seletor de documentos |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `routers.ts` | Procedures tRPC (ged.*) |
| `gedService.ts` | Lógica de negócio |

---

## 3. Modelo de Dados

### 3.1 Tabela `ged_folders`

```sql
CREATE TABLE ged_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  parent_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(7) DEFAULT '#6366f1',
  is_system TINYINT DEFAULT 0,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_id) REFERENCES ged_folders(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `ged_documents`

```sql
CREATE TABLE ged_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folder_id INT NOT NULL,
  organization_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  file_size INT,
  version INT DEFAULT 1,
  is_latest TINYINT DEFAULT 1,
  parent_document_id INT,
  tags JSON,
  uploaded_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES ged_folders(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_document_id) REFERENCES ged_documents(id),
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);
```

### 3.3 Tabela `ged_permissions`

```sql
CREATE TABLE ged_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folder_id INT,
  document_id INT,
  user_id INT,
  organization_id INT,
  permission_level ENUM('viewer', 'editor', 'admin') DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES ged_folders(id),
  FOREIGN KEY (document_id) REFERENCES ged_documents(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

---

## 4. Estrutura de Pastas

### 4.1 Pastas Padrão por Organização

Ao criar uma organização, são criadas automaticamente:

```
📁 [Nome da Organização]
├── 📁 Políticas
├── 📁 Procedimentos
├── 📁 Contratos
├── 📁 Evidências
├── 📁 Relatórios
└── 📁 MeuDPO
    └── 📁 Subsídios dos Chamados
```

### 4.2 GED Seusdados vs GED Cliente

| Aspecto | GED Seusdados | GED Cliente |
|---------|---------------|-------------|
| Rota | `/ged` | `/ged-cliente` |
| Cor | Roxo | Azul |
| Acesso | Consultores | Clientes |
| Escopo | Todas organizações | Própria organização |
| Badge | "Seusdados" | "Cliente" |

---

## 5. Funcionalidades

### 5.1 Upload de Documentos

- Drag-and-drop
- Múltiplos arquivos
- Barra de progresso
- Validação de tipo/tamanho
- Armazenamento em S3

### 5.2 Versionamento

```typescript
interface DocumentVersion {
  id: number;
  version: number;
  fileUrl: string;
  uploadedBy: string;
  createdAt: Date;
  isLatest: boolean;
}

// Criar nova versão
async function createNewVersion(
  documentId: number,
  fileUrl: string,
  userId: number
): Promise<number> {
  // Marcar versão atual como não-latest
  await markAsNotLatest(documentId);
  
  // Criar nova versão
  const newVersion = await createDocument({
    ...originalDocument,
    version: originalDocument.version + 1,
    fileUrl,
    isLatest: true,
    parentDocumentId: documentId
  });
  
  return newVersion.id;
}
```

### 5.3 Preview de Documentos

| Tipo | Preview |
|------|---------|
| Imagens | Miniatura + modal ampliado |
| PDF | Miniatura da primeira página |
| Documentos | Ícone por tipo |
| Outros | Ícone genérico |

### 5.4 Filtros Avançados

- Por tipo de arquivo
- Por data de upload
- Por tamanho
- Por tags
- Busca textual

---

## 6. Endpoints tRPC

### 6.1 Pastas

```typescript
// Listar pastas
ged.listFolders
  Input: { parentId?: number, organizationId?: number }
  Output: Folder[]

// Criar pasta
ged.createFolder
  Input: {
    parentId?: number,
    organizationId?: number,
    name: string,
    description?: string,
    icon?: string,
    color?: string
  }
  Output: { id: number }

// Renomear pasta
ged.renameFolder
  Input: { folderId: number, name: string }
  Output: { success: boolean }

// Excluir pasta
ged.deleteFolder
  Input: { folderId: number }
  Output: { success: boolean }
```

### 6.2 Documentos

```typescript
// Listar documentos
ged.listDocuments
  Input: {
    folderId: number,
    mimeType?: string,
    minSize?: number,
    maxSize?: number,
    tags?: string[],
    search?: string
  }
  Output: Document[]

// Upload de documento
ged.uploadDocument
  Input: {
    folderId: number,
    organizationId?: number,
    name: string,
    fileUrl: string,
    fileKey: string,
    mimeType: string,
    fileSize: number,
    tags?: string[]
  }
  Output: { id: number }

// Mover documento
ged.moveDocument
  Input: { documentId: number, targetFolderId: number }
  Output: { success: boolean }

// Excluir documento
ged.deleteDocument
  Input: { documentId: number }
  Output: { success: boolean }

// Histórico de versões
ged.getVersionHistory
  Input: { documentId: number }
  Output: DocumentVersion[]

// Restaurar versão
ged.restoreVersion
  Input: { versionId: number }
  Output: { success: boolean }
```

---

## 7. Integração com Outros Módulos

### 7.1 Conformidade PPPD

```typescript
// Anexar evidência
compliance.attachEvidence({
  assessmentId: number,
  questionId: string,
  documentId: number
})
```

### 7.2 Due Diligence

```typescript
// Anexar evidência
dueDiligence.attachEvidence({
  assessmentId: number,
  documentId: number
})
```

### 7.3 Análise de Contratos

```typescript
// Selecionar contrato para análise
contractAnalysis.start({
  documentId: number
})
```

### 7.4 MeuDPO

```typescript
// Anexar em ticket
tickets.uploadAttachment({
  ticketId: number,
  documentId: number
})
```

### 7.5 Mapeamentos

```typescript
// Salvar ROT/POP
mapeamento.saveToGED({
  processoId: number,
  documentType: 'rot' | 'pop'
})
```

---

## 8. Segurança e Permissões

### 8.1 Níveis de Permissão

| Nível | Código | Permissões |
|-------|--------|------------|
| Visualizador | `viewer` | Ver e baixar |
| Editor | `editor` | Ver, baixar, upload, editar |
| Admin | `admin` | Todas as ações |

### 8.2 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| GED Seusdados | ✓ | ✓ | ✗ |
| GED Cliente | ✓ | ✓ | ✓ (própria org) |
| Criar pasta | ✓ | ✓ | ✓ |
| Upload | ✓ | ✓ | ✓ |
| Excluir | ✓ | ✓ | ✓ (próprios) |

---

## 9. Boas Práticas

1. **Organização**: Manter estrutura lógica de pastas
2. **Nomenclatura**: Usar nomes descritivos
3. **Tags**: Categorizar documentos
4. **Versionamento**: Manter histórico de alterações
5. **Limpeza**: Remover documentos obsoletos

---

## 10. Referências Técnicas

- LGPD Art. 37 - Registro de Operações
- LGPD Art. 46 - Medidas de Segurança
- ISO 27001 - Gestão de Documentos
- AWS S3 - Armazenamento de Objetos

---

**Anterior**: [Anexo G - Central de Direitos](./ANEXO_G_CENTRAL_DIREITOS.md)  
**Próximo**: [Anexo I - Simulador CPPD](./ANEXO_I_SIMULADOR.md)
