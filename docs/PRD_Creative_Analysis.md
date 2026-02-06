# PRD: Meta Ads Creative Analysis Module

**Versão:** 1.0  
**Data:** 04/02/2026  
**Autor:** @pm (Product Manager) + @data-engineer  
**Projeto:** DashAds ULBRA - Creative Intelligence  

---

## 📋 Sumário Executivo

Este documento define os requisitos para um novo módulo de **Análise de Criativos de Meta Ads** no DashAds ULBRA. O objetivo é fornecer insights de nível **BI Senior** sobre quais criativos (ads) convertem melhor e **por quê**, utilizando a base de dados existente (`fact_ads_performance_daily`).

### Problema a Resolver
Atualmente, o dashboard mostra performance agregada por campanha, mas não oferece visibilidade granular sobre:
- **Quais criativos específicos** geram mais conversões
- **Padrões de performance** por tipo de criativo (imagem, vídeo, carrossel)
- **Elementos visuais ou de copy** que impactam conversão
- **Tendências temporais** de fadiga de criativo

### Objetivo
Criar um módulo analítico que permita ao time de mídia identificar os **top performers** e entender os **fatores de sucesso** para replicar em novas campanhas.

---

## 🎯 Objetivos de Negócio

### Primários
1. **Identificar Top Criativos**: Ranking dos 20 criativos com melhor performance (conversões, CPL, CTR)
2. **Análise Comparativa**: Comparar criativos dentro da mesma campanha ou curso
3. **Detecção de Fadiga**: Identificar criativos com queda de performance ao longo do tempo
4. **Insights Acionáveis**: Gerar recomendações automáticas baseadas em padrões

### Secundários
1. Exportar relatórios para apresentações executivas
2. Alertas automáticos quando um criativo atinge threshold de performance
3. Integração futura com análise de imagem (AI/ML) para identificar elementos visuais

---

## 👥 Personas e Casos de Uso

### Persona 1: Analista de Mídia (Usuário Principal)
**Objetivo**: Otimizar campanhas identificando criativos vencedores  
**Casos de Uso**:
- Ver quais criativos de Medicina têm melhor CPL
- Comparar performance de vídeos vs. imagens estáticas
- Identificar criativos que precisam ser pausados (baixa performance)

### Persona 2: Gestor de Marketing
**Objetivo**: Entender ROI e tomar decisões estratégicas  
**Casos de Uso**:
- Relatório executivo de top 10 criativos do mês
- Análise de investimento por tipo de criativo
- Benchmark de performance entre unidades (EAD vs. Presencial)

---

## 📊 Fonte de Dados

### Tabela Principal: `fact_ads_performance_daily`

**Campos Disponíveis** (baseado no schema atual):
```sql
- date (DATE)                    -- Data de referência
- campaign_name (VARCHAR)        -- Nome da campanha
- account_name (VARCHAR)         -- Conta de anúncios
- platform (VARCHAR)             -- META ou GOOGLE
- spend (DECIMAL)                -- Gasto diário
- conversions (INTEGER)          -- Leads/Conversões
- impressions (INTEGER)          -- Impressões
- clicks (INTEGER)               -- Cliques
- ad_id (VARCHAR)                -- ID do criativo (Meta Ads)
- ad_name (VARCHAR)              -- Nome do criativo
- ad_creative_url (TEXT)         -- URL da imagem/vídeo (se disponível)
```

**Granularidade**:
- **Meta Ads**: Nível de criativo (ad_id)
- **Google Ads**: Nível de campanha (sem granularidade de criativo)

**Período de Dados**: Últimos 90 dias (mínimo para análise de tendências)

---

## 🔍 Requisitos Funcionais

### RF-01: Dashboard de Criativos
**Descrição**: Página dedicada à análise de criativos do Meta Ads  
**Prioridade**: Alta

**Componentes**:
1. **Filtros**:
   - Período (últimos 7/30/90 dias ou range customizado)
   - Unidade de Negócio
   - Curso
   - Tipo de Criativo (imagem, vídeo, carrossel)
   - Status (ativo, pausado, todos)

2. **KPIs Principais**:
   - Total de Criativos Ativos
   - Conversões Totais
   - CPL Médio
   - CTR Médio
   - Investimento Total

3. **Tabela de Criativos** (Top 50):
   | Coluna | Descrição | Ordenação |
   |--------|-----------|-----------|
   | Preview | Thumbnail do criativo | - |
   | Nome do Criativo | ad_name | Alfabética |
   | Campanha | campaign_name | Alfabética |
   | Curso | Derivado da campanha | Alfabética |
   | Impressões | Total | Desc |
   | Cliques | Total | Desc |
   | CTR | clicks / impressions | Desc |
   | Conversões | Total | Desc (default) |
   | CPL | spend / conversions | Asc |
   | Investimento | Total gasto | Desc |
   | Status | Ativo/Pausado | - |

4. **Gráficos**:
   - **Performance ao Longo do Tempo**: Line chart (conversões diárias por criativo selecionado)
   - **Distribuição por Tipo**: Pie chart (% de conversões por tipo de criativo)
   - **Top 10 Criativos**: Bar chart horizontal (conversões)
   - **CPL Comparison**: Scatter plot (investimento vs. conversões, tamanho = CTR)

---

### RF-02: Análise de Fadiga de Criativo
**Descrição**: Detectar criativos com queda de performance  
**Prioridade**: Média

**Lógica**:
```
1. Dividir período em 3 janelas (ex: últimos 30 dias = 3 blocos de 10 dias)
2. Calcular CPL médio por janela
3. Se CPL aumentou >30% entre janela 1 e 3 → Flag "Fadiga Detectada"
4. Se CTR caiu >20% → Flag "Perda de Engajamento"
```

**Output**:
- Badge visual na tabela de criativos
- Aba dedicada "Criativos em Fadiga" com recomendação de ação

---

### RF-03: Insights Automáticos (BI Senior)
**Descrição**: Gerar insights textuais baseados em padrões  
**Prioridade**: Alta

**Exemplos de Insights**:
1. **Top Performer**:
   > "O criativo 'Medicina - Vídeo Depoimento' gerou 45% das conversões de Medicina com CPL 23% abaixo da média."

2. **Padrão Identificado**:
   > "Vídeos têm CPL 18% menor que imagens estáticas no curso de Direito."

3. **Alerta de Performance**:
   > "3 criativos de EAD estão com CTR abaixo de 1% nos últimos 7 dias."

4. **Recomendação**:
   > "Considere pausar o criativo 'Odonto - Imagem 01' (CPL R$ 45,00 vs. média R$ 28,00)."

**Implementação**:
- Algoritmo de análise de padrões (SQL + lógica frontend)
- Card "Insights" no topo do dashboard
- Atualização diária

---

### RF-04: Exportação de Relatórios
**Descrição**: Exportar dados para análise externa  
**Prioridade**: Baixa

**Formatos**:
- CSV (tabela completa)
- PDF (relatório executivo com gráficos)
- Excel (com múltiplas abas: Resumo, Detalhes, Tendências)

---

### RF-05: Métricas Avançadas de Vídeo (Hook & Hold)
**Descrição**: Indicadores de retenção de vídeo via Meta Graph API  
**Prioridade**: Alta

**Métricas**:
1. **Hook Rate (Taxa de Gancho)**: `video_3_sec_watched_actions / impressions`
   - Indica a eficácia dos primeiros 3 segundos do vídeo.
2. **Hold Rate (Taxa de Retenção)**: `video_p100_watched_actions / video_3_sec_watched_actions`
   - Indica se o conteúdo manteve a atenção até o final.
3. **CTA Click Rate**: `outbound_clicks / impressions`
   - Indica a eficácia do CTA no criativo.

**Fonte de Dados**: Meta Graph API `/insights` com campos:
- `video_3_sec_watched_actions`
- `video_p100_watched_actions`
- `outbound_clicks`

**UI**:
- Colunas extras na tabela de criativos (apenas para tipo "Vídeo").
- Gráfico de funil de retenção no painel de detalhes.

---

### RF-06: Análise Profunda com IA (Magic Button)
**Descrição**: Gerar insights de nível consultor sênior sob demanda  
**Prioridade**: Alta

**Fluxo**:
1. Usuário clica no botão "Analisar com IA" no painel do criativo.
2. O sistema envia para o Gemini LLM:
   - `body` (copy do anúncio)
   - `title` (headline)
   - `call_to_action_type` (CTA)
   - `thumbnail_url` (imagem via Gemini Vision)
   - `cpl`, `ctr`, `hook_rate`, `hold_rate` (performance)
3. O Gemini retorna um relatório estruturado.

**Output do LLM**:
```json
{
  "tom_de_voz": "urgente",
  "gatilhos_mentais": ["escassez", "prova_social"],
  "score_copy": 8,
  "score_visual": 7,
  "diagnostico": "O gancho de 3s está fraco. A headline usa urgência, mas o visual não comunica a mesma energia.",
  "sugestao_otimizacao": "Adicione um texto animado nos primeiros 2 segundos com a headline."
}
```

**UI**:
- Card expansível "Diagnóstico IA" no Sheet do criativo.
- Badges visuais para gatilhos mentais.
- Seção "Próximos Passos" com o briefing de iteração.

---

### RF-07: Gerador de Briefing Automático
**Descrição**: Criar briefing técnico para designers replicarem um criativo campeão  
**Prioridade**: Média

**Input**: Criativo selecionado (top performer).
**Output**:
```markdown
## Briefing de Iteração: [Nome do Criativo]

### Elementos a Replicar:
- **Cor Dominante:** Azul Ulbra (#003366)
- **Tempo de Vídeo Ideal:** 15s (alta retenção até 12s)
- **Gancho:** Pergunta direta nos primeiros 2s ("Quer uma carreira em Medicina?")
- **CTA:** "Inscreva-se Agora"
- **Gatilho Principal:** Escassez ("Últimas vagas")

### Sugestões de Teste A/B:
1. Trocar a cor do botão de CTA para verde.
2. Testar headline com prova social ("12.000 alunos formados").
```

---

## 🗄️ Modelagem de Dados


### View SQL Proposta: `vw_creative_performance`

```sql
CREATE OR REPLACE VIEW vw_creative_performance AS
SELECT 
    p.ad_id,
    p.ad_name,
    p.campaign_name,
    p.platform,
    p.date,
    
    -- Classificação (reutilizar lógica existente)
    CASE 
        WHEN p.campaign_name ILIKE '%EAD%' THEN 'EAD'
        WHEN p.campaign_name ILIKE '%Medicina%' THEN 'Medicina'
        -- ... (lógica completa de curso)
    END as curso,
    
    CASE 
        WHEN p.campaign_name ILIKE '%Canoas%' THEN 'Ulbra Canoas'
        WHEN p.campaign_name ILIKE '%Torres%' THEN 'Ulbra Torres'
        -- ... (lógica completa de unidade)
    END as unidade,
    
    -- Métricas
    p.spend as investimento,
    p.impressions as impressoes,
    p.clicks as cliques,
    p.conversions as conversoes,
    
    -- Métricas Calculadas
    CASE 
        WHEN p.impressions > 0 THEN ROUND((p.clicks::DECIMAL / p.impressions) * 100, 2)
        ELSE 0 
    END as ctr,
    
    CASE 
        WHEN p.conversions > 0 THEN ROUND(p.spend / p.conversions, 2)
        ELSE NULL 
    END as cpl,
    
    -- Tipo de Criativo (inferido do nome ou campo dedicado)
    CASE 
        WHEN p.ad_name ILIKE '%video%' OR p.ad_name ILIKE '%vídeo%' THEN 'Vídeo'
        WHEN p.ad_name ILIKE '%carrossel%' OR p.ad_name ILIKE '%carousel%' THEN 'Carrossel'
        ELSE 'Imagem'
    END as tipo_criativo

FROM fact_ads_performance_daily p
WHERE p.platform = 'META'  -- Apenas Meta Ads (tem granularidade de criativo)
  AND p.ad_id IS NOT NULL
  AND p.campaign_name NOT ILIKE '%Ultec%';  -- Exclusão padrão
```

### Tabela Proposta: `fact_creative_assets` (Cache da Graph API)

```sql
CREATE TABLE fact_creative_assets (
    ad_id VARCHAR PRIMARY KEY,
    title TEXT,
    body TEXT,
    call_to_action_type VARCHAR,
    thumbnail_url TEXT,
    video_url TEXT,
    video_3_sec_watched BIGINT,
    video_p100_watched BIGINT,
    outbound_clicks BIGINT,
    enriched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index para busca rápida
CREATE INDEX idx_creative_assets_ad_id ON fact_creative_assets(ad_id);
```

### Tabela Proposta: `fact_creative_insights` (Cache do LLM)

```sql
CREATE TABLE fact_creative_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id VARCHAR REFERENCES fact_creative_assets(ad_id),
    tom_de_voz VARCHAR,
    gatilhos_mentais TEXT[],
    score_copy INTEGER,
    score_visual INTEGER,
    diagnostico TEXT,
    sugestao_otimizacao TEXT,
    briefing_iteracao TEXT,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por ad_id
CREATE INDEX idx_creative_insights_ad_id ON fact_creative_insights(ad_id);
```

---


## 🎨 Wireframe (Estrutura da Página)

```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar]  CREATIVE ANALYSIS                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filtros: [Período ▼] [Unidade ▼] [Curso ▼] [Tipo ▼]       │
│                                                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Criativos│ Conversões│   CPL    │   CTR    │Investimento│
│  │   124    │  1,234   │ R$ 28,50 │  2.45%   │ R$ 35,2K  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│                                                               │
│  💡 Insights:                                                │
│  • Vídeos convertem 23% melhor que imagens em Medicina      │
│  • 3 criativos em fadiga detectada (ver detalhes)           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Top 10 Criativos (Conversões)          [📊 Gráfico]│    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ [Thumb] Medicina - Vídeo Depoimento    │ 234 conv  │    │
│  │ [Thumb] Direito - Carrossel Benefícios │ 189 conv  │    │
│  │ ...                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Tabela Completa de Criativos            [🔍 Buscar]│    │
│  ├──────┬──────────┬─────────┬──────┬──────┬─────────┤    │
│  │ Prev │ Nome     │ Campanha│ Conv │ CPL  │ Status  │    │
│  ├──────┼──────────┼─────────┼──────┼──────┼─────────┤    │
│  │ [📷] │ Med-V01  │ Medicina│ 234  │28.50 │ Ativo ✅│    │
│  │ [📷] │ Dir-C02  │ Direito │ 189  │31.20 │ Ativo ✅│    │
│  │ [📷] │ Odon-I03 │ Odonto  │  45  │45.00 │ ⚠️Fadiga│    │
│  └──────┴──────────┴─────────┴──────┴──────┴─────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Roadmap de Implementação

### Fase 1: MVP (2 semanas)
- [ ] Criar view `vw_creative_performance`
- [ ] Página básica com tabela de criativos
- [ ] Filtros (período, unidade, curso)
- [ ] KPIs principais
- [ ] Ordenação por coluna

### Fase 2: Análise Avançada (1 semana)
- [ ] Gráfico de performance ao longo do tempo
- [ ] Top 10 criativos (bar chart)
- [ ] Distribuição por tipo (pie chart)
- [ ] Detecção de fadiga (algoritmo)

### Fase 3: Insights Automáticos (1 semana)
- [ ] Lógica de geração de insights
- [ ] Card de insights no dashboard
- [ ] Badges visuais na tabela

### Fase 4: Exportação (3 dias)
- [ ] Exportar CSV
- [ ] Exportar PDF (relatório executivo)

### Fase 5: Métricas Avançadas de Vídeo (1 semana)
**Objetivo**: Implementar Hook Rate, Hold Rate e CTA Click Rate

- [ ] **Infraestrutura**:
  - [ ] Expandir `fact_creative_assets` com campos de vídeo
  - [ ] Criar Edge Function `fetch-video-insights`
- [ ] **UI**:
  - [ ] Colunas de Hook/Hold na tabela (condicional para vídeos)
  - [ ] Gráfico de funil de retenção no Sheet de detalhes

### Fase 6: Meta Graph API Integration (2 semanas)

**Objetivo**: Enriquecer dados com assets criativos (copy, imagens, vídeos) da Meta Graph API

- [ ] **Infraestrutura**:
  - [ ] Criar tabela `fact_creative_assets` (cache de dados da Graph API)
  - [ ] Configurar Meta Access Token (Supabase Secrets)
  - [ ] Criar Edge Function `enrich-creative`
- [ ] **Funcionalidades**:
  - [ ] Buscar creative assets (title, body, image_url, video_id) via Graph API
  - [ ] Implementar cache de 7 dias (evitar rate limits)
  - [ ] Suporte para vídeos (buscar thumbnail)
  - [ ] Tratamento de erros (token inválido, ad_id não encontrado)
- [ ] **UI**:
  - [ ] Exibir preview de imagem/vídeo na tabela
  - [ ] Modal de detalhes do criativo (copy completo + visual)
  - [ ] Badge "Enriquecido" vs. "Pendente"

**Referência Técnica**: Ver `docs/ARCH_GraphAPI_LLM_Integration.md`

### Fase 7: AI-Powered Insights (Gemini LLM) (2 semanas)
**Objetivo**: Gerar insights qualitativos sobre criativos usando Gemini LLM (RF-06 & RF-07)


- [ ] **Infraestrutura**:
  - [ ] Criar tabela `fact_creative_insights` (análises LLM)
  - [ ] Configurar Gemini API Key (Supabase Secrets)
  - [ ] Criar Edge Function `analyze-with-llm`
- [ ] **Análise de Copy**:
  - [ ] Identificar tom de voz (urgente, emocional, racional)
  - [ ] Detectar gatilhos mentais (escassez, prova social, autoridade)
  - [ ] Gerar score de qualidade (1-10)
  - [ ] Sugestões de otimização
- [ ] **Análise Visual** (Gemini Vision):
  - [ ] Identificar elementos visuais dominantes
  - [ ] Detectar emoção transmitida
  - [ ] Gerar score visual (1-10)
  - [ ] Sugestões de melhoria
- [ ] **Análise Comparativa**:
  - [ ] Comparar Top vs. Bottom performers
  - [ ] Identificar padrões de sucesso
  - [ ] Gerar hipóteses de teste A/B
- [ ] **UI**:
  - [ ] Botão "Analisar com IA" (sob demanda)
  - [ ] Card de insights (copy + visual)
  - [ ] Badges de gatilhos mentais
  - [ ] Seção "Sugestões de A/B Test"

**Custo Estimado**: ~$1.50/mês (500 criativos)  
**Referência Técnica**: Ver `docs/ARCH_GraphAPI_LLM_Integration.md`

---

## 📏 Métricas de Sucesso

| Métrica | Baseline | Meta (3 meses) |
|---------|----------|----------------|
| Tempo para identificar top criativo | 30 min (manual) | <2 min |
| Criativos otimizados por mês | 5 | 20 |
| Redução de CPL médio | - | -15% |
| Adoção pelo time de mídia | - | 100% (uso semanal) |

---

## 🔒 Requisitos Não-Funcionais

### Performance
- Carregamento da tabela: <3s para 1000 criativos
- Filtros: resposta instantânea (<500ms)

### Segurança
- RLS (Row Level Security) mantido da tabela `fact_ads_performance_daily`
- Apenas usuários autenticados podem acessar

### Escalabilidade
- Suportar até 10.000 criativos simultâneos
- Histórico de 12 meses

---

## 🧪 Casos de Teste

### CT-01: Filtro por Curso
**Dado**: Usuário seleciona "Medicina"  
**Quando**: Aplica filtro  
**Então**: Tabela exibe apenas criativos de campanhas de Medicina

### CT-02: Ordenação por CPL
**Dado**: Tabela com 50 criativos  
**Quando**: Usuário clica em coluna "CPL"  
**Então**: Criativos são ordenados do menor para o maior CPL

### CT-03: Detecção de Fadiga
**Dado**: Criativo com CPL crescente (R$ 20 → R$ 30 → R$ 40)  
**Quando**: Sistema executa análise  
**Então**: Badge "Fadiga Detectada" é exibido

---

## 📞 Stakeholders

| Nome | Papel | Responsabilidade |
|------|-------|------------------|
| @pm (Morgan) | Product Manager | Definição de requisitos e PRD |
| @data-engineer (Flux) | Engenheiro de Dados | Modelagem SQL, views e Graph API |
| @dev (Dex) | Desenvolvedor Full Stack | Implementação UI e integração LLM |
| @ux-design-expert (Aura) | Designer UX | Wireframes, componentes e fluxos |
| @analyst (Adriel) | Analista de BI | Validação de métricas e lógica de negócio |
| @architect (Skye) | Arquiteto | Design de sistemas e escalabilidade |
| @devops (Gage) | DevOps | Deploy, Edge Functions e infra |
| @qa (Quinn) | QA | Testes e validação de cálculos |
| Equipe de Mídia | Usuário Final | Validação e feedback |


---

**Aprovação Necessária**: Gestor de Marketing + Equipe de Mídia  
**Próximos Passos**: Validar PRD → Criar task breakdown → Iniciar Fase 1
