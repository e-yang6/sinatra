import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatRequest {
  message: string;
  context?: {
    bpm?: number;
    isPlaying?: boolean;
    isRecording?: boolean;
    selectedInstrument?: string;
    key?: string;
    scale?: string;
    quantize?: string;
    tracks?: Array<{
      id: string;
      name: string;
      instrument?: string;
      isMuted: boolean;
    }>;
  };
}

interface ChatAction {
  type: string;
  instrument?: string;
  value?: number;
  command?: string;
  key?: string;
  scale?: string;
  quantize?: string;
  chords?: string[];
  beats_per_chord?: number;
  pattern?: 'block' | 'arpeggiated';
  octave_shift?: number;
  velocity?: number;
}

interface ChatResponse {
  response: string;
  actions: ChatAction[];
}

const SYSTEM_PROMPT = `You are Frank, a music production assistant for Sinatra, a web-based DAW (Digital Audio Workstation). You help users create music, suggest instruments, explain music theory, and can execute commands to control the DAW.

Available instruments: Piano, Electric Piano, Harpsichord, Strings, Violin, Cello, Trumpet, Trombone, French Horn, Flute, Saxophone, Clarinet, Synth, Synth Pad, Synth Lead, Bass, Acoustic Bass, Guitar, Electric Guitar, Organ, Raw Audio.

Available keys: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
Available scales: chromatic, major, minor
Available quantize options: off, 1/4, 1/8, 1/16, 1/32

Supported chord types: major (C, Cmaj), minor (Cm, Cmin), 7th (C7), maj7 (Cmaj7), min7 (Cm7), dim (Cdim), aug (Caug), sus2 (Csus2), sus4 (Csus4), add9 (Cadd9), 6 (C6), 9 (C9), power (C5), and more. Any root note (C, C#, Db, D, etc.) can be combined with any quality.

When the user asks you to perform an action, include a JSON action block in your response wrapped in \`\`\`action tags. Examples:

To add a track with an instrument:
\`\`\`action
{"type": "ADD_TRACK", "instrument": "Piano"}
\`\`\`

To set BPM:
\`\`\`action
{"type": "SET_BPM", "value": 120}
\`\`\`

To change the current track's instrument:
\`\`\`action
{"type": "CHANGE_INSTRUMENT", "instrument": "Strings"}
\`\`\`

To control transport (play/stop/record):
\`\`\`action
{"type": "TRANSPORT", "command": "play"}
\`\`\`

To set the musical key:
\`\`\`action
{"type": "SET_KEY", "key": "C"}
\`\`\`

To set the scale type:
\`\`\`action
{"type": "SET_SCALE", "scale": "major"}
\`\`\`

To set quantization:
\`\`\`action
{"type": "SET_QUANTIZE", "quantize": "1/8"}
\`\`\`

To generate a chord progression on a new track:
\`\`\`action
{"type": "GENERATE_CHORDS", "chords": ["C", "Am", "F", "G"], "instrument": "Piano", "beats_per_chord": 4, "pattern": "block"}
\`\`\`
- "chords" is REQUIRED: an array of chord symbols (e.g. "Cmaj7", "Am", "Dm7", "G7", "F#m", "Bb", "Edim")
- "instrument" is optional (default: "Piano") — pick the best instrument for the mood
- "beats_per_chord" is optional (default: 4) — how many beats each chord lasts
- "pattern" is optional: "block" (sustained chords, default) or "arpeggiated" (broken/rolled chords)
- "octave_shift" is optional (default: 0) — shift up (+1, +2) or down (-1, -2) octaves
- "velocity" is optional (default: 80) — how hard the notes are played (1-127)

IMPORTANT for chord progressions:
- When the user asks for chords, a chord progression, harmony, or accompaniment, ALWAYS use GENERATE_CHORDS.
- Suggest an appropriate instrument if the user doesn't specify one (e.g. Piano for pop, Strings for cinematic, Guitar for acoustic).
- Use the project's current BPM (from context) — do NOT include "bpm" in the action, the frontend will use the current BPM automatically.
- Be creative with suggestions! Offer common progressions (I-V-vi-IV, ii-V-I, 12-bar blues) or customize based on the user's description.
- If the user says something vague like "give me something sad", suggest a minor-key progression with an appropriate instrument.
- You can generate multiple GENERATE_CHORDS actions if the user wants multiple parts (e.g. a piano chord progression AND a bass line).

Always be helpful, concise, and musically knowledgeable. If the user provides project context (tracks, BPM, etc.), use it to give relevant suggestions.`;

// In-memory conversation history (per deployment - will reset on cold start)
// In production, consider using Vercel KV or similar for persistence
const conversationHistory: Array<{ role: string; content: string }> = [];

function buildContextMessage(context?: ChatRequest['context']): string {
  if (!context) return '';
  
  const parts = ['\n[Current Project State]'];
  
  if (context.bpm !== undefined) {
    parts.push(`- BPM: ${context.bpm}`);
  }
  
  if (context.isPlaying !== undefined) {
    parts.push(`- Playing: ${context.isPlaying ? 'Yes' : 'No'}`);
  }
  
  if (context.isRecording !== undefined) {
    parts.push(`- Recording: ${context.isRecording ? 'Yes' : 'No'}`);
  }
  
  if (context.selectedInstrument) {
    parts.push(`- Selected Instrument: ${context.selectedInstrument}`);
  }
  
  if (context.key) {
    parts.push(`- Key: ${context.key}`);
  }
  
  if (context.scale) {
    parts.push(`- Scale: ${context.scale}`);
  }
  
  if (context.quantize) {
    parts.push(`- Quantize: ${context.quantize}`);
  }
  
  if (context.tracks && Array.isArray(context.tracks)) {
    parts.push(`- Tracks (${context.tracks.length}):`);
    for (const track of context.tracks) {
      const name = track.name || 'Unknown';
      const instrument = track.instrument || 'N/A';
      const muted = track.isMuted ? ' [MUTED]' : '';
      parts.push(`  - ${name} (${instrument})${muted}`);
    }
  }
  
  return parts.join('\n');
}

function parseActions(responseText: string): ChatAction[] {
  const actions: ChatAction[] = [];
  const pattern = /```action\s*\n?(.*?)\n?\s*```/gs;
  const matches = responseText.matchAll(pattern);
  
  for (const match of matches) {
    try {
      const action = JSON.parse(match[1].trim()) as ChatAction;
      if (action.type) {
        actions.push(action);
      }
    } catch (e) {
      // Invalid JSON, skip
      continue;
    }
  }
  
  return actions;
}

function stripActionBlocks(responseText: string): string {
  const pattern = /```action\s*\n?.*?\n?\s*```/gs;
  return responseText.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      response: 'Chat is unavailable: OPENROUTER_API_KEY environment variable is not set.',
      actions: [],
    });
    return;
  }

  const body = req.body as ChatRequest;
  const { message, context } = body;

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Message cannot be empty' });
    return;
  }

  // Build full message with context
  const contextStr = buildContextMessage(context);
  const fullMessage = contextStr ? `${message}\n${contextStr}` : message;

  // Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: fullMessage,
  });

  // Keep history manageable (last 20 exchanges = 40 messages)
  if (conversationHistory.length > 40) {
    conversationHistory.splice(0, conversationHistory.length - 40);
  }

  try {
    // Build messages with system prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000',
        'X-Title': 'Sinatra Music App',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: responseText,
    });

    // Parse actions from response
    const actions = parseActions(responseText);
    const displayText = stripActionBlocks(responseText);

    const chatResponse: ChatResponse = {
      response: displayText,
      actions,
    };

    res.status(200).json(chatResponse);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      response: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}`,
      actions: [],
    });
  }
}
