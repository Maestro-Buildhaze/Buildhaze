-- Migration: Add Blog Schema
-- Creates categories, authors tables and adds columns to blog_posts

-- Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT DEFAULT '#c9a962',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Create unique index on categories (clientId, slug)
CREATE UNIQUE INDEX IF NOT EXISTS "categories_clientId_slug_key" ON "categories"("clientId", "slug");

-- Add foreign key to Client for categories
ALTER TABLE "categories" 
    ADD CONSTRAINT "categories_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Create authors table
CREATE TABLE IF NOT EXISTS "authors" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "role" TEXT,
    "bio" TEXT,
    "socialLinks" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- Add foreign key to Client for authors
ALTER TABLE "authors" 
    ADD CONSTRAINT "authors_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Check if blog_posts table exists, if not create it, otherwise add columns
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blog_posts') THEN
        -- Create blog_posts table with all columns
        CREATE TABLE "blog_posts" (
            "id" TEXT NOT NULL,
            "clientId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "excerpt" TEXT,
            "content" TEXT NOT NULL,
            "coverImage" TEXT,
            "categoryId" TEXT,
            "authorId" TEXT,
            "readTime" INTEGER DEFAULT 5,
            "isPublished" BOOLEAN NOT NULL DEFAULT false,
            "isFeatured" BOOLEAN NOT NULL DEFAULT false,
            "publishedAt" TIMESTAMP(3),
            "metaTitle" TEXT,
            "metaDesc" TEXT,
            "bullets" JSONB DEFAULT '[]',
            "tags" JSONB DEFAULT '[]',
            "customFields" JSONB DEFAULT '{}',
            "viewCount" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
        );

        -- Create unique index
        CREATE UNIQUE INDEX "blog_posts_clientId_slug_key" ON "blog_posts"("clientId", "slug");

        -- Add foreign keys
        ALTER TABLE "blog_posts" 
            ADD CONSTRAINT "blog_posts_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "clients"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;

        ALTER TABLE "blog_posts" 
            ADD CONSTRAINT "blog_posts_categoryId_fkey" 
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id");

        ALTER TABLE "blog_posts" 
            ADD CONSTRAINT "blog_posts_authorId_fkey" 
            FOREIGN KEY ("authorId") REFERENCES "authors"("id");
    ELSE
        -- Table exists, add missing columns
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "readTime" INTEGER DEFAULT 5;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "metaDesc" TEXT;
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "bullets" JSONB DEFAULT '[]';
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "tags" JSONB DEFAULT '[]';
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
        ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

        -- Add foreign keys if not exist
        DO $inner$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_categoryId_fkey'
            ) THEN
                ALTER TABLE "blog_posts" 
                    ADD CONSTRAINT "blog_posts_categoryId_fkey" 
                    FOREIGN KEY ("categoryId") REFERENCES "categories"("id");
            END IF;
            
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_authorId_fkey'
            ) THEN
                ALTER TABLE "blog_posts" 
                    ADD CONSTRAINT "blog_posts_authorId_fkey" 
                    FOREIGN KEY ("authorId") REFERENCES "authors"("id");
            END IF;
        END $inner$;
    END IF;
END $$;

-- Also fix the isActive column issue if it exists in raw queries
-- Rename isActive to isActive (case sensitivity fix)
DO $$
BEGIN
    -- Check if clients table has isActive column (lowercase)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'isactive'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'isActive'
    ) THEN
        -- Rename column
        ALTER TABLE "clients" RENAME COLUMN "isactive" TO "isActive";
    END IF;
END $$;

-- Add updatedAt triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate triggers for categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON "categories";
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON "categories"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate triggers for authors  
DROP TRIGGER IF EXISTS update_authors_updated_at ON "authors";
CREATE TRIGGER update_authors_updated_at
    BEFORE UPDATE ON "authors"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate triggers for blog_posts
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON "blog_posts";
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON "blog_posts"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
