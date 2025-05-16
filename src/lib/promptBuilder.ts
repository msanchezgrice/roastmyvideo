import { DialogueLine, Persona } from '@/types'; // Ensure Persona from @/types includes style and constraints

const defaultPersonas: Persona[] = [
  { name: 'FabOne', style: 'Witty and insightful.', constraints: 'Keep it clever.', backstory: 'Knows internet culture.'},
  { name: 'FabTwo', style: 'Curious and slightly sarcastic.', constraints: 'Ask probing questions.', backstory: 'Reads too much sci-fi.' },
  { name: 'SageSpeaker', style: 'Wise and thoughtful.', constraints: 'Offer deep insights.', backstory: null },
  { name: 'ExcitableEddie', style: 'Energetic and easily amazed.', constraints: 'React with enthusiasm.', backstory: null },
];

const MAX_SPEAKERS_IN_PROMPT_EXAMPLE = 4; // Max speakers to show in the example dialogue format

export function buildDialoguePrompt(
  transcriptSummary: string,
  personasFromUser: Persona[],
  audioTranscript: string | undefined,
  frameDescriptions: string | undefined, // Added to accept frame descriptions
  userGuidance?: string | undefined // Added to accept user guidance
): Array<{role: 'system' | 'user'; content: string}> {

  let processedPersonasInit = Array.isArray(personasFromUser) ? [...personasFromUser] : [];

  let selectedPersonas: Persona[] = processedPersonasInit.map((p, index) => {
    const defaultP = defaultPersonas[index]; // Assuming defaultPersonas is defined elsewhere or remove if not used
    return {
      name: p?.name || defaultP?.name || `Speaker${index + 1}`,
      // description: p?.description || defaultP?.description || 'A general commentator.', // Description is no longer primary focus
      backstory: (p as any)?.backstory || defaultP?.backstory || 'No specific backstory.',
      style: (p as any)?.style || 'A general speaking style.',
      constraints: (p as any)?.constraints || 'Keep it generally appropriate.',
      // Ensure voice_preference and tags are handled if they are part of Persona type and used by the prompt
      voice_preference: (p as any)?.voice_preference || null,
      tags: (p as any)?.tags || [],
    };
  });

  if (selectedPersonas.length === 0) {
    selectedPersonas = [{
      name: 'Speaker1',
      backstory: 'A general commentator.',
      style: 'Standard speaking style.',
      constraints: 'Keep it PG.',
      voice_preference: null,
      tags: [],
    }];
  }

  // For this prompt structure, we assume the system prompt might be generic or apply to all personas,
  // or be repeated/adapted if the API call is per persona. The provided example implies one system prompt.
  // We will use the first persona for {{CHARACTER_NAME}}, {{BACKSTORY}}, {{STYLE}} for the system prompt example.
  // If multiple personas contribute to one dialogue, this system prompt needs to be more encompassing.
  // For now, let's make a generic system prompt that includes overall instructions and references the user message for specifics.
  
  const mainPersona = selectedPersonas[0]; // Or adapt to iterate/combine if dialogue is for multiple personas in one go

  const systemPromptContent = `You are an expert dialogue writer. Each persona you write for will be detailed in the user message. Adhere to the following general rules:\n` +
  `- Stay in character as defined for each persona.\n` +
  `- Keep all dialogue PG-13, focusing on playful roasting or witty commentary.\n` +
  `- Absolutely no insults related to protected classes.\n` +
  `- Specific constraints for each character will be part of their details in the user message.\n` +
  `- Dialogue should be broken into short lines (max 25 tokens each).\n` +
  `- Label lines like "CHARACTER_NAME_SHORT: ..."\n` +
  `- Insert ellipses (...) or em-dashes (—) for natural pauses.\n` +
  `- End the entire commentary with a single 1-line sign-off relevant to the context.`;

  // Constructing the user prompt part by part
  let userPromptContent = "Watch the attached video frames and condensed transcript:\n---FRAMES_START---\n";
  userPromptContent += `${frameDescriptions || 'No frame descriptions provided at this time.'}\n`;
  userPromptContent += "---FRAMES_END---\n\nTranscript summary:\n";
  userPromptContent += `\"${transcriptSummary}\"\n\n`;
  
  if (userGuidance && userGuidance.trim() !== '') {
    userPromptContent += `User Guidance for this specific commentary:\n${userGuidance.trim()}\n\n`;
  }

  userPromptContent += "Persona details for this dialogue:\n";
  selectedPersonas.forEach(p => {
    const charShort = p.name.replace(/\s+/g, '').substring(0, 10); // Example short name
    userPromptContent += `CHARACTER_NAME: ${p.name}\n`;
    userPromptContent += `CHAR_SHORT: ${charShort}\n`; // For line labeling
    userPromptContent += `BACKSTORY: ${p.backstory}\n`;
    userPromptContent += `STYLE: ${p.style}\n`;
    userPromptContent += `CONSTRAINTS: ${p.constraints}\n---\n`;
  });

  userPromptContent += `\nDeliver a witty commentary ≤400 tokens based on the personas, frames, and transcript.`;

  // The other formatting instructions (short lines, labeling, pauses, sign-off) are in the system prompt.

  // The audioTranscript can be appended to the user prompt if deemed useful supplementary context
  if (audioTranscript && audioTranscript.trim().length > 0) {
    userPromptContent += `\n\nFull Audio Transcript Context (for additional reference only):\n${audioTranscript}\n`;
  }

  console.log('[promptBuilder] System Prompt:', systemPromptContent);
  console.log('[promptBuilder] User Prompt:', userPromptContent);

  return [
    { role: 'system', content: systemPromptContent },
    { role: 'user', content: userPromptContent }
  ];
}

export function parseDialogueResponse(aiResponse: string): DialogueLine[] {
  console.log('[promptBuilder] Parsing AI response:', aiResponse);
  const lines = aiResponse.trim().split('\n');
  const dialogue: DialogueLine[] = [];
  let signOffLine: string | null = null;

  // Attempt to find a line that doesn't start with a typical CHAR_SHORT pattern as the sign-off
  // This is a heuristic. The AI might put the sign-off after a blank line or directly after the last dialogue.

  for (const line of lines) {
    // Regex to match "CHAR_SHORT: Dialogue text"
    // It captures char_short and the text after it.
    const match = line.match(/^([A-Z0-9_]{1,15}):\s*(.*)$/i); 
    if (match && match[1] && match[2]) {
      dialogue.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else if (line.trim() && !signOffLine) {
      // If it doesn't match the speaker format and we haven't found a sign-off yet, assume it might be the sign-off
      // This is imperfect; if the AI includes other non-dialogue lines, they might be caught here.
      // The prompt asks for a 1-line sign-off at the end.
      // We will assume the last non-matching line is the sign-off if multiple non-matching lines exist.
      signOffLine = line.trim();
    }
  }
  
  // If a signOffLine was captured and it was indeed the last line, or the only non-matching line.
  // For simplicity, if we have any dialogue lines and a signOffLine was captured, add it as a special speaker or handle as needed.
  // The current DialogueLine interface only has speaker & text. For a sign-off, we might want to add it as a final line from a generic speaker or a specific one if specified.
  // Let's assume the sign-off can be attributed to the last speaker or a generic "Narrator" for now.
  if (signOffLine && dialogue.length > 0) {
    dialogue.push({ speaker: dialogue[dialogue.length-1].speaker, text: `(Sign-off: ${signOffLine})` });
  } else if (signOffLine) { // If no dialogue lines but a sign-off line was found
    dialogue.push({ speaker: "Commentator", text: signOffLine });
  }

  console.log('[promptBuilder] Parsed dialogue:', dialogue);
  return dialogue;
}