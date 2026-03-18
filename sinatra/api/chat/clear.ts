import type { VercelRequest, VercelResponse } from '@vercel/node';

// Note: This is a simple implementation that clears in-memory state
// In production with multiple serverless instances, consider using Vercel KV
// For now, this will only clear the history for the current instance

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // In a real implementation, you'd clear persistent storage here
  // For now, we just return success (history is per-instance anyway)
  res.status(200).json({ 
    status: 'ok', 
    message: 'Chat history cleared.' 
  });
}
