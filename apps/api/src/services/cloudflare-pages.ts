/**
 * Cloudflare Pages Deployment Service
 * Deploys templates as live sites on Cloudflare Pages with random subdomains
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface DeployOptions {
  clientId: string;
  businessName: string;
  templateId: string;
  r2Key: string;
  bucketName: string;
}

interface DeployResult {
  success: boolean;
  projectName?: string;
  subdomain?: string;
  url?: string;
  error?: string;
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export class CloudflarePagesService {
  private apiToken: string;
  private accountId: string;
  private r2Client: S3Client;

  constructor() {
    // Use dedicated Pages token if available, fallback to main token
    this.apiToken = process.env.CF_PAGES_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = process.env.CF_ACCOUNT_ID || '';
    
    if (!this.apiToken || !this.accountId) {
      throw new Error('Cloudflare API token (CF_PAGES_API_TOKEN or CLOUDFLARE_API_TOKEN) and CF_ACCOUNT_ID must be configured');
    }

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Deploy a template to Cloudflare Pages
   * If existingProjectName is provided, redeploy to same project (update)
   * Otherwise create a new project
   */
  async deployTemplate(options: DeployOptions & { existingProjectName?: string }): Promise<DeployResult> {
    try {
      const { clientId, businessName, templateId, r2Key, bucketName, existingProjectName } = options;

      // Reuse existing project or generate a new unique name
      const projectName = existingProjectName || this.generateProjectName(businessName, clientId);
      const subdomain = `${projectName}.pages.dev`;

      console.log(`Deploying ${businessName} to Cloudflare Pages as ${projectName}...`);

      // 1. Create Pages project (no-op if already exists)
      const project = await this.createProject(projectName);
      if (!project.success) {
        return { success: false, error: project.error };
      }

      // 2. Get template files from R2
      const files = await this.getFilesFromR2(bucketName, r2Key);
      if (!files || files.length === 0) {
        return { success: false, error: 'No files found in R2' };
      }

      // 3. Upload files to Pages (via wrangler CLI)
      const uploadResult = await this.uploadFiles(projectName, files);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      const liveUrl = `https://${subdomain}`;
      
      return {
        success: true,
        projectName,
        subdomain,
        url: liveUrl,
      };

    } catch (error: any) {
      console.error('Cloudflare Pages deployment error:', error);
      return {
        success: false,
        error: error.message || 'Unknown deployment error',
      };
    }
  }

  /**
   * Generate unique project name from business name
   */
  private generateProjectName(businessName: string, clientId: string): string {
    // Clean business name
    const clean = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20);
    
    // Add random suffix
    const suffix = Math.random().toString(36).substring(2, 8);
    const shortId = clientId.substring(0, 6);
    
    return `${clean}-${shortId}-${suffix}`;
  }

  /**
   * Create a new Cloudflare Pages project
   */
  private async createProject(projectName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            production_branch: 'main',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok && data.errors?.[0]?.code !== 8000007) {
        // 8000007 = project already exists, which is fine
        return {
          success: false,
          error: data.errors?.[0]?.message || 'Failed to create project',
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all files from R2 bucket under a prefix (template folder)
   */
  private async getFilesFromR2(bucketName: string, r2KeyPrefix: string): Promise<{ path: string; content: Buffer }[]> {
    try {
      // List all objects under the prefix
      const listCmd = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: r2KeyPrefix + '/',
      });

      const listing = await this.r2Client.send(listCmd);
      if (!listing.Contents || listing.Contents.length === 0) {
        console.error(`No files found in R2 under prefix: ${r2KeyPrefix}/`);
        return [];
      }

      console.log(`Found ${listing.Contents.length} files in R2 under ${r2KeyPrefix}/`);

      // Fetch each file
      const files: { path: string; content: Buffer }[] = [];
      for (const obj of listing.Contents) {
        if (!obj.Key) continue;
        
        // Get relative path (strip the prefix)
        const relativePath = obj.Key.replace(r2KeyPrefix + '/', '');
        if (!relativePath) continue;

        const getCmd = new GetObjectCommand({
          Bucket: bucketName,
          Key: obj.Key,
        });

        const response = await this.r2Client.send(getCmd);
        const rawContent = await response.Body?.transformToByteArray();
        if (!rawContent) continue;

        let content = Buffer.from(rawContent);

        // For HTML files: rewrite hardcoded R2 URLs to relative paths
        // e.g. https://pub-xxx.r2.dev/templates/coffee-shopk/about.html → about.html
        if (relativePath.endsWith('.html')) {
          let html = content.toString('utf-8');
          // Build the exact R2 prefix to strip
          // r2KeyPrefix = "templates/coffee-shopk"
          // R2 public URL base = "https://pub-61d0516b43b34d60b459185fed874027.r2.dev/templates/coffee-shopk/"
          const r2PublicBase = `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${r2KeyPrefix}/`;
          // Simple string split/join - safe, won't corrupt HTML
          html = html.split(r2PublicBase).join('./');
          content = Buffer.from(html, 'utf-8');
        }

        files.push({ path: relativePath, content });
      }

      return files;
    } catch (error: any) {
      console.error('Error getting files from R2:', error);
      return [];
    }
  }

  /**
   * Upload files to Cloudflare Pages using wrangler CLI
   */
  private async uploadFiles(
    projectName: string,
    files: { path: string; content: Buffer }[]
  ): Promise<{ success: boolean; deploymentUrl?: string; error?: string }> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-pages-'));
    try {
      console.log(`Uploading ${files.length} files to CF Pages project ${projectName}:`);

      // Write files to temp directory
      for (const file of files) {
        const filePath = path.join(tmpDir, file.path);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
        console.log(`  - /${file.path} (${file.content.length} bytes)`);
      }

      // Deploy using wrangler CLI - try multiple paths for different environments
      const possiblePaths = [
        path.resolve(__dirname, '../../../node_modules/.bin/wrangler'),   // local: apps/api/node_modules
        path.resolve(__dirname, '../../../../node_modules/.bin/wrangler'), // monorepo root
        '/opt/render/project/src/apps/api/node_modules/.bin/wrangler',    // Render (api)
        '/opt/render/project/src/node_modules/.bin/wrangler',             // Render (root)
        'wrangler',                                                         // global PATH
      ];
      const wranglerPath = possiblePaths.find(p => {
        try { return p === 'wrangler' || require('fs').existsSync(p); } catch { return false; }
      }) || 'wrangler';
      console.log(`Using wrangler at: ${wranglerPath}`);
      const cmd = `"${wranglerPath}" pages deploy "${tmpDir}" --project-name="${projectName}" --branch=main --commit-dirty=true 2>&1`;
      
      console.log(`Running wrangler deploy for ${projectName}...`);
      const output = execSync(cmd, {
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: this.apiToken,
          CLOUDFLARE_ACCOUNT_ID: this.accountId,
        },
        timeout: 120000,
      }).toString();
      
      console.log('Wrangler output:', output);
      
      const url = `https://${projectName}.pages.dev`;
      return { success: true, deploymentUrl: url };
    } catch (error: any) {
      const errMsg = error.stdout?.toString() || error.stderr?.toString() || error.message;
      console.error('Wrangler deploy error:', errMsg);
      return { success: false, error: errMsg };
    } finally {
      // Cleanup temp dir
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  /**
   * Get deployment info
   */
  private async getDeployment(projectName: string): Promise<any> {
    try {
      const response = await fetch(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      const data = await response.json();
      return data.result?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get analytics for a specific Pages deployment
   */
  async getDeploymentAnalytics(projectName: string): Promise<any> {
    try {
      // Get deployment info
      const deployment = await this.getDeployment(projectName);
      if (!deployment) {
        return null;
      }

      // Get zone analytics if zone exists
      // For Pages, we'd need to query by the pages.dev subdomain
      // This requires the zone to be added to Cloudflare
      
      return {
        deploymentId: deployment.id,
        url: deployment.url,
        environment: deployment.environment,
        created_on: deployment.created_on,
        latest_stage: deployment.latest_stage,
      };
    } catch (error: any) {
      console.error('Error getting deployment analytics:', error);
      return null;
    }
  }

  /**
   * List all Pages projects for account
   */
  async listProjects(): Promise<any[]> {
    try {
      const response = await fetch(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      const data = await response.json();
      return data.result || [];
    } catch (error: any) {
      console.error('Error listing projects:', error);
      return [];
    }
  }
}

// Export singleton instance
export const cloudflarePagesService = new CloudflarePagesService();
