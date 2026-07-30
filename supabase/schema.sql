-- =============================================================================
-- Nexus Platform · schema.sql
-- RAG: pgvector + таблица document_chunks + RPC match_chunks
-- =============================================================================
-- КАК ПРИМЕНИТЬ:
-- 1) Supabase Dashboard → SQL Editor
-- 2) Вставить этот файл целиком → Run
--
-- КАК NEXT.JS ОБЩАЕТСЯ С ЭТОЙ СХЕМОЙ:
-- src/app/api/rag/route.ts
--   → createSupabaseServerClient()          (src/lib/supabase/server.ts)
--   → supabase.from('document_chunks').insert(...)   // сохранить чанки
--   → supabase.rpc('match_chunks', { ... })          // найти похожие
-- Supabase принимает HTTPS → PostgREST/RPC → Postgres+pgvector → JSON в Next.js.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Включаем расширение pgvector.
-- ЗАЧЕМ: появляется тип vector(N) и операторы расстояния (<->, <=> , <#>).
-- Без этой строки CREATE TABLE с embedding vector(768) упадёт.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- Таблица document_chunks
-- Одна строка = один фрагмент текста + его векторный эмбеддинг.
-- Колонки по ТЗ: id, content, metadata jsonb, embedding vector(768).
-- document_id и chunk_index кладём в metadata, чтобы фильтровать поиск по файлу.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_chunks (
  -- Уникальный идентификатор чанка (UUID генерирует Postgres)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Текст фрагмента — именно он попадёт в промпт LLM при удачном match
  content TEXT NOT NULL,

  -- Гибкие метаданные документа/чанка в формате JSON:
  -- {
  --   "document_id": "uuid-файла",
  --   "chunk_index": 0,
  --   "filename": "ops.txt",
  --   "mimeType": "text/plain"
  -- }
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Вектор эмбеддинга размерности 768
  -- (Gemini text-embedding-004 по умолчанию).
  -- ВАЖНО: та же модель и dimensions должны использоваться и при ingest, и при query.
  embedding vector(768) NOT NULL,

  -- Служебная метка времени (удобно чистить старые чанки)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Пояснения в каталоге Postgres (видны в Dashboard)
COMMENT ON TABLE public.document_chunks IS
  'RAG-чанки Nexus: content + metadata + pgvector embedding';
COMMENT ON COLUMN public.document_chunks.embedding IS
  'Вектор Gemini text-embedding-004 (768 измерений)';
COMMENT ON COLUMN public.document_chunks.metadata IS
  'JSON: document_id, chunk_index, filename и др.';

-- -----------------------------------------------------------------------------
-- Индексы: ускоряют фильтр по document_id внутри metadata и ANN-поиск по вектору
-- -----------------------------------------------------------------------------

-- Expression-индекс по metadata->>'document_id' —
-- быстрый поиск/удаление всех чанков одного загруженного файла.
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
  ON public.document_chunks ((metadata->>'document_id'));

-- HNSW-индекс для приближённого cosine-поиска (оператор <=>).
-- ЗАЧЕМ: без индекса match_chunks на больших таблицах станет медленным seq scan.
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- Функция match_chunks — косинусный (semantic) поиск ближайших фрагментов
--
-- ВХОД (из Next.js через supabase.rpc('match_chunks', {...})):
--   query_embedding     — embedding вопроса пользователя (vector/number[768])
--   match_count         — сколько чанков вернуть (top-k), по умолчанию 4
--   match_threshold     — минимальная similarity (0..1), по умолчанию 0.5
--   filter_document_id  — опционально: искать только чанки одного файла
--
-- ВЫХОД:
--   id, content, metadata, similarity — готово для сборки RAG-промпта
--
-- ФОРМУЛА:
--   cosine distance = embedding <=> query_embedding
--   similarity      = 1 - distance   (чем ближе к 1, тем релевантнее)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_chunks (
  -- Embedding вопроса (тот же model/dimensions, что при записи чанков!)
  query_embedding vector(768),
  -- Сколько лучших результатов вернуть
  match_count INTEGER DEFAULT 4,
  -- Порог отсечения слабых совпадений
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  -- NULL = по всей таблице; строка UUID = только этот document_id из metadata
  filter_document_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  -- Пробрасываем поля, нужные API и UI
  id UUID,
  content TEXT,
  metadata JSONB,
  -- Оценка похожести для отладки и сортировки в приложении
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Первичный ключ найденного чанка
    c.id,
    -- Текст фрагмента → пойдёт в контекст LLM
    c.content,
    -- Метаданные (filename, chunk_index, document_id, ...)
    c.metadata,
    -- Переводим cosine distance в понятный score «похожести»
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks AS c
  WHERE
    -- Если задан filter_document_id — ищем только внутри одного файла
    (
      filter_document_id IS NULL
      OR c.metadata->>'document_id' = filter_document_id
    )
    -- Отбрасываем чанки ниже порога similarity
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  -- Сортировка по возрастанию distance = от самых похожих к менее похожим
  ORDER BY c.embedding <=> query_embedding
  -- top-k (защита от match_count <= 0)
  LIMIT GREATEST(match_count, 1);
$$;

COMMENT ON FUNCTION public.match_chunks IS
  'Cosine semantic search по document_chunks. Вызов из Next.js: supabase.rpc(''match_chunks'', ...)';

-- -----------------------------------------------------------------------------
-- Row Level Security (учебный MVP: открыто для anon/authenticated)
-- В production замените USING (true) на проверку auth.uid() / org_id.
-- -----------------------------------------------------------------------------
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_chunks_select_all" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_insert_all" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_delete_all" ON public.document_chunks;

-- Разрешаем читать чанки (нужно для rpc/select)
CREATE POLICY "document_chunks_select_all"
  ON public.document_chunks
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Разрешаем вставлять чанки после ingest
CREATE POLICY "document_chunks_insert_all"
  ON public.document_chunks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Разрешаем удалять (повторная индексация того же document_id)
CREATE POLICY "document_chunks_delete_all"
  ON public.document_chunks
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- Готово. Дальше в Vercel/.env.local:
--   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable или legacy anon>
-- =============================================================================
