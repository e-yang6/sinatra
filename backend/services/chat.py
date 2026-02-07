"""
Chat service — OpenRouter AI integration for Sinatra.
Handles conversation with project context and action parsing.
"""

import os
import re
import json
import httpx
from typing import Optional

# --- Configuration ---
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are Frank, a music production assistant for Sinatra, a web-based DAW (Digital Audio Workstation). You help users create music, suggest instruments, explain music theory, and can execute commands to control the DAW.

Available instruments: Piano, Electric Piano, Harpsichord, Strings, Violin, Cello, Trumpet, Trombone, French Horn, Flute, Saxophone, Clarinet, Synth, Synth Pad, Synth Lead, Bass, Acoustic Bass, Guitar, Electric Guitar, Organ, Raw Audio.

Available keys: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
Available scales: chromatic, major, minor
Available quantize options: off, 1/4, 1/8, 1/16, 1/32

Supported chord types: major (C, Cmaj), minor (Cm, Cmin), 7th (C7), maj7 (Cmaj7), min7 (Cm7), dim (Cdim), aug (Caug), sus2 (Csus2), sus4 (Csus4), add9 (Cadd9), 6 (C6), 9 (C9), power (C5), and more. Any root note (C, C#, Db, D, etc.) can be combined with any quality.

When the user asks you to perform an action, include a JSON action block in your response wrapped in ```action tags. Examples:

To add a track with an instrument:
```action
{"type": "ADD_TRACK", "instrument": "Piano"}
```

To set BPM:
```action
{"type": "SET_BPM", "value": 120}
```

To change the current track's instrument:
```action
{"type": "CHANGE_INSTRUMENT", "instrument": "Strings"}
```

To control transport (play/stop/record):
```action
{"type": "TRANSPORT", "command": "play"}
```

To set the musical key:
```action
{"type": "SET_KEY", "key": "C"}
```

To set the scale type:
```action
{"type": "SET_SCALE", "scale": "major"}
```

To set quantization:
```action
{"type": "SET_QUANTIZE", "quantize": "1/8"}
```

To generate a chord progression on a new track:
```action
{"type": "GENERATE_CHORDS", "chords": ["C", "Am", "F", "G"], "instrument": "Piano", "beats_per_chord": 4, "pattern": "block"}
```
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

Always be helpful, concise, and musically knowledgeable. If the user provides project context (tracks, BPM, etc.), use it to give relevant suggestions."""

# --- In-memory conversation history ---
conversation_history: list[dict] = []


def _build_context_message(context: Optional[dict]) -> str:
    """Build a context string from the project state."""
    if not context:
        return ""
    
    parts = ["\n[Current Project State]"]
    
    if "bpm" in context:
        parts.append(f"- BPM: {context['bpm']}")
    
    if "isPlaying" in context:
        parts.append(f"- Playing: {'Yes' if context['isPlaying'] else 'No'}")
    
    if "isRecording" in context:
        parts.append(f"- Recording: {'Yes' if context['isRecording'] else 'No'}")
    
    if "selectedInstrument" in context:
        parts.append(f"- Selected Instrument: {context['selectedInstrument']}")
    
    if "key" in context:
        parts.append(f"- Key: {context['key']}")
    
    if "scale" in context:
        parts.append(f"- Scale: {context['scale']}")
    
    if "quantize" in context:
        parts.append(f"- Quantize: {context['quantize']}")
    
    if "tracks" in context and isinstance(context["tracks"], list):
        parts.append(f"- Tracks ({len(context['tracks'])}):")
        for track in context["tracks"]:
            name = track.get("name", "Unknown")
            instrument = track.get("instrument", "N/A")
            muted = " [MUTED]" if track.get("isMuted") else ""
            parts.append(f"  - {name} ({instrument}){muted}")
    
    return "\n".join(parts)


def parse_actions(response_text: str) -> list[dict]:
    """Extract action blocks from the response text."""
    actions = []
    pattern = r'```action\s*\n?(.*?)\n?\s*```'
    matches = re.findall(pattern, response_text, re.DOTALL)
    
    for match in matches:
        try:
            action = json.loads(match.strip())
            if "type" in action:
                actions.append(action)
        except json.JSONDecodeError:
            continue
    
    return actions


def strip_action_blocks(response_text: str) -> str:
    """Remove action blocks from the response text for display."""
    pattern = r'```action\s*\n?.*?\n?\s*```'
    cleaned = re.sub(pattern, '', response_text, flags=re.DOTALL)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def chat(message: str, context: Optional[dict] = None) -> dict:
    """
    Send a message to OpenRouter and get a response.
    Returns { "response": str, "actions": list[dict] }
    """
    if not OPENROUTER_API_KEY:
        return {
            "response": "Chat is unavailable: OPENROUTER_API_KEY environment variable is not set.",
            "actions": [],
        }
    
    # Build the user message with context
    full_message = message
    context_str = _build_context_message(context)
    if context_str:
        full_message = f"{message}\n{context_str}"
    
    # Add to conversation history
    conversation_history.append({
        "role": "user",
        "content": full_message,
    })
    
    # Keep history manageable (last 20 exchanges)
    if len(conversation_history) > 40:
        conversation_history[:] = conversation_history[-40:]
    
    try:
        # Build messages with system prompt
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *conversation_history,
        ]
        
        # Call OpenRouter API
        response = httpx.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Sinatra Music App",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024,
            },
            timeout=30.0,
        )
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
            raise RuntimeError(error_msg)
        
        data = response.json()
        response_text = data["choices"][0]["message"]["content"] or "I couldn't generate a response."
        
        # Add assistant response to history
        conversation_history.append({
            "role": "assistant",
            "content": response_text,
        })
        
        # Parse actions from response
        actions = parse_actions(response_text)
        display_text = strip_action_blocks(response_text)
        
        return {
            "response": display_text,
            "actions": actions,
        }
    
    except Exception as e:
        error_msg = f"Sorry, I encountered an error: {str(e)}"
        return {
            "response": error_msg,
            "actions": [],
        }


def clear_history():
    """Clear the conversation history."""
    conversation_history.clear()
