export async function cfAIChat(
  messages: { role: string; content: string }[],
  maxTokens = 400,
): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_AI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, max_tokens: maxTokens, stream: false }),
    },
  );
  const data = (await res.json()) as any;
  if (!data.success) throw new Error(data.errors?.[0]?.message ?? 'CF AI error');
  return data.result.response as string;
}
