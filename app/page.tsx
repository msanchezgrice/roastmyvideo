const handleGenerate = async () => {
  console.log('[page.tsx] handleGenerate called with video URL:', videoUrlInput);
  setIsLoading(true);
  setError(null);
  setDialogue([]);
  setAudioUrl(null);
  setFinalVideoR2Url(null);
  setGeneratedSummaryInfo(null);

  // Construct activePersonas from the current state arrays
  const activePersonas: Persona[] = [];
  for (let i = 0; i < numberOfSpeakers; i++) {
    const name = personaNames[i] || `Speaker ${i + 1}`;
    const description = personaDescriptions[i] || 'A general commentator.';
    const backstory = personaBackstories[i] || null;
    
    // Try to find if this current speaker configuration matches a predefined or custom template to get tags
    let tags: string[] | null = [];
    const currentSpeakerDesc = personaDescriptions[i]; // Use the actual description from state
    const currentSpeakerName = personaNames[i];

    let matchedTemplate = PREDEFINED_PERSONAS.find(p => p.name === currentSpeakerName && p.description === currentSpeakerDesc);
    if (!matchedTemplate) {
      matchedTemplate = customPersonas.find(p => p.name === currentSpeakerName && p.description === currentSpeakerDesc);
    }
    tags = matchedTemplate?.tags || [];

    activePersonas.push({
      name,
      description,
      backstory,
      tags,
    });
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcriptSummary: transcript, 
        videoUrl: videoUrlInput,
        personas: activePersonas, 
        speakingPace: speakingPace 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[page.tsx] API response data:', data);
    
    setDialogue(data.dialogue || []);
    if (data.audioUrl) {
      setAudioUrl(`${data.audioUrl}?t=${new Date().getTime()}`);
    }
    if (data.finalVideoUrl) { 
      setFinalVideoR2Url(data.finalVideoUrl);
    }
    if (data.generatedSummary) {
      setGeneratedSummaryInfo(`AI Generated Summary: ${data.generatedSummary}`);
    }
    if (!data.finalVideoUrl && !data.audioUrl && !data.error && !data.generatedSummary && videoUrlInput) {
      setError("Processing finished but no video, audio, or summary was returned, despite video input.");
    }

  } catch (err) {
    if (err instanceof Error) {
      console.error('[page.tsx] Error in handleGenerate:', err.message, err.stack);
      setError(err.message);
    } else {
      console.error('[page.tsx] Unknown error in handleGenerate:', err);
      setError('An unknown error occurred during generation.');
    }
  }
  setIsLoading(false);
}; 