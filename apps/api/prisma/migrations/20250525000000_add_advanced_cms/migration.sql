-- Migration: Advanced CMS Schema
-- Adds TemplateSchema, SiteStatistics, SitePublishLog, and updates to existing tables

-- Add jsonValue column to SiteConfig for complex data
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "jsonValue" JSONB;

-- Add folder and tags to MediaFile for better organization
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "folder" VARCHAR(255) DEFAULT '/';
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "tags" JSONB;

-- Create TemplateSchema table
CREATE TABLE IF NOT EXISTS "template_schemas" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "schema" JSONB NOT NULL DEFAULT '{}',
    "pages" JSONB NOT NULL DEFAULT '[]',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "autoDetected" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_schemas_pkey" PRIMARY KEY ("id")
);

-- Create unique index on templateId
CREATE UNIQUE INDEX IF NOT EXISTS "template_schemas_templateId_key" ON "template_schemas"("templateId");

-- Add foreign key to Template
ALTER TABLE "template_schemas" 
    ADD CONSTRAINT "template_schemas_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SiteStatistics table
CREATE TABLE IF NOT EXISTS "site_statistics" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "countries" JSONB,
    "referrers" JSONB,
    "pages" JSONB,
    "devices" JSONB,
    "dailyStats" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_statistics_pkey" PRIMARY KEY ("id")
);

-- Create unique index on clientId
CREATE UNIQUE INDEX IF NOT EXISTS "site_statistics_clientId_key" ON "site_statistics"("clientId");

-- Add foreign key to Client
ALTER TABLE "site_statistics" 
    ADD CONSTRAINT "site_statistics_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SitePublishLog table
CREATE TABLE IF NOT EXISTS "site_publish_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "url" TEXT NOT NULL,
    "errorMessage" TEXT,
    "changesSummary" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT,

    CONSTRAINT "site_publish_logs_pkey" PRIMARY KEY ("id")
);

-- Create index on clientId and publishedAt for efficient queries
CREATE INDEX IF NOT EXISTS "site_publish_logs_clientId_publishedAt_idx" 
    ON "site_publish_logs"("clientId", "publishedAt");

-- Add foreign key to Client
ALTER TABLE "site_publish_logs" 
    ADD CONSTRAINT "site_publish_logs_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add updatedAt trigger for template_schemas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_template_schemas_updated_at ON "template_schemas";
CREATE TRIGGER update_template_schemas_updated_at
    BEFORE UPDATE ON "template_schemas"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
