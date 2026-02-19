---
doc: Squad Structure & Responsibilities
type: reference
usage: "Complete reference for media-buyer-squad structure and agent responsibilities"
---

# Media Buyer Squad - Estrutura e Responsabilidades

## 📋 Visão Geral

O **media-buyer-squad** é um sistema multi-agente para gestão de tráfego pago (Meta Ads, Google Ads) com **47 frameworks** extraídos de 5 experts (Jeremy Haynes, Brian Moncada, Alex Hormozi, Brandon Carter, Jordan Stupar).

---

## 🎯 Agentes e Responsabilidades

### 1. 🎖️ Ad-Midas (Endereço) - LEAD / COMMANDER

**Arquétipo**: The Commander  
**Função**: Líder do squad, estrategista-chefe

#### Responsabilidades

- Estrutura de campanha, seleção de funil, decisões de escala, coordenação do squad
- Consultas gerais sobre Marketing/Ads, educação de tráfego pago

#### Skills

- `campaign-structure` - Estrutura de campanha
- `funnel-selection` - Seleção de funil
- `scale-readiness-check` - Verificação de prontidão para escala
- `campaign-monitor` - Monitoramento de campanha

#### Autoridade

- Aprovação final de múltiplas de budget >10%

**Quando chamar**: CPA alto, decisão pause/escalar, realizar budget.

---

### 2. 📊 Performance-Analyst (superformance-analyst) - ANALISTA DE PERFORMANCE

**Arquétipo**: The Analyzer  
**Função**: Especialista em métricas e otimização

#### Responsabilidades

- Diagnóstico de CPA/ROAS/CTR, regras kill/scale, alocação de budget
- Análise de métricas, otimização

#### Skills

- `metric-diagnosis` - Diagnóstico de métricas
- `kill-scale-rules` - Regras kill/scale
- `budget-allocation` - Alocação de budget
- `audience-expansion` - Expansão de audiência

#### Reporta a

- @ad-midas

**Quando chamar**: CPA alto, decisão pause/escalar, realocar budget.

---

### 3. 🎨 Creative-Analyst (creative-analyst) - ANALISTA DE CRIATIVOS

**Arquétipo**: The Creator  
**Função**: Especialista em hooks, copy e DSL

#### Responsabilidades

- Geração de hooks, briefs criativos, copywriting, ângulos, detecção de fadiga criativa

#### Skills

- `hook-generation` - Geração de hooks
- `creative-briefs` - Briefs criativos
- `copy-generation` - Geração de copy
- `angle-generation` - Geração de ângulos
- `fatigue-detection` - Detecção de fadiga criativa

#### Reporta a

- @ad-midas

**Quando chamar**: Criar hooks, brief criativos, copy de anúncio, CTR caindo.

---

### 4. 🔍 Pixel-Specialist (pixel-specialist) - ESPECIALISTA EM TRACKING

**Arquétipo**: The Tracker  
**Função**: Especialista em pixel e atribuição

#### Responsabilidades

- Auditoria de pixel, configuração CAPI, configuração de eventos, otimização de match rate

#### Skills

- `tracking-audit` - Auditoria de tracking
- `attribution-analysis` - Análise de atribuição

#### Reporta a

- @ad-midas

**Quando chamar**: Conversões ↓, auditar pixel, configurar CAPI, eventos não disparam.

---

### 5. 💰 Media-Buyer (media-buyer) - GESTOR ESTRATÉGICO

**Arquétipo**: Traffic Architect  
**Função**: Estrategista senior licensiado

#### Responsabilidades

- Consultas gerais sobre Marketing/Ads, educação de tráfego pago

#### Skills

- Consultas gerais, aprendizado, quando não precisa de squad completo

**Quando chamar**: Consultas gerais, aprendizado, quando não precisa de squad completo.

---

## 🔄 Fluxo de Colaboração

### Hierarquia (Lead)

```
@ad-midas (LEAD)
    ├── @performance-analyst (Data)
    ├── @creative-analyst (Creative)
    ├── @pixel-specialist (Tracking)
    └── @media-buyer (Execution)
```

### Delegações

- **hook-data → LAL**: @creative-analyst (Data) → @pixel-specialist (Pixel)
- **conversions no → 0**: @pixel-specialist (Tracking) → @performance-analyst (Funnel)
- **CPA > Target**: @performance-analyst (Metrics) → @creative-analyst (Creative) + @ad-midas (Budget)

---

## 📊 Workflow Padrão de Campanha

### Passo 1: Definir estratégia e estrutura

**Agente**: @ad-midas  
**Ação**: Define estratégia e estrutura

### Passo 2: Configurar tracking e atribuição

**Agente**: @pixel-specialist  
**Ação**: Tracking audit

### Passo 3: Criar briefs e gerar hooks

**Agente**: @creative-analyst  
**Ação**: Hook-generation

### Passo 4: Launch campanha

**Agente**: @ad-midas  
**Ação**: Launch

### Passo 5: Monitorar métricas, aplicar kill/scale

**Agente**: @performance-analyst  
**Ação**: Kill-scale-rules

### Passo 6: Escalar, otimizar ou pausar

**Agente**: @ad-midas  
**Ação**: Scale-readiness-check

---

## 🎯 Resumo de Skills (18 total)

### Categoria: Diagnóstico (5 skills)

- `metric-diagnosis` - Diagnóstico de métricas
- `tracking-audit` - Auditoria de tracking
- `funnel-analysis` - Análise de funil
- `attribution-analysis` - Análise de atribuição
- `creative-fatigue-detector` - Detector de fadiga criativa

### Categoria: Diagnostic (5 skills)

- `hook-generation` - Geração de hooks
- `copy-generation` - Geração de copy
- `creative-brief` - Brief criativo
- `angle-generation` - Geração de ângulos
- `dsl-creation` - Criação de DSL

### Categoria: Optimization (5 skills)

- `kill-scale-rules` - Regras kill/scale
- `budget-allocation` - Alocação de budget
- `audience-expansion` - Expansão de audiência
- `campaign-monitor` - Monitoramento de campanha

### Categoria: Automation (3 skills)

- `campaign-monitor` - Monitoramento de campanha

---

## 📁 Estrutura de Arquivos

```
media-buyer-squad/
├── agents/                    # 5 agentes
│   ├── ad-midas.md
│   ├── media-buyer.md
│   ├── performance-analyst.md
│   ├── creative-analyst.md
│   └── pixel-specialist.md
│
├── tasks/                     # 5 tarefas de alta prioridade
│   ├── ad-midas-launch-campaign.md
│   ├── ad-midas-define-strategy.md
│   ├── pixel-specialist-setup-tracking.md
│   ├── creative-analyst-generate-hooks.md
│   └── performance-analyst-apply-kill-scale.md
│
├── scripts/                   # 18 scripts de automação
│   ├── diagnose-metrics.js
│   ├── audit-tracking.js
│   ├── detect-fatigue.js
│   ├── analyze-funnel.js
│   ├── analyze-attribution.js
│   ├── generate-hooks.js
│   ├── generate-copy.js
│   ├── create-brief.js
│   ├── generate-angles.js
│   ├── create-dsl.js
│   ├── evaluate-kill-scale.js
│   ├── allocate-budget.js
│   ├── expand-audience.js
│   ├── calculate-economics.js
│   ├── select-funnel.js
│   ├── check-scale-readiness.js
│   ├── structure-campaign.js
│   └── monitor-campaigns.js
│
├── workflows/                 # 4 workflows completos
│   ├── campaign-launch-workflow.md
│   ├── creative-refresh-workflow.md
│   ├── scale-optimization-workflow.md
│   └── troubleshooting-workflow.md
│
├── templates/                 # 4 templates profissionais
│   ├── creative-brief-template.md
│   ├── ad-copy-template.md
│   ├── testing-matrix-template.md
│   └── scale-plan-template.md
│
├── checklists/               # 3 checklists essenciais
│   ├── pre-launch-checklist.md
│   ├── creative-review-checklist.md
│   └── scale-readiness-checklist.md
│
├── squad.yaml                # Manifest do squad
├── README.md                 # Documentação principal
├── IMPLEMENTATION_GUIDE.md   # Guia de implementação
└── STATUS.md                 # Status e progresso
```

---

## 🎓 Quando Usar Cada Agente

### @ad-midas

- ✅ Definir estratégia de campanha
- ✅ Selecionar funil ideal
- ✅ Estruturar campanha completa
- ✅ Decisões de scale (> 20% budget)
- ✅ Coordenação geral do squad

### @performance-analyst

- ✅ CPA alto ou ROAS baixo
- ✅ Decisões de kill/scale
- ✅ Realocação de budget
- ✅ Análise de métricas
- ✅ Expansão de audiências

### @creative-analyst

- ✅ Criar hooks (6-9 variações)
- ✅ Gerar copy de anúncios
- ✅ Criar briefs criativos
- ✅ CTR caindo
- ✅ Detecção de fadiga

### @pixel-specialist

- ✅ Conversões não aparecem
- ✅ Auditar tracking
- ✅ Configurar CAPI
- ✅ Eventos não disparam
- ✅ EMQ baixo

### @media-buyer

- ✅ Consultas gerais
- ✅ Aprendizado
- ✅ Quando não precisa de squad completo
- ✅ Execução de campanhas

---

## 🔗 Integrações MCP

### Meta Ads

- `meta-ads` - Gestão de campanhas Meta
- `meta-mcp` - API Marketing Meta
- `meta-pixel-mcp` - Pixel e CAPI

### Configuração

```yaml
# Em squad.yaml
integrations:
  - name: meta-ads
    type: mcp
    config: config/meta-ads.json

  - name: meta-mcp
    type: mcp
    config: config/meta-mcp.json

  - name: meta-pixel-mcp
    type: mcp
    config: config/meta-pixel.json
```

---

## 📊 Frameworks Integrados

### Jeremy Haynes

- DSL Revolution (Constants vs Variables)
- Hook frameworks (5 tipos)
- Kill/Scale rules (20% rule)
- Creative testing methodology

### Brian Moncada

- Andromeda Method
- Metrics diagnosis framework
- Performance benchmarks
- Optimization protocols

### Alex Hormozi

- Unit economics (LTV:CAC)
- Offer creation framework
- Value equation
- Scaling economics

### Brandon Carter

- Scientific testing approach
- Data-driven decisions
- Statistical significance
- Testing matrix

### Jordan Stupar

- Creative strategy
- Hook psychology
- Angle development
- Copy frameworks

---

## 🚀 Quick Start

### 1. Lançar Nova Campanha

```bash
@ad-midas
*launch-campaign

# Ou usar workflow:
# Ver: workflows/campaign-launch-workflow.md
```

### 2. Gerar Hooks

```bash
@creative-analyst
*generate-hooks

# Ou usar script:
node scripts/generate-hooks.js
```

### 3. Analisar Performance

```bash
@performance-analyst
*diagnose-metrics

# Ou usar script:
node scripts/diagnose-metrics.js
```

### 4. Auditar Tracking

```bash
@pixel-specialist
*audit-tracking

# Ou usar script:
node scripts/audit-tracking.js
```

### 5. Decisão Kill/Scale

```bash
@performance-analyst
*apply-kill-scale

# Ou usar script:
node scripts/evaluate-kill-scale.js
```

---

## 📈 Métricas de Sucesso

### Por Agente

**@ad-midas**:

- Campanhas lançadas com sucesso
- Taxa de scale bem-sucedido
- ROI geral do squad

**@performance-analyst**:

- Redução de CPA
- Aumento de ROAS
- Acurácia de kill/scale decisions

**@creative-analyst**:

- Hook rate médio (target: > 15%)
- CTR médio (target: > 1.5%)
- Tempo de criação de creative

**@pixel-specialist**:

- Event Match Quality (target: > 6.0)
- Taxa de conversões rastreadas
- Tempo de resolução de issues

**@media-buyer**:

- Velocidade de execução
- Qualidade de setup
- Compliance com workflows

---

## 🎯 Próximos Passos

1. [ ] Configurar MCP integrations
2. [ ] Testar todos os scripts
3. [ ] Customizar templates
4. [ ] Treinar equipe
5. [ ] Executar primeira campanha
6. [ ] Documentar learnings
7. [ ] Escalar operação

---

## 📚 Recursos Adicionais

- **README.md** - Overview e quick start
- **IMPLEMENTATION_GUIDE.md** - Guia de implementação completo
- **STATUS.md** - Status atual e progresso
- **squad.yaml** - Manifest e configuração

---

**Squad**: media-buyer-squad  
**Version**: 2.0.0  
**Status**: Production Ready  
**Updated**: 2026-02-10
