# PRD: Gaia Chat Preditivo

## Visão Geral

**Objetivo:** Criar interface de chat conversacional com a Gaia, especialista em análise e predição de dados de mídia paga.

**Proposta de valor:** Transformar dados complexos em respostas acionáveis via linguagem natural.

---

## Casos de Uso

| Persona | Pergunta exemplo | Resposta esperada |
|---------|------------------|-------------------|
| Gestor de Tráfego | "Por que meu CPA subiu essa semana?" | Análise comparativa + causas identificadas |
| Coordenador | "Qual unidade está performando melhor?" | Ranking com métricas + insights |
| Analista | "Preveja conversões para próximo mês" | Forecast estatístico + intervalo de confiança |
| Criador | "Que tipo de visual funciona melhor?" | Clustering de criativos + padrões identificados |

---

## Arquitetura Proposta

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Chat UI        │────▶│  gaia-chat       │────▶│  Gemini API     │
│  (React)        │◀────│  (Edge Function) │◀────│  + RAG Context  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Supabase           │
                    │  - chat_messages    │
                    │  - chat_sessions    │
                    │  - Performance data │
                    └─────────────────────┘
```

---

## Funcionalidades

### MVP (P1)
- [ ] Chat básico com histórico de sessão
- [ ] Contexto automático de performance (últimos 30 dias)
- [ ] Perguntas sobre métricas atuais

### Fase 2 (P2)  
- [ ] Predição de fadiga de criativos
- [ ] Forecast de spend/conversões
- [ ] Comparativos entre períodos

### Fase 3 (P3)
- [ ] Análise visual de criativos (embeddings)
- [ ] Sugestões proativas
- [ ] Alertas inteligentes

---

## Modelo de Dados

### Tabela: `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Interface (UI)

**Opção recomendada:** Drawer lateral
- Abre ao clicar no ícone da Gaia no header
- Mantém contexto do dashboard atual
- Histórico de conversas anteriores
- Sugestões de perguntas rápidas

---

## Técnicas de IA

| Feature | Técnica |
|---------|---------|
| Chat contextual | RAG (Retrieval Augmented Generation) |
| Forecast | Prophet / ARIMA via prompt |
| Clustering | K-Means em embeddings |

---

## Métricas de Sucesso

- **Adoção:** % usuários que usam chat/semana
- **Engajamento:** Média de mensagens por sessão
- **Utilidade:** % respostas marcadas como úteis

---

## Próximos Passos

1. Validar PRD com stakeholders
2. Criar wireframe da UI
3. Implementar MVP (chat básico + contexto)
4. Testar com usuários piloto
