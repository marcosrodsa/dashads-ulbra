-- ============================================================================
-- GAIA CHAT - Database Schema
-- ============================================================================
-- Autor: @data-engineer (Dara)
-- Data: 07/02/2026
-- Descrição: Tabelas para chat conversacional com Gaia
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA: chat_sessions (Sessões de conversa)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Nova conversa',
    context JSONB DEFAULT '{}', -- filtros aplicados, período, unidade, etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id 
    ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated 
    ON chat_sessions(updated_at DESC);

-- ----------------------------------------------------------------------------
-- 2. TABELA: chat_messages (Mensagens do chat)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- queries executadas, fontes, tempo de resposta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_messages_session 
    ON chat_messages(session_id, created_at);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON chat_sessions;
CREATE POLICY "Users can view own sessions" 
    ON chat_sessions FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON chat_sessions;
CREATE POLICY "Users can create own sessions" 
    ON chat_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON chat_sessions;
CREATE POLICY "Users can update own sessions" 
    ON chat_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON chat_sessions;
CREATE POLICY "Users can delete own sessions" 
    ON chat_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para chat_messages (via session ownership)
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON chat_messages;
CREATE POLICY "Users can view messages from own sessions" 
    ON chat_messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON chat_messages;
CREATE POLICY "Users can insert messages to own sessions" 
    ON chat_messages FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Service role access for Edge Functions
DROP POLICY IF EXISTS "Service role full access sessions" ON chat_sessions;
CREATE POLICY "Service role full access sessions" 
    ON chat_sessions FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access messages" ON chat_messages;
CREATE POLICY "Service role full access messages" 
    ON chat_messages FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. TRIGGER: Atualizar updated_at automaticamente
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_session_timestamp ON chat_sessions;
CREATE TRIGGER trigger_update_chat_session_timestamp
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_timestamp();

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
