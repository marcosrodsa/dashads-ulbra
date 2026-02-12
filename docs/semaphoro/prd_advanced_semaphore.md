# PRD: Semáforo de Performance Avançado (Kill or Keep)

Formalização das regras de negócio e UI para o sistema de recomendação automatizada de gestão de criativos.

## 1. Objetivo
Transformar a coluna de "Saúde & Tendência" em um hub de decisão acionável, saindo de uma análise puramente estatística para recomendações baseadas no operacional de tráfego pago (Traffic Specialist Strategy).

## 2. Indicadores e Regras de Negócio

### 🔴 Pausar (Kill) - Stop-Loss Financeiro
Sugere a pausa imediata do criativo para estancar desperdício.
- **Regra A (Zero Conversões):** Gasto Acumulado > 2x o CPL Médio (Benchmark) E Conversões = 0.
- **Regra B (Piora Crítica):** CPL Atual > 1.8x o CPL Médio E Tendência de CPL em Alta (últimos 3 dias).

### 🟡 Alerta (Watch) - Observação Reativa
Sugere atenção e possível troca de ângulo ou criativo.
- **Regra A (Baixo Volume):** Gasto Acumulado > 1x o CPL Médio E Conversões = 0.
- **Regra B (Fadiga de Cliques):** CTR < 0.35% (independente do CPL atual) - sinal precoce de fadiga.

### 🟢 Escalar (Keep) - Green Light
Sugere aumento de orçamento ou proteção do criativo.
- **Regra A (Performance Estrela):** CPL < 80% do CPL Médio E Conversões > 3 (no período).
- **Regra B (Eficiência de Cliques):** CTR > 1.2% E CPL <= CPL Médio.

## 3. Janelas de Avaliação e Maturidade (Inspirado em Meta Ads)

Para evitar o erro de pausar criativos promissores precocemente, o semáforo respeitará as seguintes fases:

### 🆕 Fase 1: Ignição (0 - 72h)
- **Status:** "Aprendizado / Novo"
- **Regras:** Nenhuma decisão de "Kill" é tomada nestas primeiras 72h, a menos que o CTR seja < 0.15% (erro técnico ou criativo muito ruim).
- **Foco:** Validar se o anúncio está sendo entregue (CPM) e se desperta interesse inicial (CTR).

### 📈 Fase 2: Otimização (3 - 14 dias)
- **Status:** "Fase de Teste"
- **Regras:** Começam a valer os gatilhos de **🟡 Alerta** e **🔴 Pausar**. 
- **Maturidade:** O sistema prioriza a tendência (Sparkline) sobre o valor absoluto. Um CPL alto que está em queda rápida é mantido.

### 💎 Fase 3: Maturidade (14 dias+)
- **Status:** "Estabilizado"
- **Regras:** Decisão total do semáforo. Aplicação rigorosa do **Custo da Inação (COI)**.
- **Janela de Lookback:** O sistema olha preferencialmente para os últimos **7 dias móveis** para ditar o status atual, evitando distorções de um único dia ruim.

## 4. Experiência do Usuário (UX)

### Custo da Inação (COI)
Nos estados **🔴 Pausar** e **🟡 Alerta**, o tooltip deve exibir o cálculo do "prejuízo estimado":
- **Fórmula:** `(CPL Atual - CPL Médio) * Projeção de Leads 24h`.
- **Exemplo:** "Manter este criativo ativo estima um desperdício de **R$ 450,00** nas próximas 24h comparado ao seu benchmark."

### Visualização Refinada
- Manter o layout compacto otimizado para 1366x768.
- Utilizar badges com cores vibrantes e ícones claros (Sparkles para Escalar, Alert para Alerta, Trash/TrendingUp para Pausar).

---
*Assinado: Morgan (PM) & Squad DashAds*
