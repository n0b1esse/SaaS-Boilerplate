-- =============================================================================
-- Nexus Platform · схема Supabase для RAG-модуля
-- =============================================================================
-- КАК ЗАПУСТИТЬ:
-- 1) Откройте Supabase Dashboard → SQL Editor
-- 2) Вставьте этот файл целиком и нажмите Run
-- 3) Убедитесь, что расширение vector активно: Database → Extensions → vector
--
-- КАК ЭТО СВЯЗАНО С NEXT.JS:
-- Next.js (Route Handler /api/rag) через @supabase/supabase-js вызывает:
--   • insert в public.documents  — сохранить чанки + embeddings
--   • rpc('match_documents')     — найти ближайшие чанки к вопросу
-- Supabase принимает HTTPS-запрос → PostgREST/RPC → Postgres+pgvector → JSON.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Расширение pgvector
-- ЗАЧЕМ: добавляет тип `vector` и операторы расстояния (<->, <=>, <#>)
-- без него колонка embedding и match_documents не соберутся.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- 2) Таблица documents
-- Одна строка = один текстовый чанк загруженного файла + его embedding.
-- document_id связывает все чанки одного upload'а (удобно фильтровать поиск).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  -- Первичный ключ чанка (UUID генерирует Postgres)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Идентификатор «документа-сессии» (один файл → много чанков с одним document_id)
  document_id UUID NOT NULL,

  -- Текст фрагмента, который попадёт в контекст LLM при удачном match
  content TEXT NOT NULL,

  -- Порядковый номер чанка внутри файла (0, 1, 2, ...) — для отладки и UI
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),

  -- Гибкие метаданные: { "filename": "ops.pdf", "mime": "application/pdf", ... }
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Вектор эмбеддинга.
  -- 1536 = размерность OpenAI text-embedding-3-small (дефолт).
  -- Если смените модель/dimensions — поменяйте и здесь, и индекс.
  embedding vector(1536) NOT NULL,

  -- Когда чанк записали (удобно чистить старые документы)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Комментарии к таблице/колонкам видны в Dashboard и помогают команде
COMMENT ON TABLE public.documents IS 'RAG-чанки Nexus Platform: текст + pgvector embedding';
COMMENT ON COLUMN public.documents.document_id IS 'Группа чанков одного загруженного файла';
COMMENT ON COLUMN public.documents.embedding IS 'Вектор text-embedding-3-small (1536)';

-- -----------------------------------------------------------------------------
-- 3) Индексы
-- ЗАЧЕМ: ускоряют фильтр по document_id и приближённый ANN-поиск по вектору.
-- -----------------------------------------------------------------------------

-- Быстрый поиск/удаление всех чанков одного документа
CREATE INDEX IF NOT EXISTS documents_document_id_idx
  ON public.documents (document_id);

-- HNSW-индекс по cosine distance (оператор <=>).
-- Подходит для семантического поиска «вопрос ≈ чанк».
-- lists/ef не нужны (это IVFFlat); HNSW проще стартовать в MVP.
CREATE INDEX IF NOT EXISTS documents_embedding_hnsw_idx
  ON public.documents
  USING hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- 4) Функция match_documents — векторный поиск для RAG
-- ВХОД:
--   query_embedding   — embedding вопроса пользователя (number[1536])
--   match_count       — сколько чанков вернуть (top-k), по умолчанию 4
--   match_threshold   — минимальная similarity (0..1), по умолчанию 0.5
--   filter_document_id — опционально искать только внутри одного файла
-- ВЫХОД:
--   строки с content + similarity, отсортированные от лучших к худшим
--
-- ВЫЗОВ ИЗ NEXT.JS:
--   await supabase.rpc('match_documents', {
--     query_embedding: embedding,
--     match_count: 4,
--     match_threshold: 0.5,
--     filter_document_id: documentId
--   })
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_documents (
  -- Embedding вопроса (тот же model/dimensions, что при ingest!)
  query_embedding vector(1536),
  -- Сколько лучших чанков вернуть
  match_count INTEGER DEFAULT 4,
  -- Порог схожести: отсекаем слабые совпадения
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  -- NULL = искать по всей таблице; UUID = только чанки этого файла
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  -- Пробрасываем поля, нужные UI/промпту
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  -- similarity: 1 = идентично, 0 = ортогонально (для cosine)
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.document_id,
    d.content,
    d.chunk_index,
    d.metadata,
    -- Cosine distance (<=>) ∈ [0..2] типично для нормализованных векторов;
    -- similarity = 1 - distance удобнее читать как «процент похожести».
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents AS d
  WHERE
    -- Если передали filter_document_id — ограничиваем поиск одним файлом
    (filter_document_id IS NULL OR d.document_id = filter_document_id)
    -- Оставляем только достаточно похожие чанки
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  -- Сортировка по возрастанию distance = от самых похожих
  ORDER BY d.embedding <=> query_embedding
  -- top-k
  LIMIT GREATEST(match_count, 1);
$$;

COMMENT ON FUNCTION public.match_documents IS
  'Semantic search по documents.embedding (cosine). Вызывается из Next.js через supabase.rpc';

-- -----------------------------------------------------------------------------
-- 5) Row Level Security (базовый каркас)
-- ЗАЧЕМ: anon key публичный; без RLS любой мог бы читать/писать всю таблицу.
-- Сейчас политики открыты для authenticated/anon на время учебного MVP.
-- Позже замените на auth.uid() = metadata->>'user_id' или отдельную ACL-таблицу.
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики с теми же именами (удобно при повторном Run скрипта)
DROP POLICY IF EXISTS "documents_select_all" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_all" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_all" ON public.documents;

-- Чтение чанков (нужно для rpc/select из приложения)
CREATE POLICY "documents_select_all"
  ON public.documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Вставка чанков после ingest
CREATE POLICY "documents_insert_all"
  ON public.documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Удаление (очистка документа перед повторной индексацией)
CREATE POLICY "documents_delete_all"
  ON public.documents
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- Готово. Дальше:
-- 1) Положите NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в Vercel/.env.local
-- 2) Подключите createSupabaseServerClient() в /api/rag для insert + match_documents
-- =============================================================================
