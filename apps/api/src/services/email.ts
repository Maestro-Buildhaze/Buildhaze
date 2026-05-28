// Email service using Resend (free tier: 100 emails/day)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@buildhaze.com';
const FROM_NAME = process.env.FROM_NAME || 'Buildhaze';

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
  fromName?: string;
  fromEmail?: string;
}

export async function sendEmail({
  to,
  template,
  variables = {},
}: {
  to: string;
  template: EmailTemplate;
  variables?: Record<string, string>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Replace variables in template
    let subject = template.subject;
    let htmlBody = template.htmlBody;
    let textBody = template.textBody || '';

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      htmlBody = htmlBody.replace(regex, value);
      textBody = textBody.replace(regex, value);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${template.fromName || FROM_NAME} <${template.fromEmail || FROM_EMAIL}>`,
        to,
        subject,
        html: htmlBody,
        text: textBody || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send bulk emails
export async function sendBulkEmails({
  recipients,
  template,
  variables = {},
}: {
  recipients: string[];
  template: EmailTemplate;
  variables?: Record<string, string>;
}): Promise<{ success: boolean; sent: number; failed: number; errors?: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend has rate limit of 2 emails/second on free tier
  for (const to of recipients) {
    const result = await sendEmail({ to, template, variables });
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${to}: ${result.error}`);
    }
    // Rate limiting - wait 500ms between emails
    if (recipients.length > 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { success: failed === 0, sent, failed, errors: errors.length > 0 ? errors : undefined };
}

// Get email provider status
export function getEmailProviderStatus(): { configured: boolean; provider: string } {
  return {
    configured: !!RESEND_API_KEY,
    provider: 'Resend',
  };
}
