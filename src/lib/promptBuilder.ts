import type { DialogueLine, Persona } from '@/types';

/**
 * Build the dialogue prompt for the OpenAI API
 */
export function buildDialoguePrompt(
  transcript: string,
  personas: Persona[],
  videoContent: string,
  frameDescriptions: string,
  userGuidance?: string
): Array<{ role: 'system' | 'user'; content: string }> {
  // System prompt to set up the basic instructions
  const systemPrompt = `You are an AI generating engaging and entertaining commentary for videos. 
You will create a dialogue script between the following characters:

${personas.map((p, i) => `${i + 1}. ${p.name}: ${p.style || 'No specific style defined'}`).join('\n')}

The dialogue should be reactions to the video content I'll provide. Make it entertaining, funny, and engaging.
Each character should maintain their defined personality and style throughout.

Output format must be:
CHARACTER_NAME: Dialogue text

Keep each line concise and natural-sounding (15-20 words maximum per line).
Don't narrate actions, just create dialogue as if the characters are watching and reacting to the video in real-time.`;

  // User prompt with the video content
  const userPrompt = `Here's the video content to react to:

TRANSCRIPT:
${transcript}

VIDEO DESCRIPTION:
${videoContent}

VISUAL ELEMENTS:
${frameDescriptions}

${userGuidance ? `ADDITIONAL GUIDANCE: ${userGuidance}` : ''}

Create a dialogue script with the characters reacting to this content. 
Make it entertaining and funny - the characters should have strong opinions and unique perspectives.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Parse the dialogue response from OpenAI into structured DialogueLine objects
 */
export function parseDialogueResponse(response: string): DialogueLine[] {
  if (!response) return [];
  
  const lines = response.split('\n').filter(line => line.trim() !== '');
  const dialogueLines: DialogueLine[] = [];
  
  for (const line of lines) {
    // Use regex to extract speaker and text
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match && match.length >= 3) {
      const [, speaker, text] = match;
      dialogueLines.push({
        speaker: speaker.trim(),
        text: text.trim()
      });
    }
  }
  
  return dialogueLines;
} 