# Backlog de Melhorias - Inteligência de Criativos

## Sessão de Brainstorm - 07/02/2026

### Participantes
- PM (Morgan)
- Data Engineer (Dara)
- Analyst (Atlas)
- UX (Dev)
- Stakeholder (Marco)

---

## Features Priorizadas

### P1 - Alta Prioridade

#### 1. Paginação e Visualização Completa de Criativos
**Descrição:** Mostrar todos os criativos na página, não apenas top 50.
- Implementar paginação (20-50 por página)
- Respeitar filtros ativos
- Ordenação por conversões (padrão), CPL, CTR, etc.
- Botão "Carregar mais" ou paginação numérica

**Critério de aceite:**
- [ ] Todos criativos visíveis com paginação
- [ ] Filtros funcionando corretamente
- [ ] Ordenação dinâmica

---

#### 2. Preview de Imagem sem Corte (CONCLUÍDO ✅)
**Descrição:** Imagem no hover do heat map não corta mais.
- Alterado `object-cover` → `object-contain`

---

### P2 - Média Prioridade

#### 3. Algoritmos Preditivos e Estatísticos
**Descrição:** Cruzamento de dados com modelos estatísticos.

**Técnicas propostas:**
| Técnica | Uso |
|---------|-----|
| Prophet/ARIMA | Forecast de conversões e fadiga |
| Regressão | Impacto de variáveis no CPL |
| Clustering | Agrupamento de criativos similares |
| Correlação | Relação entre métricas |

**Implementação:**
- Nova tabela `analytics_predictions`
- Edge Function `gaia-predictions`
- Cálculos via Gemini + SQL

---

#### 4. Melhorar Explicação "vs Média"
**Descrição:** Adicionar tooltip explicando a métrica.
- Fórmula: `((CPL / Média) - 1) × 100`
- Verde = abaixo (bom), Vermelho = acima (ruim)

---

### P3 - Baixa Prioridade

#### 5. Export de Dados
- CSV/Excel dos criativos filtrados

#### 6. Histórico de Performance
- Gráfico de evolução por criativo

---

## Decisões Técnicas

1. **Paginação:** Usar `react-query` com `keepPreviousData` + cursor-based
2. **Predições:** Armazenar em tabela separada, rodar sob demanda
3. **Ordenação:** Client-side para datasets pequenos, server-side para grandes

---

## Próximos Passos

1. [ ] Implementar paginação na tabela de criativos
2. [ ] Adicionar tooltip explicativo no "vs Média"
3. [ ] POC de predição de fadiga com Prophet
4. [ ] Criar PRD detalhado para algoritmos preditivos
