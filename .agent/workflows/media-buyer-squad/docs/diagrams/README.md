# Media Buyer Squad - Diagramas Visuais

Este diretório contém os diagramas visuais que explicam a estrutura, fluxo de trabalho e responsabilidades do **media-buyer-squad**.

## 📊 Diagramas Disponíveis

### 1. Estrutura Geral do Squad

**Arquivo**: `01-squad-structure.png`

Mostra a estrutura hierárquica do squad:

```
Media Buyer Squad - Diagrama Visual
Sistema multi-agente para gestão de tráfego pago (Meta Ads, Google Ads)
47 Frameworks e 5 Experts + 18 Skills

┌─────────────────────┐
│   🎖️ MIDAS          │
│   (Commander)       │
│                     │
│ • Estratégia        │
│ • Estrutura         │
│ • Escala            │
│ • Coordenação       │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
┌───▼────┐   ┌───▼────┐  ┌──▼─────┐  ┌▼────────┐
│ 📊 DASH│   │ 🎨 NOVA│  │ 🔍 TRACK│  │ 💰 BUYER│
│(Analyst)│   │(Creator)│  │(Tracker)│  │(Executor)│
│         │   │         │  │         │  │         │
│• Metrics│   │• Hooks  │  │• Pixel  │  │• Exec   │
│• Kill/  │   │• Copy   │  │• CAPI   │  │• Consult│
│  Scale  │   │• Briefs │  │• Events │  │         │
│• Budget │   │• DSL    │  │• Attrib │  │         │
│• Audience│  │         │  │         │  │         │
└─────────┘   └─────────┘  └─────────┘  └─────────┘
```

**Uso**: Entender a hierarquia e papéis de cada agente

---

### 2. Fluxo de Triggers

**Arquivo**: `02-trigger-flow.png`

Mostra quando acionar cada agente:

```
FLUXO DE TRIGGERS

                    ┌──────┐
                    │ MIDAS│
                    └───┬──┘
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼────┐      ┌───▼────┐      ┌──▼─────┐
    │CPA alto│      │Hook <15%│      │Conv = 0│
    │ROAS ↓  │      │CTR ↓    │      │Pixel ⚠️│
    └───┬────┘      └───┬────┘      └──┬─────┘
        │               │               │
    ┌───▼────┐      ┌───▼────┐      ┌──▼─────┐
    │  DASH  │      │  NOVA  │      │ TRACK  │
    │   🎯   │      │   🎨   │      │   🔍   │
    └────────┘      └────────┘      └────────┘

[Se decisão de escala?]
        │
    ┌───▼────┐
    │ MIDAS  │
    │   🎖️   │
    └────────┘
```

**Uso**: Saber qual agente chamar em cada situação

---

### 3. Workflow de Campanha + Skills

**Arquivo**: `03-workflow-skills.png`

Mostra o workflow completo e skills por agente:

```
WORKFLOW DE CAMPANHA

┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐
│ 1 │ → │ 2 │ → │ 3 │ → │ 4 │ → │ 5 │ → │ 6 │
└─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘
  │       │       │       │       │       │
┌─▼────┐┌─▼────┐┌─▼───┐┌─▼────┐┌─▼───┐┌─▼────┐
│MIDAS ││TRACK ││NOVA ││MIDAS ││DASH ││MIDAS │
│ 🎖️  ││ 🔍  ││ 🎨 ││ 🎖️  ││ 📊 ││ 🎖️  │
└──────┘└──────┘└─────┘└──────┘└─────┘└──────┘
Estratégia Tracking  Hooks   Launch  Métricas Escala
& Estrut  & CAPI   & Copy  Campanha         Pausa

SKILLS POR AGENTE

┌─────────────────────────────────────────────────────┐
│ 🎖️ MIDAS (Strategic)                                │
├─────────────────────────────────────────────────────┤
│ ├─ campaign-structure    Estrutura de campanha      │
│ ├─ funnel-selection      Seleção tipo de funil      │
│ ├─ scale-readiness-check Auditoria prontidão escala │
│ └─ campaign-monitor      Monitorar campanha         │
├─────────────────────────────────────────────────────┤
│ 📊 DASH (Diagnostic + Optimization)                 │
├─────────────────────────────────────────────────────┤
│ ├─ metric-diagnosis      Diagnóstico CPA, CTR, ROAS │
│ ├─ kill-scale-rules      Regras kill/scale          │
│ ├─ budget-allocation     Distribuição de budget     │
│ └─ audience-expansion    Estratégias expansão público│
├─────────────────────────────────────────────────────┤
│ 🎨 NOVA (Generative)                                │
├─────────────────────────────────────────────────────┤
│ ├─ hook-generator        Variações de hooks DSL Rev │
│ ├─ copy-generator        Frameworks PAS, AIDA, BAB  │
│ ├─ creative-brief        Briefs criativos           │
│ ├─ angle-generator       Ângulos criativos          │
│ └─ dsl-structure         Estrutura Deck Sales Letter│
│ └─ creative-fatigue      Detecção saturação criativo│
├─────────────────────────────────────────────────────┤
│ 🔍 TRACK (Specialist)                               │
├─────────────────────────────────────────────────────┤
│ ├─ tracking-audit        Auditoria pixel + CAPI     │
│ ├─ attribution-analysis  Atribuição cross-platform  │
│ └─ funnel-analysis       Análise funil conversão    │
└─────────────────────────────────────────────────────┘
```

**Uso**: Entender o processo completo e quais skills usar

---

### 4. Expert Sources + Resumo Visual

**Arquivo**: `04-experts-summary.png`

Mostra os frameworks de experts integrados:

```
EXPERT SOURCES

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Jeremy Haynes    │  │ Brian Moncada    │  │ Alex Hormozi     │
│ 7 Frameworks     │  │ 3 Frameworks     │  │ 4 Frameworks     │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • DSL            │  │ • Andromeda      │  │ • Unit Econ      │
│ • Kill/Scale     │  │ • Thresholds     │  │ • LTV/CAC        │
│ • KiB vs ADO     │  │ • Saturation     │  │ • Hydra          │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ Brandon Carter   │  │ Jordan Stupar    │
│ 2 Frameworks     │  │ 2 Frameworks     │
├──────────────────┤  ├──────────────────┤
│ • Constants vs   │  │ • Creative       │
│   Variables      │  │   Strategy       │
│ • Testing        │  │                  │
└──────────────────┘  └──────────────────┘

RESUMO VISUAL

┌────────┬────────┬────────┬──────────────────┐
│ Agente │ Escopo │ Papel  │ Foco Principais  │
├────────┼────────┼────────┼──────────────────┤
│ Midas  │   🎯   │Commander│ Estratégia+Escala│
├────────┼────────┼────────┼──────────────────┤
│ Dash   │   📊   │ Analyzer│ Métricas+Kill/Sc │
├────────┼────────┼────────┼──────────────────┤
│ Nova   │   🎨   │ Creator│ Hooks + Copy     │
├────────┼────────┼────────┼──────────────────┤
│ Track  │   🔍   │ Tracker│ Pixel + CAPI     │
└────────┴────────┴────────┴──────────────────┘

Fluxo mais claro existe?
```

**Uso**: Ver os frameworks integrados e resumo rápido

---

## 🎯 Como Usar os Diagramas

### Para Iniciantes

1. Comece com **01-squad-structure.png** - Entenda a hierarquia
2. Veja **02-trigger-flow.png** - Saiba quando chamar cada agente
3. Estude **03-workflow-skills.png** - Aprenda o processo completo

### Para Operação Diária

- Use **02-trigger-flow.png** como referência rápida
- Consulte **03-workflow-skills.png** para ver skills disponíveis
- Veja **04-experts-summary.png** para entender os frameworks

### Para Documentação

- Todos os diagramas estão referenciados em [STRUCTURE.md](../STRUCTURE.md)
- README.md principal também referencia estes diagramas

---

## 📝 Legenda de Ícones

- 🎖️ **MIDAS** - Commander/Lead (ad-midas)
- 📊 **DASH** - Analyzer (performance-analyst)
- 🎨 **NOVA** - Creator (creative-analyst)
- 🔍 **TRACK** - Tracker (pixel-specialist)
- 💰 **BUYER** - Executor (media-buyer)

---

## 🔄 Atualização dos Diagramas

Estes diagramas foram criados em: **2026-02-10**

Se você atualizar a estrutura do squad:

1. Atualize os diagramas visuais
2. Atualize este README
3. Atualize [STRUCTURE.md](../STRUCTURE.md)
4. Atualize [README.md](../README.md) principal

---

## 📚 Documentação Relacionada

- [STRUCTURE.md](../STRUCTURE.md) - Estrutura e responsabilidades completas
- [README.md](../README.md) - Documentação principal do squad
- [STATUS.md](../STATUS.md) - Status atual e progresso
- [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md) - Guia de implementação

---

**Versão**: 1.0.0  
**Última Atualização**: 2026-02-10  
**Squad**: media-buyer-squad
