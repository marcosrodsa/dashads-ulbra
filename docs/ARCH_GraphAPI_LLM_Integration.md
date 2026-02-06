# Arquitetura Técnica: Meta Graph API + LLM Integration

**Autor:** @architect  
**Data:** 04/02/2026  
**Contexto:** Enriquecimento de dados de criativos para análise com Gemini LLM

---

## 🎯 Objetivo

Buscar **assets criativos** (imagens, vídeos, copy) da Meta Graph API usando apenas o `ad_id` disponível no banco, e enviar esses dados para o Gemini LLM gerar insights qualitativos.

---

## 📊 Situação Atual (Dados no Banco)

Baseado no screenshot fornecido, a tabela `fact_ads_performance_daily` contém:

```sql
- ad_id          VARCHAR    -- Ex: "800f37d1-9f7-416b-8bc7-d6d366b7ae44"
- entity_name    VARCHAR    -- Ex: "2025/02 | Graduação EAD | ULBRA POP..."
- spend          DECIMAL    -- Gasto
- impressions    INTEGER    -- Impressões
- reach          INTEGER    -- Alcance
- clicks         INTEGER    -- Cliques
```

**❌ O que NÃO temos:**
- Texto do anúncio (headline, body, call-to-action)
- URL da imagem/vídeo
- Tipo de criativo (imagem, vídeo, carrossel)
- Thumbnail/preview

**✅ O que temos:**
- `ad_id` (suficiente para buscar tudo na Graph API!)

---

## 🔌 Meta Graph API: Endpoints Necessários

### 1. **Buscar Detalhes do Criativo**

**Endpoint:**
```
GET https://graph.facebook.com/v21.0/{ad_id}
```

**Parâmetros:**
```
?fields=creative{
  title,
  body,
  call_to_action_type,
  image_url,
  video_id,
  object_story_spec,
  asset_feed_spec
}
&access_token={ACCESS_TOKEN}
```

**Response Exemplo:**
```json
{
  "id": "800f37d1-9f7-416b-8bc7-d6d366b7ae44",
  "creative": {
    "title": "Graduação EAD em Medicina",
    "body": "Conquiste seu diploma reconhecido pelo MEC. Últimas vagas!",
    "call_to_action_type": "LEARN_MORE",
    "image_url": "https://scontent.xx.fbcdn.net/v/t45.1600-4/...",
    "object_story_spec": {
      "page_id": "123456789",
      "link_data": {
        "message": "Texto completo do post",
        "link": "https://ulbra.br/medicina"
      }
    }
  }
}
```

### 2. **Buscar Vídeo (se aplicável)**

Se o criativo for vídeo, usar o `video_id`:

**Endpoint:**
```
GET https://graph.facebook.com/v21.0/{video_id}
?fields=source,picture,length
&access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "id": "987654321",
  "source": "https://video.xx.fbcdn.net/v/...",
  "picture": "https://scontent.xx.fbcdn.net/v/...",  // Thumbnail
  "length": 30.5  // Duração em segundos
}
```

---

## 🏗️ Arquitetura Proposta

```mermaid
flowchart TB
    A[Dashboard UI] -->|1. Usuário clica 'Analisar'| B[Frontend]
    B -->|2. POST /api/analyze-creative| C[Supabase Edge Function]
    
    C -->|3. Busca ad_id| D[fact_ads_performance_daily]
    D -->|4. Retorna ad_id| C
    
    C -->|5. GET /{ad_id}?fields=creative| E[Meta Graph API]
    E -->|6. Retorna creative assets| C
    
    C -->|7. Monta prompt com copy + image_url| F[Gemini API]
    F -->|8. Retorna insights JSON| C
    
    C -->|9. Salva insights| G[fact_creative_insights]
    G -->|10. Retorna para UI| A
    
    style E fill:#4267B2,color:#fff
    style F fill:#4285F4,color:#fff
```

---

## 🔐 Autenticação: Meta Access Token

### Opção 1: **User Access Token** (Recomendado para MVP)
- **Validade**: 60 dias (renovável)
- **Como obter**:
  1. Ir para [Meta Business Suite](https://business.facebook.com)
  2. Configurações → Ferramentas de Negócios → Tokens de Acesso
  3. Gerar token com permissões: `ads_read`, `ads_management`
  4. Salvar em `.env` do Supabase

**Prós:**
- Simples de configurar
- Funciona imediatamente

**Contras:**
- Precisa renovar manualmente a cada 60 dias

### Opção 2: **System User Token** (Produção)
- **Validade**: Não expira
- **Como obter**:
  1. Criar System User no Meta Business Manager
  2. Atribuir permissões de leitura de anúncios
  3. Gerar token permanente

**Prós:**
- Não expira
- Mais seguro (não vinculado a usuário pessoal)

**Contras:**
- Configuração mais complexa
- Requer Meta Business Manager configurado

---

## 💾 Estratégia de Cache

### Problema
- Graph API tem rate limits (200 chamadas/hora por usuário)
- Criativos não mudam com frequência

### Solução: Cache em 2 Camadas

#### Camada 1: `fact_creative_assets` (Banco de Dados)
```sql
CREATE TABLE fact_creative_assets (
    ad_id VARCHAR PRIMARY KEY,
    
    -- Dados do Creative
    title TEXT,
    body TEXT,
    cta_type VARCHAR,
    image_url TEXT,
    video_id VARCHAR,
    video_thumbnail_url TEXT,
    creative_type VARCHAR,  -- 'image', 'video', 'carousel'
    
    -- Metadata
    fetched_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP,
    
    -- Cache Control
    is_stale BOOLEAN DEFAULT FALSE,  -- Marcar para re-fetch
    
    FOREIGN KEY (ad_id) REFERENCES fact_ads_performance_daily(ad_id)
);
```

**Lógica de Cache:**
```typescript
async function getCreativeAssets(ad_id: string) {
  // 1. Verificar cache
  const cached = await supabase
    .from('fact_creative_assets')
    .select('*')
    .eq('ad_id', ad_id)
    .single();
  
  // 2. Se cache válido (< 7 dias), retornar
  if (cached && !cached.is_stale && isWithinDays(cached.fetched_at, 7)) {
    return cached;
  }
  
  // 3. Caso contrário, buscar na Graph API
  const graphData = await fetchFromGraphAPI(ad_id);
  
  // 4. Salvar/atualizar cache
  await supabase
    .from('fact_creative_assets')
    .upsert({
      ad_id,
      ...graphData,
      fetched_at: new Date(),
    });
  
  return graphData;
}
```

#### Camada 2: `fact_creative_insights` (Análise LLM)
```sql
CREATE TABLE fact_creative_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id VARCHAR NOT NULL,
    
    -- Análise de Copy
    copy_tone VARCHAR,
    mental_triggers TEXT[],
    copy_score INTEGER,
    copy_suggestions TEXT,
    
    -- Análise Visual
    visual_emotion VARCHAR,
    visual_score INTEGER,
    visual_suggestions TEXT,
    
    -- Metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    llm_model VARCHAR DEFAULT 'gemini-2.0-flash-exp',
    
    FOREIGN KEY (ad_id) REFERENCES fact_creative_assets(ad_id)
);
```

**Lógica:**
- Insights LLM são **permanentes** (não re-analisar)
- Apenas re-analisar se:
  - Usuário clicar "Re-analisar"
  - Creative assets foram atualizados (`fact_creative_assets.last_updated` mudou)

---

## 🔧 Implementação: Supabase Edge Function

### `supabase/functions/enrich-creative/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN")!;
const GRAPH_API_VERSION = "v21.0";

serve(async (req) => {
  const { ad_id } = await req.json();
  
  // 1. Verificar cache
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const { data: cached } = await supabase
    .from('fact_creative_assets')
    .select('*')
    .eq('ad_id', ad_id)
    .single();
  
  // 2. Se cache válido, retornar
  if (cached && isWithinDays(cached.fetched_at, 7)) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // 3. Buscar na Graph API
  const graphUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${ad_id}`;
  const params = new URLSearchParams({
    fields: 'creative{title,body,call_to_action_type,image_url,video_id,object_story_spec}',
    access_token: META_ACCESS_TOKEN,
  });
  
  const response = await fetch(`${graphUrl}?${params}`);
  
  if (!response.ok) {
    return new Response(JSON.stringify({ error: "Graph API error", status: response.status }), {
      status: 500,
    });
  }
  
  const data = await response.json();
  const creative = data.creative;
  
  // 4. Processar dados
  const assets = {
    ad_id,
    title: creative.title || creative.object_story_spec?.link_data?.name,
    body: creative.body || creative.object_story_spec?.link_data?.message,
    cta_type: creative.call_to_action_type,
    image_url: creative.image_url,
    video_id: creative.video_id,
    creative_type: creative.video_id ? 'video' : 'image',
    fetched_at: new Date().toISOString(),
  };
  
  // 5. Se for vídeo, buscar thumbnail
  if (creative.video_id) {
    const videoUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${creative.video_id}`;
    const videoParams = new URLSearchParams({
      fields: 'picture',
      access_token: META_ACCESS_TOKEN,
    });
    
    const videoResponse = await fetch(`${videoUrl}?${videoParams}`);
    const videoData = await videoResponse.json();
    assets.video_thumbnail_url = videoData.picture;
  }
  
  // 6. Salvar cache
  await supabase
    .from('fact_creative_assets')
    .upsert(assets);
  
  return new Response(JSON.stringify(assets), {
    headers: { "Content-Type": "application/json" },
  });
});

function isWithinDays(date: string, days: number): boolean {
  const diff = Date.now() - new Date(date).getTime();
  return diff < days * 24 * 60 * 60 * 1000;
}
```

---

## 🚀 Fluxo Completo: UI → Graph API → LLM

### 1. **Usuário Clica "Analisar Criativo"**

```tsx
// components/CreativeAnalysisButton.tsx

async function handleAnalyze(ad_id: string) {
  setLoading(true);
  
  try {
    // Passo 1: Enriquecer com Graph API
    const { data: assets } = await supabase.functions.invoke('enrich-creative', {
      body: { ad_id }
    });
    
    // Passo 2: Analisar com LLM
    const { data: insights } = await supabase.functions.invoke('analyze-with-llm', {
      body: {
        ad_id,
        title: assets.title,
        body: assets.body,
        image_url: assets.image_url,
        performance: {
          conversions: row.conversions,
          cpl: row.cpl,
          ctr: row.ctr,
        }
      }
    });
    
    toast.success("Análise concluída!");
    refetch();
  } catch (error) {
    toast.error("Erro ao analisar criativo");
  } finally {
    setLoading(false);
  }
}
```

### 2. **Edge Function: `analyze-with-llm`**

```typescript
// supabase/functions/analyze-with-llm/index.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  const { ad_id, title, body, image_url, performance } = await req.json();
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  // Análise de Copy
  const copyPrompt = `
    Analise este anúncio de curso superior:
    
    Título: "${title}"
    Texto: "${body}"
    
    Performance:
    - Conversões: ${performance.conversions}
    - CPL: R$ ${performance.cpl}
    - CTR: ${performance.ctr}%
    
    Retorne APENAS JSON válido:
    {
      "tone": "urgente|emocional|racional",
      "mental_triggers": ["escassez", "prova_social", "autoridade"],
      "score": 8,
      "suggestions": "Adicionar número específico de vagas disponíveis"
    }
  `;
  
  const copyResult = await model.generateContent(copyPrompt);
  const copyAnalysis = JSON.parse(copyResult.response.text());
  
  // Análise Visual (se tiver imagem)
  let visualAnalysis = null;
  if (image_url) {
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const imageResponse = await fetch(image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    const visualPrompt = `
      Analise esta imagem de anúncio educacional.
      Retorne APENAS JSON válido:
      {
        "emotion": "aspiracional|confiança|urgência",
        "score": 7,
        "suggestions": "Adicionar texto overlay com benefício principal"
      }
    `;
    
    const visualResult = await visionModel.generateContent([
      visualPrompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);
    
    visualAnalysis = JSON.parse(visualResult.response.text());
  }
  
  // Salvar insights
  const supabase = createClient(...);
  await supabase.from('fact_creative_insights').insert({
    ad_id,
    copy_tone: copyAnalysis.tone,
    mental_triggers: copyAnalysis.mental_triggers,
    copy_score: copyAnalysis.score,
    copy_suggestions: copyAnalysis.suggestions,
    visual_emotion: visualAnalysis?.emotion,
    visual_score: visualAnalysis?.score,
    visual_suggestions: visualAnalysis?.suggestions,
  });
  
  return new Response(JSON.stringify({ copyAnalysis, visualAnalysis }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## ⚠️ Considerações Técnicas

### 1. **Rate Limits da Graph API**
- **Limite**: 200 chamadas/hora por access token
- **Solução**: Cache de 7 dias + análise sob demanda (não automática)
- **Estimativa**: 500 criativos únicos/mês = ~17 chamadas/dia (bem abaixo do limite)

### 2. **Custo Gemini API**
- **Modelo**: `gemini-2.0-flash-exp`
- **Custo por análise**: ~$0.001 (copy) + ~$0.002 (visual) = **$0.003/criativo**
- **Volume**: 500 criativos/mês = **$1.50/mês** 💰

### 3. **Latência**
- Graph API: ~500ms
- Gemini API (copy): ~2s
- Gemini API (visual): ~4s
- **Total**: ~6-7 segundos por análise completa

**Otimização**: Processar em background (job queue) e notificar usuário quando concluir.

### 4. **Segurança do Access Token**
- **Nunca** expor no frontend
- Armazenar em Supabase Secrets
- Renovar automaticamente (se usar System User)

---

## 📋 Checklist de Implementação

### Fase 1: Infraestrutura (3 dias)
- [ ] Criar tabela `fact_creative_assets`
- [ ] Criar tabela `fact_creative_insights`
- [ ] Configurar Meta Access Token (Supabase Secrets)
- [ ] Configurar Gemini API Key (Supabase Secrets)

### Fase 2: Graph API Integration (3 dias)
- [ ] Edge Function `enrich-creative`
- [ ] Lógica de cache (7 dias)
- [ ] Tratamento de erros (token inválido, ad_id não encontrado)
- [ ] Suporte para vídeos (buscar thumbnail)

### Fase 3: LLM Integration (4 dias)
- [ ] Edge Function `analyze-with-llm`
- [ ] Prompt engineering (copy analysis)
- [ ] Prompt engineering (visual analysis)
- [ ] Parsing de JSON do Gemini (validação)

### Fase 4: UI (3 dias)
- [ ] Botão "Analisar com IA" na tabela de criativos
- [ ] Card de insights (copy + visual)
- [ ] Loading states e error handling
- [ ] Badge "Analisado" vs. "Pendente"

---

## 🎯 Opinião Técnica do @architect

### ✅ **VIÁVEL e RECOMENDADO**

**Justificativa:**
1. **Dados Suficientes**: O `ad_id` é tudo que precisamos para buscar assets completos
2. **Custo Baixo**: ~$1.50/mês (Gemini) + $0 (Graph API é gratuita para leitura)
3. **Rate Limits Gerenciáveis**: Cache de 7 dias resolve 95% dos casos
4. **Valor Agregado Alto**: Insights qualitativos que dados numéricos não fornecem

**Riscos Mitigados:**
- ✅ Cache evita rate limits
- ✅ Análise sob demanda (não automática) controla custos
- ✅ Edge Functions isolam lógica sensível (tokens)

### 🚀 **Recomendação de Priorização**

**MVP (2 semanas):**
1. Graph API integration (buscar copy + image_url)
2. Análise de copy com Gemini (sem visual)
3. UI básica (botão + card de insights)

**V2 (1 semana):**
1. Análise visual (Gemini Vision)
2. Suporte para vídeos (thumbnail)

**V3 (futuro):**
1. Análise comparativa automática (Top vs. Bottom)
2. Geração de variações A/B

---

**Próximo Passo**: Aprovação do @pm para iniciar implementação! 🎯
