/**
 * Cloudflare Pages Deployment Service
 * Deploys templates as live sites on Cloudflare Pages with random subdomains
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
   */
  async deployTemplate(options: DeployOptions): Promise<DeployResult> {
    try {
      const { clientId, businessName, templateId, r2Key, bucketName } = options;

      // Generate unique project name
      const projectName = this.generateProjectName(businessName, clientId);
      const subdomain = `${projectName}.pages.dev`;

      console.log(`Deploying ${businessName} to Cloudflare Pages as ${projectName}...`);

      // 1. Create Pages project
      const project = await this.createProject(projectName);
      if (!project.success) {
        return { success: false, error: project.error };
      }

      // 2. Get template files from R2
      const files = await this.getFilesFromR2(bucketName, r2Key);
      if (!files || files.length === 0) {
        return { success: false, error: 'No files found in R2' };
      }

      // 3. Upload files to Pages (via direct upload API)
      const uploadResult = await this.uploadFiles(projectName, files);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      const liveUrl = uploadResult.deploymentUrl || `https://${subdomain}`;
      
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
   * Upload files to Cloudflare Pages via Direct Upload API
   */
  private async uploadFiles(
    projectName: string,
    files: { path: string; content: Buffer }[]
  ): Promise<{ success: boolean; deploymentUrl?: string; error?: string }> {
    return this.uploadViaWrangler(projectName, files);
  }

  /**
   * Upload using Cloudflare Pages Direct Upload API
   * Correct format: multipart with manifest JSON + individual file parts
   * Ref: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/
   */
  private async uploadViaWrangler(
    projectName: string,
    files: { path: string; content: Buffer }[]
  ): Promise<{ success: boolean; deploymentUrl?: string; error?: string }> {
    try {
      const crypto = await import('crypto');
      const boundary = `----CFPagesBoundary${Date.now().toString(16)}`;
      const parts: Buffer[] = [];

      // Build manifest: { "/path": "hash", ... }
      const manifest: Record<string, string> = {};
      for (const file of files) {
        const hash = crypto.createHash('sha256').update(file.content).digest('hex');
        const filePath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        manifest[filePath] = hash;
      }

      // Part 1: manifest JSON
      const manifestJson = JSON.stringify(manifest);
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="manifest"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${manifestJson}\r\n`,
        'utf-8'
      ));

      // Parts 2+: each file keyed by its hash
      for (const file of files) {
        const hash = crypto.createHash('sha256').update(file.content).digest('hex');
        const header =
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${hash}"; filename="${file.path}"\r\n` +
          `Content-Type: application/octet-stream\r\n\r\n`;
        parts.push(Buffer.from(header, 'utf-8'));
        parts.push(file.content);
        parts.push(Buffer.from('\r\n', 'utf-8'));
      }

      parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
      const body = Buffer.concat(parts);

      console.log(`Uploading ${files.length} files to CF Pages project ${projectName}:`);
      for (const f of files) console.log(`  - /${f.path} (${f.content.length} bytes)`);

      const deployResponse = await fetch(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: body,
        }
      );

      const deployData = await deployResponse.json() as any;

      if (!deployResponse.ok) {
        const errMsg = deployData.errors?.[0]?.message || JSON.stringify(deployData.errors);
        console.error('CF Pages deploy error:', errMsg);
        return { success: false, error: errMsg };
      }

      console.log(`CF Pages deployment successful! URL: ${deployData.result?.url}`);
      // Use the canonical project URL (not the deployment hash URL)
      // deployData.result.url = "https://hash.project-name.pages.dev" (preview)
      // We want:                "https://project-name.pages.dev"       (live)
      const url = `https://${projectName}.pages.dev`;
      console.log(`Live site URL: ${url}`);
      return { success: true, deploymentUrl: url };
    } catch (error: any) {
      return { success: false, error: error.message };
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
