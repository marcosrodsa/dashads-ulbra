-- ============================================================================
-- GAIA KNOWLEDGE BASE (RAG Infrastructure)
-- ============================================================================
-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 1. Create the Knowledge Base Table
-- Stores "chunks" of knowledge (documentation, rules, schema info)
create table if not exists gaia_knowledge_base (
  id bigserial primary key,
  content text not null unique,         -- The actual text (e.g., "The CPL is calculated by...")
  metadata jsonb default '{}'::jsonb,   -- Extra info (e.g., {"source": "dashboard_budget", "type": "kpi_def"})
  embedding vector(3072),                -- Gemini Embedding 001/004 can use 3072 dimensions
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
-- Crucial: Controls who can READ/WRITE to this "brain"
alter table gaia_knowledge_base enable row level security;

-- Policy: Authenticated users (like the Edge Function) can READ
drop policy if exists "Allow read access to authenticated users" on gaia_knowledge_base;
create policy "Allow read access to authenticated users"
  on gaia_knowledge_base
  for select
  to authenticated
  using (true);

-- Policy: Service Role (Admins/n8n) can INSERT/UPDATE
drop policy if exists "Allow write access to service role only" on gaia_knowledge_base;
create policy "Allow write access to service role only"
  on gaia_knowledge_base
  for all
  to service_role
  using (true)
  with check (true);

-- Ensure column type is correct if table already exists (Force update)
ALTER TABLE gaia_knowledge_base ALTER COLUMN embedding TYPE vector(3072);

-- 3. Search Function (RPC)
-- This is what the Gaia Tool calls to find relevant info
create or replace function match_knowledge (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    gaia_knowledge_base.id,
    gaia_knowledge_base.content,
    gaia_knowledge_base.metadata,
    1 - (gaia_knowledge_base.embedding <=> query_embedding) as similarity -- Cosine Similarity
  from gaia_knowledge_base
  where 1 - (gaia_knowledge_base.embedding <=> query_embedding) > match_threshold
  order by gaia_knowledge_base.embedding <=> query_embedding
  limit match_count;
end;
$$;
