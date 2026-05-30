-- Migration: Add Blog Post Custom Fields
-- Allows unlimited dynamic fields per blog post

-- Create table for custom fields
CREATE TABLE IF NOT EXISTS "blog_post_fields" (
    "id" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,          -- machine name (slug)
    "label" TEXT NOT NULL,         -- human readable label
    "type" TEXT NOT NULL,          -- field type: text, textarea, number, image, url, boolean, select, multiselect, date, html, markdown, json
    "value" JSONB,                -- stored as JSON (flexible)
    "order" INTEGER DEFAULT 0,     -- display order
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_fields_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "blog_post_fields_name_blogPostId_key" UNIQUE ("name", "blogPostId")
);

-- Add foreign key to blog_posts
ALTER TABLE "blog_post_fields"
    ADD CONSTRAINT "blog_post_fields_blogPostId_fkey"
    FOREIGN KEY ("blogPostId") REFERENCES "blog_posts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for fast lookup
CREATE INDEX "blog_post_fields_blogPostId_idx" ON "blog_post_fields"("blogPostId");

-- Add updatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_post_fields_updated_at ON "blog_post_fields";
CREATE TRIGGER update_blog_post_fields_updated_at
    BEFORE UPDATE ON "blog_post_fields"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
