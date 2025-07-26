-- Debug script to check magazine article content blocks

-- 1. Check if content_blocks column exists and its data type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'magazine_articles'
AND column_name = 'content_blocks';

-- 2. Check recent articles and their content blocks
SELECT 
    id,
    title,
    status,
    created_at,
    jsonb_array_length(content_blocks) as block_count,
    content_blocks::text as raw_content_blocks
FROM magazine_articles
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check a specific article's content blocks in detail
SELECT 
    id,
    title,
    jsonb_pretty(content_blocks) as formatted_blocks
FROM magazine_articles
WHERE content_blocks IS NOT NULL 
AND jsonb_array_length(content_blocks) > 0
LIMIT 1;

-- 4. Check if there are any articles with image blocks
SELECT 
    id,
    title,
    block->>'type' as block_type,
    block->>'content' as block_content
FROM magazine_articles,
     jsonb_array_elements(content_blocks) as block
WHERE block->>'type' = 'image'
LIMIT 10;

-- 5. Check for any malformed content_blocks
SELECT 
    id,
    title,
    pg_typeof(content_blocks) as data_type,
    CASE 
        WHEN content_blocks IS NULL THEN 'NULL'
        WHEN content_blocks = '[]'::jsonb THEN 'EMPTY_ARRAY'
        WHEN jsonb_typeof(content_blocks) != 'array' THEN 'NOT_ARRAY'
        ELSE 'OK'
    END as status
FROM magazine_articles
WHERE status = 'published'
ORDER BY created_at DESC;

-- 6. Test creating an article with content blocks (for debugging)
-- This will help verify if the issue is with insertion or retrieval
/*
INSERT INTO magazine_articles (
    title,
    slug,
    excerpt,
    featured_image,
    author_id,
    category_id,
    status,
    content_blocks
) VALUES (
    'Test Article with Image',
    'test-article-with-image-' || extract(epoch from now())::text,
    'Testing image storage',
    'https://example.com/test-featured.jpg',
    auth.uid(),
    (SELECT id FROM magazine_categories LIMIT 1),
    'draft',
    '[
        {
            "id": 1,
            "type": "header",
            "content": "Test Header",
            "order": 0
        },
        {
            "id": 2,
            "type": "image",
            "content": "https://example.com/test-image.jpg",
            "order": 1
        },
        {
            "id": 3,
            "type": "paragraph",
            "content": "Test paragraph content",
            "order": 2
        }
    ]'::jsonb
) RETURNING id, title, jsonb_pretty(content_blocks);
*/