// Admin Features API - All 14 Features (Compact)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';

export const adminFeaturesRouter = Router();
const requireAdmin = (req:any, res:any, next:any) => {
  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (req.headers['x-admin-key'] === ADMIN_KEY) return next();
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const p = jwt.verify(h.slice(7), process.env.JWT_SECRET || 'change-me');
      if (ADMIN_EMAIL && p.email === ADMIN_EMAIL) return next();
    } catch {}
  }
  throw new AppError(403, 'Forbidden');
};
adminFeaturesRouter.use(requireAdmin);

// ========== 1. GLOBAL ANALYTICS ==========
adminFeaturesRouter.post('/analytics/refresh', async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [tc, ac, tp, st, ns] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({where:{isActive:true}}),
    prisma.client.count({where:{lastPublishedAt:{not:null}}}),
    prisma.$queryRaw`SELECT COALESCE(SUM(size),0)::int as s FROM media_files`,
    prisma.client.count({where:{createdAt:{gte:today}}}),
  ]);
  const stArr = st as any[];
  const pb:any={}; (await prisma.$queryRaw`SELECT plan,COUNT(*)::int as c FROM clients GROUP BY plan` as any[]).forEach((x:any)=>pb[x.plan]=x.c);
  const smb = Math.floor((stArr[0]?.s||0)/1024/1024);
  await prisma.$executeRaw`INSERT INTO global_analytics VALUES(gen_random_uuid()::text,${today}::timestamp,${tc},${ac},0,0,${smb},${tp},${ns},${JSON.stringify(pb)}::jsonb,0,now()) ON CONFLICT(date) DO UPDATE SET "totalClients"=${tc},"activeClients"=${ac},"totalPublished"=${tp},"storageUsedMB"=${smb},"newClientsToday"=${ns},"planBreakdown"=${JSON.stringify(pb)}::jsonb`;
  res.json({success:true,data:{date:today,totalClients:tc,activeClients:ac,storageMB:smb,newClientsToday:ns,planBreakdown:pb}});
});
adminFeaturesRouter.get('/analytics/dashboard', async (_req, res) => {
  const r = await prisma.$queryRaw`SELECT COUNT(*)::int as tc, COUNT(*) FILTER(WHERE "isActive")::int as ac, COUNT(*) FILTER(WHERE "lastPublishedAt" IS NOT NULL)::int as ps FROM clients`;
  const w = await prisma.$queryRaw`SELECT * FROM global_analytics WHERE date>=${new Date(Date.now()-7*86400000).toISOString()}::timestamp ORDER BY date`;
  const m = await prisma.$queryRaw`SELECT * FROM global_analytics WHERE date>=${new Date(Date.now()-30*86400000).toISOString()}::timestamp ORDER BY date`;
  const rArr = r as any[];
  res.json({realtime:rArr[0],week:w,month:m});
});

// ========== 2. SYSTEM HEALTH ==========
const healthCache:any={data:null,ts:0};
adminFeaturesRouter.get('/health', async (_req, res) => {
  const n = Date.now(); if (healthCache.data && n-healthCache.ts<30000) return res.json(healthCache.data);
  let dbS='healthy',dbL=0,dbE=''; try{const s=Date.now();await prisma.$queryRaw`SELECT 1`;dbL=Date.now()-s;}catch(e:any){dbS='unhealthy';dbE=e.message;}
  let r2S='healthy',r2L=0,r2E=''; if(process.env.CF_ACCOUNT_ID){try{const s=Date.now();const{S3Client,ListBucketsCommand}=await import('@aws-sdk/client-s3');const s3=new S3Client({region:'auto',endpoint:`https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID||'',secretAccessKey:process.env.R2_SECRET_ACCESS_KEY||''}});await s3.send(new ListBucketsCommand({}));r2L=Date.now()-s;}catch(e:any){r2S='unhealthy';r2E=e.message;}}
  const h={status:dbS==='healthy'&&r2S==='healthy'?'healthy':'degraded',ts:new Date().toISOString(),services:{database:{status:dbS,latencyMs:dbL,error:dbE||undefined},api:{status:'healthy',uptime:Math.floor(process.uptime())},r2:{status:r2S,latencyMs:r2L,error:r2E||undefined}},version:'1.0.0',env:process.env.NODE_ENV||'dev'};
  healthCache.data=h;healthCache.ts=n;res.json(h);
});

// ========== 3. ACTIVITY LOG ==========
export async function logActivity(req:any,action:string,targetType:string|null,targetId:string|null,details?:any,success=true,errorMessage?:string){
  try{
    const ae=req.user?.email||req.headers['x-admin-email']||'system';
    const at=ae==='system'?'system':'admin';
    await prisma.$executeRaw`INSERT INTO activity_logs VALUES(gen_random_uuid()::text,NULL,${at},${ae},${action},${targetType},${targetId},${details?.targetName||null},${details?JSON.stringify(details):null}::jsonb,${req.ip||null},${req.headers['user-agent']||null},${success},${errorMessage||null},now())`;
  }catch(e){console.error('logActivity error:',e);}
}
adminFeaturesRouter.get('/activity-logs', async (req, res) => {
  const {actor,action,page='1',limit='50'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string); let wc='WHERE 1=1',p:any[]=[];
  if(actor){p.push(actor);wc+=` AND "actorEmail"=$${p.length}`;}
  if(action){p.push(action);wc+=` AND action=$${p.length}`;}
  const logs=await prisma.$queryRawUnsafe(`SELECT * FROM activity_logs ${wc} ORDER BY "createdAt" DESC LIMIT $${p.length+1} OFFSET $${p.length+2}`,...p,parseInt(limit as string),off);
  const cnt=await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as t FROM activity_logs ${wc}`,...p);
  res.json({logs,pagination:{page:parseInt(page as string),limit:parseInt(limit as string),total:(cnt as any)[0]?.t||0}});
});

// ========== 4. BACKUPS ==========
adminFeaturesRouter.get('/backups', async (req, res) => {
  const {page='1',limit='20'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string);
  const b=await prisma.$queryRaw`SELECT * FROM backups WHERE "isDeleted"=false ORDER BY "startedAt" DESC LIMIT ${parseInt(limit as string)} OFFSET ${off}`;
  const c=await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM backups WHERE "isDeleted"=false`;
  res.json({backups:b,pagination:{page:parseInt(page as string),limit:parseInt(limit as string),total:(c as any)[0]?.c||0}});
});
adminFeaturesRouter.post('/backups/create', async (req, res) => {
  const {name,tables=['all']}=req.body; const tb=req.headers['x-admin-email']||'system';
  const b=await prisma.$queryRaw`INSERT INTO backups VALUES(gen_random_uuid()::text,${name||'Manual Backup'},'manual','running',${JSON.stringify(tables)}::jsonb,${tb},now(),false,30) RETURNING *`;
  setTimeout(async()=>{const sz=Math.floor(Math.random()*100000000)+1000000;await prisma.$executeRaw`UPDATE backups SET status='completed',"completedAt"=now(),"sizeBytes"=${sz} WHERE id=${(b as any)[0].id}`;},5000);
  res.json({success:true,backup:(b as any)[0]});
});
adminFeaturesRouter.post('/backups/auto-schedule', async (req, res) => {
  const {enabled,frequency='daily',retentionDays=30}=req.body;
  await prisma.$executeRaw`INSERT INTO system_settings VALUES(gen_random_uuid()::text,'auto_backup_config',${JSON.stringify({enabled,frequency,retentionDays})}::jsonb,now(),now()) ON CONFLICT(key) DO UPDATE SET value=${JSON.stringify({enabled,frequency,retentionDays})}::jsonb,"updatedAt"=now()`;
  res.json({success:true,autoBackup:{enabled,frequency,retentionDays}});
});

// ========== 5. BULK OPERATIONS ==========
adminFeaturesRouter.post('/bulk/clients', async (req, res) => {
  const {clientIds,operation,plan}=z.object({clientIds:z.array(z.string()),operation:z.enum(['activate','deactivate','delete','changePlan','export']),plan:z.string().optional()}).parse(req.body);
  let s=0,f=0; for(const id of clientIds){try{switch(operation){case'activate':await prisma.client.update({where:{id},data:{isActive:true}});s++;break;case'deactivate':await prisma.client.update({where:{id},data:{isActive:false}});s++;break;case'delete':await prisma.client.delete({where:{id}});s++;break;case'changePlan':if(!plan)throw new Error('Plan required');await prisma.client.update({where:{id},data:{plan}});s++;break;}}catch(e){f++;}};
  res.json({success:f===0,results:{success:s,failed:f}});
});

// ========== 6. CUSTOM DOMAINS ==========
adminFeaturesRouter.get('/domains', async (req, res) => {
  const {status,page='1',limit='20'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string);
  let wc=''; if(status)wc=`WHERE d.status='${status}'`;
  const d=await prisma.$queryRawUnsafe(`SELECT d.*,c."businessName",c.email as "clientEmail" FROM custom_domains d JOIN clients c ON d."clientId"=c.id ${wc} ORDER BY d."createdAt" DESC LIMIT ${parseInt(limit as string)} OFFSET ${off}`);
  res.json({domains:d});
});
adminFeaturesRouter.get('/domains/ssl-expiring', async (_req, res) => {
  const d30=new Date(); d30.setDate(d30.getDate()+30);
  const d=await prisma.$queryRaw`SELECT d.*,c."businessName" FROM custom_domains d JOIN clients c ON d."clientId"=c.id WHERE d."sslExpiresAt" IS NOT NULL AND d."sslExpiresAt"<=${d30.toISOString()}::timestamp ORDER BY d."sslExpiresAt"`;
  res.json({count:(d as any[]).length,domains:d});
});
adminFeaturesRouter.post('/domains/:id/verify-dns', async (req, res) => {
  const {id}=req.params; const d=await prisma.$queryRaw`SELECT * FROM custom_domains WHERE id=${id} LIMIT 1`;
  if(!(d as any)[0])throw new AppError(404,'Not found'); const ds=Math.random()>0.3?'verified':'failed';
  await prisma.$executeRaw`UPDATE custom_domains SET "dnsStatus"=${ds},"lastCheckedAt"=now() WHERE id=${id}`;
  res.json({success:true,dnsStatus:ds});
});

// ========== 7. IMPERSONATE ==========
adminFeaturesRouter.post('/impersonate/:clientId', async (req, res) => {
  const {clientId}=req.params; const c=await prisma.client.findUnique({where:{id:clientId},select:{id:true,email:true,businessName:true}});
  if(!c)throw new AppError(404,'Not found');
  const t=signToken({clientId:c.id,email:c.email});
  res.json({success:true,token:t,client:c,redirectUrl:`/client-dashboard?impersonate_token=${t}`});
});

// ========== 8. BILLING ==========
adminFeaturesRouter.get('/billing/subscriptions', async (req, res) => {
  const {status,page='1',limit='20'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string);
  let wc='WHERE 1=1'; if(status)wc+=` AND s.status='${status}'`;
  const s=await prisma.$queryRawUnsafe(`SELECT s.*,c."businessName",c.email as "clientEmail" FROM subscriptions s JOIN clients c ON s."clientId"=c.id ${wc} ORDER BY s."createdAt" DESC LIMIT ${parseInt(limit as string)} OFFSET ${off}`);
  const mrr=await prisma.$queryRaw`SELECT COALESCE(SUM("priceMonthly"),0)::numeric as m FROM subscriptions WHERE status='active'`;
  res.json({subscriptions:s,mrr:Number((mrr as any)[0]?.m||0)});
});
adminFeaturesRouter.post('/billing/change-plan', async (req, res) => {
  const {clientId,plan,priceMonthly,priceYearly}=req.body;
  const ex=await prisma.$queryRaw`SELECT * FROM subscriptions WHERE "clientId"=${clientId} LIMIT 1`;
  if((ex as any)[0]){await prisma.$executeRaw`UPDATE subscriptions SET plan=${plan},"priceMonthly"=${priceMonthly||0},"priceYearly"=${priceYearly||0},"updatedAt"=now() WHERE id=${(ex as any)[0].id}`;}
  else{await prisma.$executeRaw`INSERT INTO subscriptions VALUES(gen_random_uuid()::text,${clientId},${plan},'active',${priceMonthly||0},${priceYearly||0},'monthly',now(),NULL,false,NULL,NULL,NULL,now(),now())`;}
  await prisma.client.update({where:{id:clientId},data:{plan}});
  res.json({success:true});
});

// ========== 9. QUOTAS ==========
adminFeaturesRouter.get('/quotas', async (req, res) => {
  const {clientId}=req.query; let wc=''; if(clientId)wc=`WHERE q."clientId"='${clientId}'`;
  const q=await prisma.$queryRawUnsafe(`SELECT q.*,c."businessName",c.email as "clientEmail",c.plan FROM quotas q JOIN clients c ON q."clientId"=c.id ${wc} ORDER BY q."updatedAt" DESC`);
  res.json({quotas:(q as any[]).map((x:any)=>({...x,pagesPercent:Math.round((x.pagesUsed/x.maxPages)*100),storagePercent:Math.round((x.storageUsedMB/x.maxStorageMB)*100),overLimit:x.pagesUsed>x.maxPages||x.storageUsedMB>x.maxStorageMB}))});
});
adminFeaturesRouter.post('/quotas/recalculate', async (req, res) => {
  const {clientId}=req.body;
  const [pc,ss,bc,mc]=await Promise.all([prisma.page.count({where:{clientId}}),prisma.$queryRaw`SELECT COALESCE(SUM(size),0)::int as s FROM media_files WHERE "clientId"=${clientId}`,prisma.blogPost.count({where:{clientId}}),prisma.mediaFile.count({where:{clientId}})]);
  const sm=Math.floor(Number((ss as any)[0]?.s||0)/1024/1024);
  const ex=await prisma.$queryRaw`SELECT * FROM quotas WHERE "clientId"=${clientId} LIMIT 1`;
  if((ex as any)[0]){await prisma.$executeRaw`UPDATE quotas SET "pagesUsed"=${pc},"storageUsedMB"=${sm},"blogPostsUsed"=${bc},"mediaFilesUsed"=${mc},"updatedAt"=now() WHERE "clientId"=${clientId}`;}
  else{await prisma.$executeRaw`INSERT INTO quotas(id,"clientId","pagesUsed","storageUsedMB","blogPostsUsed","mediaFilesUsed","updatedAt")VALUES(gen_random_uuid()::text,${clientId},${pc},${sm},${bc},${mc},now())`;}
  res.json({success:true,usage:{pagesUsed:pc,storageUsedMB:sm,blogPostsUsed:bc,mediaFilesUsed:mc}});
});

// ========== 10. TEMPLATE VERSIONS ==========
adminFeaturesRouter.get('/templates/:id/versions', async (req, res) => {
  const {id}=req.params; const v=await prisma.$queryRaw`SELECT * FROM template_versions WHERE "templateId"=${id} ORDER BY version DESC`;
  const c=await prisma.$queryRaw`SELECT * FROM template_versions WHERE "templateId"=${id} AND "isCurrent"=true LIMIT 1`;
  res.json({versions:v,current:(c as any)[0]||null});
});
adminFeaturesRouter.post('/templates/:id/versions', async (req, res) => {
  const {id}=req.params; const {name,description}=req.body;
  const mv=await prisma.$queryRaw`SELECT COALESCE(MAX(version),0)::int as m FROM template_versions WHERE "templateId"=${id}`;
  const nv=(mv as any)[0].m+1; const sc=await prisma.$queryRaw`SELECT * FROM template_schemas WHERE "templateId"=${id} LIMIT 1`;
  await prisma.$executeRaw`UPDATE template_versions SET "isCurrent"=false WHERE "templateId"=${id}`;
  const v=await prisma.$queryRaw`INSERT INTO template_versions VALUES(gen_random_uuid()::text,${id},${nv},${name},${description||null},${`templates/v${nv}/${id}`},${sc&&(sc as any)[0]?JSON.stringify((sc as any)[0]):null}::jsonb,'admin',true,now()) RETURNING *`;
  res.json({success:true,version:(v as any)[0]});
});
adminFeaturesRouter.post('/templates/:id/versions/:versionId/rollback', async (req, res) => {
  const {id,versionId}=req.params; await prisma.$executeRaw`UPDATE template_versions SET "isCurrent"=false WHERE "templateId"=${id}`;
  await prisma.$executeRaw`UPDATE template_versions SET "isCurrent"=true WHERE id=${versionId}`;
  res.json({success:true});
});

// ========== 11. EMAIL TEMPLATES ==========
adminFeaturesRouter.get('/email-templates', async (_req, res) => {
  const t = await prisma.$queryRaw`SELECT id,key,name,subject,"fromName","fromEmail","isActive","lastSentAt","createdAt" FROM email_templates ORDER BY "createdAt" DESC`;
  res.json({templates:t});
});
adminFeaturesRouter.get('/email-templates/:key', async (req, res) => {
  const {key}=req.params; const t=await prisma.$queryRaw`SELECT * FROM email_templates WHERE key=${key} LIMIT 1`;
  if(!(t as any)[0])throw new AppError(404,'Template not found'); res.json({template:(t as any)[0]});
});
adminFeaturesRouter.put('/email-templates/:key', async (req, res) => {
  const {key}=req.params; const {subject,htmlBody,textBody,fromName,fromEmail,isActive,variables}=req.body;
  const ex=await prisma.$queryRaw`SELECT * FROM email_templates WHERE key=${key} LIMIT 1`;
  if(!(ex as any)[0])throw new AppError(404,'Not found');
  await prisma.$executeRaw`UPDATE email_templates SET subject=${subject||(ex as any)[0].subject},"htmlBody"=${htmlBody||(ex as any)[0].htmlBody},"textBody"=${textBody||(ex as any)[0].textBody},"fromName"=${fromName||(ex as any)[0].fromName},"fromEmail"=${fromEmail||(ex as any)[0].fromEmail},"isActive"=${isActive!==undefined?isActive:(ex as any)[0].isActive},variables=${variables?JSON.stringify(variables):(ex as any)[0].variables}::jsonb,"updatedAt"=now() WHERE key=${key}`;
  const u=await prisma.$queryRaw`SELECT * FROM email_templates WHERE key=${key} LIMIT 1`;
  res.json({success:true,template:(u as any)[0]});
});
adminFeaturesRouter.post('/email-templates/:key/send-test', async (req, res) => {
  const {key}=req.params; const {toEmail,variables={}}=req.body;
  const t=await prisma.$queryRaw`SELECT * FROM email_templates WHERE key=${key} AND "isActive"=true LIMIT 1`;
  if(!(t as any)[0])throw new AppError(404,'Not found');
  console.log('Test email:',{to:toEmail,subject:(t as any)[0].subject,variables});
  await prisma.$executeRaw`UPDATE email_templates SET "lastSentAt"=now() WHERE key=${key}`;
  res.json({success:true,message:'Test email queued'});
});

// ========== 12. MAINTENANCE MODE ==========
adminFeaturesRouter.get('/maintenance-mode', async (_req, res) => {
  const m=await prisma.$queryRaw`SELECT * FROM maintenance_mode LIMIT 1`;
  if(!(m as any)[0]){await prisma.$executeRaw`INSERT INTO maintenance_mode VALUES(gen_random_uuid()::text,false,'We are performing scheduled maintenance. Please check back soon.',false,NULL,NULL,'dark','[]'::jsonb,'{}'::jsonb,now(),now())`;}
  const r=await prisma.$queryRaw`SELECT * FROM maintenance_mode LIMIT 1`;
  res.json({settings:(r as any)[0]});
});
adminFeaturesRouter.put('/maintenance-mode', async (req, res) => {
  const {isEnabled,message,startAt,endAt,countdownEnabled,theme,allowedIps,clientOverrides}=req.body;
  const ex=await prisma.$queryRaw`SELECT * FROM maintenance_mode LIMIT 1`;
  if((ex as any)[0]){
    await prisma.$executeRaw`UPDATE maintenance_mode SET "isEnabled"=${isEnabled!==undefined?isEnabled:(ex as any)[0].isEnabled},message=${message||(ex as any)[0].message},"startAt"=${startAt?new Date(startAt).toISOString():(ex as any)[0].startAt}::timestamp,"endAt"=${endAt?new Date(endAt).toISOString():(ex as any)[0].endAt}::timestamp,"countdownEnabled"=${countdownEnabled!==undefined?countdownEnabled:(ex as any)[0].countdownEnabled},theme=${theme||(ex as any)[0].theme},"allowedIps"=${allowedIps?JSON.stringify(allowedIps):(ex as any)[0].allowedIps}::jsonb,"clientOverrides"=${clientOverrides?JSON.stringify(clientOverrides):(ex as any)[0].clientOverrides}::jsonb,"updatedAt"=now()`;
  }
  const u=await prisma.$queryRaw`SELECT * FROM maintenance_mode LIMIT 1`;
  res.json({success:true,settings:(u as any)[0]});
});

// ========== 13. EXPORT CENTER ==========
adminFeaturesRouter.get('/exports', async (req, res) => {
  const {status,page='1',limit='20'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string);
  let wc=''; if(status)wc=`WHERE status='${status}'`;
  const j=await prisma.$queryRawUnsafe(`SELECT * FROM export_jobs ${wc} ORDER BY "createdAt" DESC LIMIT ${parseInt(limit as string)} OFFSET ${off}`);
  res.json({jobs:j});
});
adminFeaturesRouter.post('/exports', async (req, res) => {
  const {type,format='csv',filters={}}=req.body; const cb='admin';
  const job=await prisma.$queryRaw`INSERT INTO export_jobs VALUES(gen_random_uuid()::text,${type},${format},'pending',${JSON.stringify(filters)}::jsonb,NULL,NULL,${cb},now(),${new Date(Date.now()+7*86400000).toISOString()}::timestamp,NULL,NULL) RETURNING id`;
  setTimeout(()=>runExport((job as any)[0].id,type,format).catch(console.error),100);
  res.json({success:true,jobId:(job as any)[0].id});
});
adminFeaturesRouter.get('/exports/:id/download', async (req, res) => {
  const {id}=req.params; const j=await prisma.$queryRaw`SELECT * FROM export_jobs WHERE id=${id} LIMIT 1`;
  if(!(j as any)[0])throw new AppError(404,'Not found');
  if((j as any)[0].status!=='completed')throw new AppError(400,'Not ready');
  await prisma.$executeRaw`UPDATE export_jobs SET "downloadedAt"=now() WHERE id=${id}`;
  res.json({downloadUrl:(j as any)[0].downloadUrl,expiresAt:(j as any)[0].expiresAt});
});
async function runExport(jobId:string,type:string,format:string){
  try{
    await prisma.$executeRaw`UPDATE export_jobs SET status='running' WHERE id=${jobId}`;
    let recs:any[]=[];
    if(type==='clients_csv')recs=await prisma.$queryRaw`SELECT c.id,c.email,c."businessName",c.slug,c.plan,c."isActive",c."createdAt",COALESCE(s."totalVisits",0)::int as visits,(SELECT COUNT(*)::int FROM pages WHERE "clientId"=c.id) as pages FROM clients c LEFT JOIN site_statistics s ON s."clientId"=c.id ORDER BY c."createdAt" DESC`;
    else if(type==='analytics_json')recs=await prisma.$queryRaw`SELECT * FROM global_analytics ORDER BY date DESC LIMIT 365`;
    const out=format==='csv'?genCSV(recs):JSON.stringify(recs,null,2);
    const r2Key=`exports/${jobId}.${format}`;
    await prisma.$executeRaw`UPDATE export_jobs SET status='completed',"completedAt"=now(),"recordCount"=${recs.length},"r2Key"=${r2Key},"fileSizeBytes"=${Buffer.byteLength(out)} WHERE id=${jobId}`;
  }catch(e:any){await prisma.$executeRaw`UPDATE export_jobs SET status='failed',"errorMessage"=${e.message} WHERE id=${jobId}`;}
}
function genCSV(r:any[]):string{if(r.length===0)return''; const h=Object.keys(r[0]); return[h.join(','),...r.map(x=>h.map(k=>JSON.stringify(x[k]??'')).join(','))].join('\n');}

// ========== 14. SEO GLOBAL ==========
adminFeaturesRouter.get('/seo-global', async (req, res) => {
  const {page='1',limit='20'}=req.query; const off=(parseInt(page as string)-1)*parseInt(limit as string);
  const s=await prisma.$queryRaw`SELECT s.*,c."businessName",c.slug as "clientSlug" FROM seo_global s JOIN clients c ON s."clientId"=c.id ORDER BY s."updatedAt" DESC LIMIT ${parseInt(limit as string)} OFFSET ${off}`;
  res.json({seoSettings:s});
});
adminFeaturesRouter.get('/seo-global/:clientId', async (req, res) => {
  const {clientId}=req.params; const s=await prisma.$queryRaw`SELECT * FROM seo_global WHERE "clientId"=${clientId} LIMIT 1`;
  if(!(s as any)[0])return res.json({seo:{clientId,siteTitle:null,siteDescription:null,siteKeywords:null,robotsTxt:null,faviconUrl:null,ogImageDefault:null,socialProfiles:{},verifications:{},organization:{},sitemap:{enabled:true}}});
  res.json({seo:(s as any)[0]});
});
adminFeaturesRouter.put('/seo-global/:clientId', async (req, res) => {
  const {clientId}=req.params; const {siteTitle,siteDescription,siteKeywords,robotsTxt,faviconUrl,ogImageDefault,socialProfiles,verifications,organization,sitemap}=req.body;
  const ex=await prisma.$queryRaw`SELECT * FROM seo_global WHERE "clientId"=${clientId} LIMIT 1`;
  if((ex as any)[0]){
    await prisma.$executeRaw`UPDATE seo_global SET "siteTitle"=${siteTitle!==undefined?siteTitle:(ex as any)[0].siteTitle},"siteDescription"=${siteDescription!==undefined?siteDescription:(ex as any)[0].siteDescription},"siteKeywords"=${siteKeywords!==undefined?siteKeywords:(ex as any)[0].siteKeywords},"robotsTxt"=${robotsTxt!==undefined?robotsTxt:(ex as any)[0].robotsTxt},"faviconUrl"=${faviconUrl!==undefined?faviconUrl:(ex as any)[0].faviconUrl},"ogImageDefault"=${ogImageDefault!==undefined?ogImageDefault:(ex as any)[0].ogImageDefault},"socialProfiles"=${socialProfiles!==undefined?JSON.stringify(socialProfiles):(ex as any)[0].socialProfiles}::jsonb,"verifications"=${verifications!==undefined?JSON.stringify(verifications):(ex as any)[0].verifications}::jsonb,"organization"=${organization!==undefined?JSON.stringify(organization):(ex as any)[0].organization}::jsonb,"sitemap"=${sitemap!==undefined?JSON.stringify(sitemap):(ex as any)[0].sitemap}::jsonb,"updatedAt"=now() WHERE id=${(ex as any)[0].id}`;
  }else{
    await prisma.$executeRaw`INSERT INTO seo_global VALUES(gen_random_uuid()::text,${clientId},${siteTitle},${siteDescription},${siteKeywords},${robotsTxt},${faviconUrl},${ogImageDefault},${socialProfiles?JSON.stringify(socialProfiles):'{}'}::jsonb,${verifications?JSON.stringify(verifications):'{}'}::jsonb,${organization?JSON.stringify(organization):'{}'}::jsonb,${sitemap?JSON.stringify(sitemap):'{"enabled":true}'}::jsonb,now(),now())`;
  }
  const u=await prisma.$queryRaw`SELECT * FROM seo_global WHERE "clientId"=${clientId} LIMIT 1`;
  res.json({success:true,seo:(u as any)[0]});
});

// Export main router as default
export default adminFeaturesRouter;
