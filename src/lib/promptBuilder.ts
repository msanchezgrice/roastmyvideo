import { DialogueLine, Persona } from '@/types'; // Ensure Persona from @/types includes backstory?: string | null

const defaultPersonas: Persona[] = [
  { name: 'FabOne', description: 'A witty and insightful commentator.', backstory: 'Knows internet culture.'},
  { name: 'FabTwo', description: 'A curious and slightly sarcastic observer.', backstory: 'Reads too much sci-fi.' },
  { name: 'SageSpeaker', description: 'A wise and thoughtful analyst.', backstory: null },
  { name: 'ExcitableEddie', description: 'An energetic and easily amazed fan.', backstory: null },
];

const MAX_SPEAKERS_IN_PROMPT_EXAMPLE = 4; // Define the constant here

export function buildDialoguePrompt(
  transcriptSummary: string, 
  personasFromUser: Persona[], 
  audioTranscript: string | undefined
): string {
  
  let selectedPersonas = personasFromUser.map((p, index) => {
    const defaultP = defaultPersonas[index];
    return {
      name: p.name || defaultP?.name || `Speaker${index + 1}`,
      description: p.description || defaultP?.description || 'A general commentator.',
      backstory: (p as any).backstory || defaultP?.backstory || null,
    };
  });

  // Ensure selectedPersonas has a minimum number of personas for the prompt example, using defaults if necessary
  const minPersonasForExample = Math.min(defaultPersonas.length, MAX_SPEAKERS_IN_PROMPT_EXAMPLE);

  if (selectedPersonas.length < minPersonasForExample) {
    for (let i = 0; i < minPersonasForExample; i++) {
      if (!selectedPersonas[i]) {
        if (defaultPersonas[i] && !selectedPersonas.find(sp => sp.name === defaultPersonas[i].name)) {
          selectedPersonas[i] = defaultPersonas[i];
        } else {
          // If default is already used or unavailable, create a generic one
          selectedPersonas[i] = { name: `Speaker${i + 1}`, description: 'A commentator', backstory: null };
        }
      }
    }
  }
  // Ensure no undefined holes if personasFromUser was shorter than minPersonasForExample
  selectedPersonas = selectedPersonas.filter(p => p && p.name);
  
  // Cap at MAX_SPEAKERS_IN_PROMPT_EXAMPLE for the prompt generation logic that follows
  if (selectedPersonas.length > MAX_SPEAKERS_IN_PROMPT_EXAMPLE) {
      selectedPersonas = selectedPersonas.slice(0, MAX_SPEAKERS_IN_PROMPT_EXAMPLE);
  }
   // If after all this, selectedPersonas is still too short (e.g., personasFromUser was empty and defaultPersonas is short)
   // ensure at least two for the example format string.
   if (selectedPersonas.length === 0) {
    selectedPersonas.push(defaultPersonas[0] || { name: 'Speaker1', description: 'A commentator', backstory: null });
   }
   if (selectedPersonas.length === 1) {
    selectedPersonas.push(defaultPersonas[1] || { name: 'Speaker2', description: 'Another commentator', backstory: null });
   }


  const speakerNames = selectedPersonas.map(p => p.name).join(', ');
  const personaDescriptions = selectedPersonas
    .map(p => {
      let fullDescription = `${p.name}: ${p.description}`;
      if ((p as any).backstory && typeof (p as any).backstory === 'string' && (p as any).backstory.trim() !== '') {
        fullDescription += `\n  Background/Context: ${(p as any).backstory.trim()}`;
      }
      return fullDescription;
    })
    .join('\n\n');

  let prompt = `You are an expert dialogue writer. Given the following video transcript summary and a set of character personas, generate a short, engaging, and witty dialogue (around 100-200 words total) between the specified characters. The dialogue should be directly related to the summary.\n\n`;
  prompt += `Characters involved: ${speakerNames}.\n\n`;
  prompt += `Their personalities, roles, and relevant context are as follows:\n${personaDescriptions}\n\n`;
  
  prompt += `The dialogue should be formatted strictly with each line starting with the character's name followed by a colon and their dialogue. Do not include any other text, preambles, or summaries outside of this format.\nExample format:\n`;

  // Construct example lines based on available selectedPersonas (guaranteed at least 2 by now)
  prompt += `${selectedPersonas[0].name}: [Their line of dialogue]\n`;
  prompt += `${selectedPersonas[1].name}: [Their line of dialogue]\n`;

  if (selectedPersonas.length > 2 && selectedPersonas[2]?.name) {
    prompt += `${selectedPersonas[2].name}: [Their line of dialogue]\n`;
  }
  if (selectedPersonas.length > 3 && selectedPersonas[3]?.name) {
    prompt += `${selectedPersonas[3].name}: [Their line of dialogue]\n`;
  }
  
  prompt += `\n---Video Transcript Summary---\n${transcriptSummary}\n---End Video Transcript Summary---\n\n`;

  if (audioTranscript && audioTranscript.trim().length > 0) {
    prompt += `---Full Audio Transcript Context---\n${audioTranscript}\n---End Full Audio Transcript Context---\n\n`;
  }
  
  prompt += `Dialogue:\n`;

  console.log('[promptBuilder] Generated dialogue prompt:', prompt);
  return prompt;
}

export function parseDialogueResponse(aiResponse: string): DialogueLine[] {
  console.log('[promptBuilder] Parsing AI response:', aiResponse);
  const lines = aiResponse.trim().split('\n');
  const dialogue: DialogueLine[] = [];

  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const speaker = parts[0].trim();
      const text = parts.slice(1).join(':').trim();
      if (speaker && text) {
        dialogue.push({ speaker, text });
      }
    }
  });

  console.log('[promptBuilder] Parsed dialogue:', dialogue);
  return dialogue;
} 