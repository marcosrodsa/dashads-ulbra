# Media Buyer Squad

> Advanced Media Buying & Paid Traffic Squad with 5 specialized agents, 18 skills, and 47 expert frameworks

## Overview

The **media-buyer-squad** is a comprehensive AI-powered team designed to manage, optimize, and scale paid traffic campaigns across Meta platforms (Facebook & Instagram). Built on proven frameworks from industry experts like Jeremy Haynes, Brian Moncada, Alex Hormozi, Brandon Carter, and Jordan Stupar.

## 📊 Visual Structure & Diagrams

Para uma visão visual completa da estrutura do squad, veja os **4 diagramas** em `docs/diagrams/`:

1. **[Squad Structure](docs/diagrams/01-squad-structure.png)** - Hierarquia e papéis dos agentes
2. **[Trigger Flow](docs/diagrams/02-trigger-flow.png)** - Quando acionar cada agente
3. **[Workflow & Skills](docs/diagrams/03-workflow-skills.png)** - Processo completo e habilidades
4. **[Expert Sources](docs/diagrams/04-experts-summary.png)** - Frameworks integrados e resumo

📖 **Documentação Completa**: [STRUCTURE.md](STRUCTURE.md) | [Diagrams README](docs/diagrams/README.md)

### Quick Reference

```
@ad-midas (LEAD) → Strategy, Structure, Scale Decisions
    ├── @performance-analyst → Metrics, Kill/Scale, Budget
    ├── @creative-analyst → Hooks, Copy, Briefs
    ├── @pixel-specialist → Tracking, CAPI, Attribution
    └── @media-buyer → Execution, Consultation
```

## Squad Composition

### 🎯 Agents

1. **ad-midas** (Media Strategist & Squad Lead)
   - Role: Strategic oversight, campaign structure, scaling decisions
   - Expertise: Funnel selection, unit economics, campaign orchestration

2. **media-buyer** (Senior Media Buyer & Paid Traffic Strategist)
   - Role: Campaign execution, budget management, platform optimization
   - Expertise: Meta Ads, bidding strategies, audience targeting

3. **performance-analyst** (Metrics & Optimization Specialist)
   - Role: Data analysis, kill/scale decisions, performance monitoring
   - Expertise: Metrics analysis, attribution, optimization rules

4. **creative-analyst** (Creative & Copy Specialist)
   - Role: Creative strategy, hook generation, copy writing
   - Expertise: DSL frameworks, hook testing, creative angles

5. **pixel-specialist** (Pixel & Tracking Specialist)
   - Role: Tracking setup, attribution configuration, data integrity
   - Expertise: Meta Pixel, CAPI, event tracking, attribution models

## 🛠️ Skills (18 Total)

### Diagnostic (5 skills)

- `*diagnose-metrics` - Complete metrics diagnostic
- `*audit-tracking` - Pixel, CAPI, and events audit
- `*detect-fatigue` - Creative fatigue detection
- `*analyze-funnel` - Conversion funnel analysis
- `*analyze-attribution` - Cross-platform attribution analysis

### Generative (5 skills)

- `*generate-hooks` - Generate 10+ hook variations (DSL)
- `*generate-copy` - Generate copy (PAS, AIDA, BAB, STORY)
- `*create-brief` - Generate creative briefs
- `*generate-angles` - Generate creative angles
- `*create-dsl` - Create Deck Sales Letter structures

### Optimization (3 skills)

- `*evaluate-kill-scale` - Kill or scale rules
- `*allocate-budget` - Budget allocation optimization
- `*expand-audience` - Audience expansion strategies

### Strategic (4 skills)

- `*select-funnel` - Ideal funnel type selection
- `*calculate-economics` - CAC, LTV, payback calculations
- `*check-scale-readiness` - Scale readiness assessment
- `*structure-campaign` - Campaign structure definition

### Automation (1 skill)

- `*monitor-campaigns` - Autonomous campaign monitoring

## 📚 Expert Frameworks (47 Total)

### Jeremy Haynes

- DSL Revolution
- Constants vs Variables
- KiB/Scale Rules
- Funnel Selection

### Brian Moncada

- Andromeda Method
- YouTube Ads
- Hook Testing
- Metric Thresholds

### Alex Hormozi

- Unit Economics
- LTV/CAC Rules
- Hydra Strategy

### Brandon Carter

- Constants vs Variables
- Scientific Ad Testing

### Jordan Stupar

- Creative Strategy

## 🔄 Collaboration Flow

### Handoff Rules

```
ad-midas → creative-analyst
  Trigger: hook rate <15% OR creative briefing needed

ad-midas → pixel-specialist
  Trigger: conversion ==0 OR tracking setup needed

ad-midas → performance-analyst
  Trigger: CPA > Target OR metrics analysis needed

performance-analyst → ad-midas
  Trigger: scaling decision needed OR budget change >50%

performance-analyst → creative-analyst
  Trigger: CTR dropping OR creative fatigue detected
```

### Workflow Sequence

1. **ad-midas**: Define strategy and campaign structure
2. **pixel-specialist**: Configure tracking and attribution
3. **creative-analyst**: Create creative briefs and generate hooks
4. **ad-midas**: Launch campaign
5. **performance-analyst**: Monitor metrics and apply kill/scale rules
6. **ad-midas**: Scale, optimize, or pause

## 🚀 Quick Start

### Activate an Agent

```bash
@ad-midas
@media-buyer
@performance-analyst
@creative-analyst
@pixel-specialist
```

### Use a Skill

```bash
@performance-analyst *diagnose-metrics
@creative-analyst *generate-hooks
@pixel-specialist *audit-tracking
@ad-midas *structure-campaign
```

### Run a Workflow

```bash
@ad-midas *campaign-launch
@performance-analyst *scale-optimization
@creative-analyst *creative-refresh
```

## 📋 Key Workflows

1. **Campaign Launch** - End-to-end campaign setup and launch
2. **Creative Refresh** - Systematic creative testing and refresh
3. **Scale Optimization** - Data-driven scaling decisions
4. **Tracking Setup** - Complete tracking infrastructure setup

## 🔌 MCP Integrations

This squad integrates with:

- **meta-ads** - Meta Ads API integration
- **meta-mcp** - Meta Marketing API
- **meta-pixel-mcp** - Meta Pixel & CAPI integration

## 📊 Metrics & KPIs

The squad monitors and optimizes:

- **Acquisition**: CPA, CPL, CAC
- **Engagement**: CTR, Hook Rate, Hold Rate
- **Conversion**: CVR, ROAS, LTV
- **Creative**: Creative Fatigue Index, Hook Performance
- **Attribution**: Multi-touch attribution, Platform contribution

## 🎯 Use Cases

- Launch new paid traffic campaigns
- Scale existing profitable campaigns
- Diagnose underperforming campaigns
- Refresh creative assets systematically
- Set up tracking infrastructure
- Optimize budget allocation
- Expand audience reach
- Calculate unit economics
- Test creative angles and hooks

## 📖 Documentation

- [Campaign Launch Workflow](workflows/campaign-launch-workflow.md)
- [Creative Strategy Guide](docs/creative-strategy-guide.md)
- [Metrics Playbook](docs/metrics-playbook.md)
- [Tracking Setup Guide](docs/tracking-setup-guide.md)

## 🛡️ Compliance & Best Practices

- Follows Meta Ads policies
- GDPR/CCPA compliant tracking
- Ethical advertising standards
- Data privacy protection
- Attribution accuracy

## 📝 License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**AIOS Compatibility**: 2.1.0+  
**Last Updated**: 2026-02-10
