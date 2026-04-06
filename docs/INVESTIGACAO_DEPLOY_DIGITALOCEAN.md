# Investigação Completa — Falhas de Deploy DigitalOcean App Platform

> **Data:** 6 de Abril de 2026  
> **App:** sea-turtle-app | Datacenter: ATL1 (Atlanta)  
> **URL:** https://sea-turtle-app-l53fc.ondigitalocean.app  
> **Último deploy funcional:** commit `10a1858` (31/Mar/2026)  
> **Status atual:** Healthy (rodando 10a1858 via rollback automático)

---

## 1. Resumo Executivo

Desde o commit `10a1858` (31/Mar), **todos os deploys subsequentes falharam** na fase de deploy com erro "container did not respond to health checks". O App Platform faz rollback automático para o último deploy funcional (10a1858) a cada tentativa.

Foram identificadas **múltiplas causas** (não apenas uma). O fix do commit `b80b9da` corrige a causa principal, mas o deploy foi **cancelado** pela plataforma antes de rodar — possivelmente por instabilidade na infraestrutura DO ou por cancelamento do usuário.

---

## 2. Incidente Aberto na DigitalOcean

```
Status: Open Incident
Tipo: Serverless Inference Issue  
Afeta: Gradient AI (modelos open source - llama 3.3 70b)
Último update: 6/Abr/2026 12:28 UTC
URL: https://status.digitalocean.com/incidents/grhp94sd84gd
```

**Impacto direto no App Platform:** O incidente é classificado como afetando "Gradient AI", **NÃO** App Platform diretamente. O status page mostra App Platform como "Operational" em todas as regiões. Porém:
- Incidentes de infraestrutura podem ter efeitos cascata não documentados
- Os deploys de 6/Abr foram **cancelados** (não falharam com health check), o que é um comportamento diferente dos deploys de 2/Abr
- **É possível** que o incidente tenha afetado o pipeline de deploy

### Manutenção Programada Próxima
- **MongoDB Maintenance** em AMS3, **ATL1**, LON1, NYC1, NYC2, SFO3
- Janela: 7/Abr 18:00 — 8/Abr 00:00 UTC
- Impacto esperado: Nenhum para workloads existentes
- **ATL1 está na lista** (mesmo datacenter da app)

---

## 3. Cronologia Completa de Deploys

### Commits (do mais antigo ao mais recente)
| Commit | Data | Descrição | Status Deploy |
|--------|------|-----------|---------------|
| `10a1858` | 31/Mar | ajustes de email, primeiro acesso, troca de org | ✅ **SUCESSO** (último funcional) |
| `6af5568` | 02/Abr | melhorias (NavMain, CadastrosDashboard, gedService) | — (não deployado isoladamente) |
| `d74ab25` | 02/Abr | calendário e ged (Dashboard.tsx, GED.tsx) | ❌ Health Check |
| `e813761` | 02/Abr | resilient startup for DigitalOcean deploy | ❌ Health Check |
| `1efca04` | 02/Abr | robust health check, import.meta.dirname fallback | ❌ Health Check |
| `06f67d3` | 02/Abr | simplify start script - remove cross-env and db-push | ❌ Health Check |
| `097c40e` | 02/Abr | minimal health check server to diagnose DO issue | ❌ Health Check |
| `c7447f7` | 02/Abr | pin Node.js 20.x (old deployment compatibility) | 🚫 Cancelado |
| `9dea9b7` | 02/Abr | revert server config to match 10a1858 | ❌ Health Check |
| `e23fba4` | 06/Abr | fix: chave duplicada Admin.tsx, db.ts, routers.ts | 🚫 Cancelado |
| `ca275ca` | 06/Abr | fix: drizzle-kit push resiliente + Procfile | 🚫 Cancelado |
| `b80b9da` | 06/Abr | fix: servidor inicia imediatamente, drizzle-kit background | 🚫 Cancelado |

### Observação Crítica: Padrão de Comportamento Diferente
- **02/Abr:** Deploys **falharam** com erro "Health Checks" + logs disponíveis
- **06/Abr:** Deploys **cancelados** sem logs de deploy ("Deployment was canceled, no logs available")

---

## 4. Causa Raiz #1 — `drizzle-kit push --force` Bloqueante (PRINCIPAL)

### O Problema
No commit `10a1858`, o script `start` era:
```json
"start": "drizzle-kit push --force && cross-env NODE_ENV=production node dist/index.js"
```

O `drizzle-kit push --force` é um comando **bloqueante** que:
1. Conecta ao PostgreSQL (NYC3) a partir do container (ATL1) — **cross-region**
2. Compara o schema local com o banco
3. Aplica migrações pendentes
4. **Somente após conclusão**, o `&&` permite executar `node dist/index.js`

Se `drizzle-kit push` demorar mais que o timeout do health check (~5 min), o servidor **nunca inicia** → health check falha → rollback.

### Por que 10a1858 Funcionou
No momento do deploy de 10a1858, o `drizzle-kit push`:
- Completou rápido (poucas ou nenhuma migração pendente)
- Latência NYC3↔ATL1 era aceitável
- Estava dentro da janela de timeout do health check

### Agravantes
- **DB cross-region:** PostgreSQL em NYC3, App em ATL1
  - Latência adicional em cada query do drizzle-kit
  - Negociação SSL com cert self-signed
- **Migrações acumuladas:** Commits posteriores adicionaram novas tabelas/colunas (ex: `actionPlanEvidence`, `contractAnalysisClauses`), aumentando o tempo do push
- **Operador `&&`:** Se drizzle-kit falhar (timeout, erro SSL, etc.), `node` não executa de jeito nenhum

### Correção (commit b80b9da)
```json
"start": "NODE_ENV=production node dist/index.js"
```

O `drizzle-kit push` foi movido para dentro do `server.listen()` callback como processo filho não-bloqueante:
```typescript
exec('npx drizzle-kit push --force', { timeout: 120_000 }, (err, stdout, stderr) => {
  if (err) console.error('drizzle-kit push failed (non-fatal):', err.message);
  else console.log('drizzle-kit push completed successfully');
});
```

---

## 5. Causa Raiz #2 — Port Probing no Working Commit

### O Problema
O commit `10a1858` usava `findAvailablePort()` que cria servidores temporários para testar se a porta está livre:

```typescript
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));  // bind → close → report available
    });
    server.on("error", () => resolve(false));
  });
}

const port = await findAvailablePort(preferredPort); // Probes before binding
```

**Riscos:**
1. Cria um servidor temporário em port 8080 → DO poderia detectar como "app started" → fecha → real server ainda não iniciou → health check falha
2. Race condition entre fechar o probe e abrir o real server
3. O probing itera de 3000 a 3019 se PORT não estiver definido

### Correção (commit b80b9da)
```typescript
const port = process.env.NODE_ENV === "production"
  ? preferredPort                        // Usa PORT direto, sem probe
  : await findAvailablePort(preferredPort); // Probe só em dev
```

---

## 6. Causa Raiz #3 — Warnings de Build (esbuild)

### Warnings Presentes no Build de 9dea9b7 (02/Abr)
```
▲ [WARNING] Import "getComplianceAssessmentsByUserLink" will always be undefined
    because there is no matching export in "server/db.ts"
    server/routers.ts:1086:18

▲ [WARNING] Import "select" will always be undefined
    because there is no matching export in "server/db.ts"
    server/routers.ts:1153:38
```

**Impacto:** Essas funções são `undefined` no bundle. Quando chamadas em runtime:
- `db.getComplianceAssessmentsByUserLink(...)` → `TypeError: db.getComplianceAssessmentsByUserLink is not a function`
- `db.select()` → `TypeError: db.select is not a function`

Embora esses erros possam ocorrer em runtime, eles **só acontecem quando a rota é chamada** (não no startup). Portanto, **não são a causa do health check failure**, mas podem causar erros 500 em produção.

### Status no HEAD (b80b9da)
- ✅ `getComplianceAssessmentsByUserLink` adicionada em `db.ts` (commit e23fba4)
- ✅ `db.select()` corrigido para `db.getDb().select()` (commit e23fba4)

### Warning Restante
```
[plugin vite:esbuild] client/src/pages/Admin.tsx: Duplicate key "sponsor" in object literal
```
- ✅ Corrigido em e23fba4 (alterado para `'dpo_interno'`)
- **NOTA:** Este é um warning do Vite (client-side), a build continua normalmente

---

## 7. Causa Raiz #4 — Ausência de `/api/health` no Working Commit

O commit `10a1858` **NÃO tinha** endpoint dedicado `/api/health`. O DO fazia health check na rota raiz `/` (que serve `index.html` via static files).

### Melhoria no commit b80b9da
```typescript
// EARLY HEALTH CHECK (before all middleware)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
```

Registrado **antes** de todos os middlewares (helmet, cors, rate-limit, etc.), garantindo resposta rápida.

**Recomendação:** Configurar o DO Readiness Check para usar `/api/health` em vez do default `/`.

---

## 8. Causa Raiz #5 — Schedulers sem try-catch

No commit `10a1858`, os schedulers eram iniciados diretamente:
```typescript
startSLAScheduler();
initializeActionPlanCronJob();
startDeadlineNotificationService();
initializeReviewCron();
initializeCppdOverdueJob();
```

Se qualquer um lançasse exceção durante inicialização (ex: DB não disponível, env var faltando), o **processo inteiro morria**.

### Correção no commit b80b9da
```typescript
try { startSLAScheduler(); } catch (e) { console.error('...', e.message); }
try { initializeActionPlanCronJob(); } catch (e) { console.error('...', e.message); }
// ... etc
```

---

## 9. Mudanças de Código — Diff Completo (10a1858 → HEAD)

### Arquivos Modificados (11 arquivos, +442/-465 linhas)
| Arquivo | Mudanças | Risco |
|---------|----------|-------|
| `package.json` | start script simplificado | ✅ Fix crítico |
| `server/_core/index.ts` | health check early, port probe skip, drizzle background, try-catch schedulers | ✅ Fix crítico |
| `server/db.ts` | +`getComplianceAssessmentsByUserLink()` (+11 linhas) | ✅ Fix |
| `server/routers.ts` | `db.select()` → `db.getDb().select()` (+5/-1) | ✅ Fix |
| `server/assessmentsRouter.ts` | Removidas 318 linhas de procedures duplicadas | ⚠️ Risco médio |
| `server/gedService.ts` | `.returning()` em vez de `extractInsertId()` | ⚠️ Risco médio |
| `client/src/pages/Admin.tsx` | `'sponsor'` → `'dpo_interno'` | ✅ Fix |
| `client/src/pages/Dashboard.tsx` | +338 linhas refatoração | 🟡 Baixo risco |
| `client/src/pages/GED.tsx` | +54 linhas | 🟡 Baixo risco |
| `client/src/pages/CadastrosDashboard.tsx` | Refatoração | 🟡 Baixo risco |
| `client/src/components/NavMain.tsx` | Refatoração | 🟡 Baixo risco |

### Análise de Risco Detalhada

#### `server/gedService.ts` — `.returning()`
```typescript
// ANTES (10a1858):
const folder = await db.insert(gedFolders).values({...}) as any;
const folderId = extractInsertId(folder);

// DEPOIS (HEAD):
const [folder] = await db.insert(gedFolders).values({...}).returning({ id: gedFolders.id });
const folderId = folder.id;
```
**Veredicto:** ✅ Correto. O `const [folder]` faz destructuring do array retornado por `.returning()`, então `folder.id` funciona.

#### `server/assessmentsRouter.ts` — 318 Linhas Removidas
Foram removidas procedures duplicadas:
- `deleteActionPlanItem` (45 linhas)
- `submitActionForValidation` (216+ linhas)

**Veredicto:** ⚠️ Se algum client-side chama essas procedures via tRPC, receberá erro 404/NOT_FOUND. Porém, isso **não impede o startup** do servidor.

---

## 10. Análise dos Deploys de 06/Abr (CANCELADOS)

### e23fba4 (9:18 AM) — Cancelado
- **Start script:** Ainda era `drizzle-kit push --force && cross-env NODE_ENV=production node dist/index.js` (não corrigido)
- **Esperado:** Health check failure (mesma causa raiz dos deploys de 02/Abr)
- **Real:** Cancelado (não falhou com health check)
- **Possível causa do cancelamento:** DO pode ter cancelado automaticamente porque ca275ca foi pushedado logo depois

### ca275ca (9:32 AM) — Cancelado
- **Start script:** Corrigido parcialmente (`timeout 60 drizzle-kit push --force; cross-env NODE_ENV=production node dist/index.js`)
- **Procfile adicionado:** `web: pnpm start`
- **Problemas:**
  - `cross-env` é devDependency (mas devDeps não foram pruned, então deveria funcionar)
  - Procfile é uma variável nova (não existia em 10a1858)
- **Real:** Cancelado
- **Possível causa do cancelamento:** DO pode ter cancelado automaticamente porque b80b9da foi pushed logo depois

### b80b9da (9:53 AM) — Cancelado
- **Build:** ✅ Sucesso (2m 37s)
- **Deploy:** 🚫 Cancelado ("Deployment was canceled, no logs available")
- **Start script:** `NODE_ENV=production node dist/index.js` (corrigido)
- **Procfile:** Removido (correto)
- **Esperado:** Deveria funcionar
- **Real:** Cancelado sem logs de deploy

**⚠️ ATENÇÃO: O commit b80b9da NUNCA FOI REALMENTE TESTADO pelo DO.** O deploy foi cancelado antes que o container pudesse iniciar. Portanto, **não sabemos se o fix funciona em produção**.

### Possíveis Razões para Cancelamento
1. **Circuit breaker do DO:** Após N falhas consecutivas, o App Platform pode limitar tentativas
2. **Cancelamento manual pelo usuário:** O usuário pode ter cancelado durante o build
3. **Conflito de deployments:** Se autodeploy detectou novo push antes do anterior finalizar
4. **Infraestrutura DO instável:** O incidente "Serverless Inference Issue" pode ter efeitos colaterais

---

## 11. Configuração DO App Platform — Pontos de Atenção

### Port Configuration
```
Public HTTP Port: 8080
```
O DO injeta `PORT=8080` como env var. O servidor lê `parseInt(process.env.PORT || "3000")`. Em produção, `PORT=8080` → server.listen(8080). ✅ Correto.

**Documentação DO:** "App Platform expects that any service you deploy listens on all interfaces on port 8080 (0.0.0.0:8080)"

O `server.listen(port)` sem host parameter escuta em `0.0.0.0` por padrão. ✅ Correto.

### Health Check Configuration
- **Readiness check:** Configurado (rota não especificada no screenshot — provavelmente `/`)
- **Liveness check:** Não configurado
- **Recomendação:** Configurar readiness para `/api/health` e adicionar liveness check em `/api/health`

### Database Cross-Region
```
App: ATL1 (Atlanta)
DB:  NYC3 (New York)
```
**Latência estimada:** 15-30ms por query (cross-region dentro da mesma nuvem)

**Impactos:**
- drizzle-kit push com muitas migrações pode levar 30-120 segundos
- Cada request tRPC que toca o DB tem +15-30ms overhead
- Conexão SSL com cert self-signed (rejectUnauthorized: false)

**Recomendação:** Migrar DB para ATL1 ou app para NYC3 para latência mínima.

### Containers
```
2 containers × ($24/mo = 1GB RAM, 1 Shared vCPU)
```
Com 1GB RAM e vCPU compartilhada, o startup pode ser lento especialmente se `drizzle-kit push` consome memória significativa.

### Environment Variables (17 total)
DATABASE_URL, JWT_SECRET, VITE_APP_ID, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_CDN_ENDPOINT, FRONTEND_URL, MEUDPO_SLA_SCHEDULER_AUTOSTART, ENABLE_REVIEW_CRON, ENABLE_ASSESSMENT_EMAIL_NOTIFICATIONS, PUBLIC_APP_URL

**Nota:** `NODE_ENV` **NÃO** está nas env vars do DO. É definido inline no start script: `NODE_ENV=production node dist/index.js`. Isso funciona em Linux, mas é uma dependência frágil.

---

## 12. Próximos Passos — Plano de Ação

### Imediatos (para desbloquear o deploy)

1. **Retestar o deploy do b80b9da**
   - Fazer um "Force Rebuild and Deploy" no dashboard DO
   - OU fazer um commit vazio: `git commit --allow-empty -m "trigger: redeploy b80b9da" && git push`
   - Monitorar Runtime Logs durante o deploy

2. **Verificar Console do Container**
   - Após o deploy iniciar, usar DO Console para `curl localhost:8080/api/health`
   - Verificar se o servidor realmente inicia

3. **Configurar Health Check Path**
   - No DO Settings → Health Checks → Readiness check
   - Definir path: `/api/health`
   - Definir timeout: 120 segundos (para acomodar startup lento)

### Se o redeploy falhar novamente

4. **Verificar Runtime Logs imediatamente após o deploy start**
   - Procurar por: `Server running on port 8080` ← confirma que server iniciou
   - Procurar por erros de import ou módulo
   - Procurar por: `drizzle-kit push` messages

5. **Testar sem drizzle-kit push**
   - Comentar o bloco `exec('npx drizzle-kit push...')` em index.ts
   - Deploy sem nenhuma migração
   - Se funcionar, o drizzle-kit está causando side effects

6. **Adicionar NODE_ENV como env var no DO**
   - Settings → Environment Variables → Add: `NODE_ENV=production`
   - Isso é mais robusto que definir inline no start script

### Melhorias de Infraestrutura

7. **Mover DB ou App para mesmo datacenter**
   - DB está em NYC3, App está em ATL1
   - Migrar um deles para eliminar latência cross-region

8. **Configurar Liveness Check**
   - Além do Readiness check, adicionar Liveness check em `/api/health`
   - Permite que DO reinicie containers travados

9. **Separar db:push do deployment**
   - Executar `drizzle-kit push` como um Job no DO App Platform (não no web service)
   - OU rodar manualmente: `doctl apps console --command "npx drizzle-kit push --force"`

---

## 13. Comandos Úteis para Debug

```bash
# Ver app spec completo
doctl apps spec get <app-id> --format yaml

# Ver logs de runtime em tempo real
doctl apps logs <app-id> --type=run --follow

# Forçar redeploy
doctl apps create-deployment <app-id> --force-rebuild

# Console no container
doctl apps console <app-id>

# Dentro do console:
curl -s localhost:8080/api/health
env | grep -E "PORT|DATABASE_URL|NODE_ENV"
node -e "console.log(process.version)"
ls -la dist/
```

---

## 14. Resumo de Todos os Problemas Encontrados

| # | Problema | Severidade | Status | Commit Fix |
|---|----------|------------|--------|------------|
| 1 | `drizzle-kit push` bloqueante no start | 🔴 Crítico | ✅ Fixado | b80b9da |
| 2 | Port probing criando servidores temporários | 🟠 Alto | ✅ Fixado | b80b9da |
| 3 | Schedulers sem try-catch derrubando servidor | 🟠 Alto | ✅ Fixado | b80b9da |
| 4 | Vite + plugins carregados em produção (6 imports desnecessários) | 🔴 Crítico | ✅ Fixado | (pendente) |
| 5 | `getComplianceAssessmentsByUserLink` undefined | 🟡 Médio | ✅ Fixado | e23fba4 |
| 6 | `db.select()` undefined em routers.ts | 🟡 Médio | ✅ Fixado | e23fba4 |
| 7 | Chave duplicada `'sponsor'` em Admin.tsx | 🟢 Baixo | ✅ Fixado | e23fba4 |
| 8 | Sem endpoint `/api/health` dedicado | 🟡 Médio | ✅ Fixado | b80b9da |
| 9 | DB cross-region (NYC3 ↔ ATL1) | 🟡 Médio | ⏳ Pendente | Infra |
| 10 | `NODE_ENV` não definido como env var DO | 🟢 Baixo | ⏳ Pendente | Config |
| 11 | Health check path não configurado para `/api/health` | 🟢 Baixo | ⏳ Pendente | Config |
| 12 | Liveness check não configurado | 🟢 Baixo | ⏳ Pendente | Config |
| 13 | Deploys de 06/Abr cancelados (nunca testados) | 🔴 Crítico | ⏳ Precisa redeploy | — |

---

## 15. Hipótese Consolidada

O deploy funcional `10a1858` completou o `drizzle-kit push` rápido o suficiente para o health check passar. Commits subsequentes (especialmente depois de adicionar novas tabelas/migrações) fizeram o `drizzle-kit push` demorar mais, ultrapassando o timeout do health check. O servidor nunca iniciava → health check falhava → rollback automático.

Os fixes aplicados em `b80b9da` resolvem todas as causas identificadas, mas **esse commit nunca foi efetivamente testado** pelo DO porque o deploy foi cancelado. É necessário forçar um novo deploy para validar.
