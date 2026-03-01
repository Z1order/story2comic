/**
 * Parse a story into comic panels using Pollinations.ai (free, no API key)
 * @param {string} story - The user's story text
 * @param {number} panelCount - Number of panels to generate (4-12)
 * @returns {Promise<Array>} Array of panel descriptions
 */
async function parseStoryIntoPanels(story, panelCount = 8) {
  // Clean the story text
  const cleanStory = story
    .substring(0, 1500)
    .replace(/[""'']/g, '"')
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const messages = [
    {
      role: "system",
      content: "You are a comic book artist who creates visually cohesive comics. Return ONLY valid JSON."
    },
    {
      role: "user",
      content: `Create ${panelCount} comic panels from this story. The panels must be visually cohesive with consistent character appearances.

STORY: "${cleanStory}"

Return this JSON structure:
{
  "setting": "brief description of the main location/world",
  "characters": [
    {"name": "CharacterName", "appearance": "detailed physical description - hair color, clothing, distinctive features"}
  ],
  "panels": [
    {
      "panelNumber": 1,
      "scene": "specific moment from the story being depicted",
      "visualDescription": "40-60 word scene description including character names and their actions, setting details, camera angle",
      "narration": "1-2 sentence caption describing what's happening",
      "dialogue": "Character: speech (or empty)"
    }
  ]
}

IMPORTANT:
- In visualDescription, always refer to characters by name with their appearance
- Include the setting context in each panel
- Each panel should clearly show a different story moment
- Make descriptions specific enough to generate accurate images`
    }
  ];

  try {
    console.log('Sending request to Pollinations...');

    // Use POST with OpenAI-compatible format
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai',
        messages: messages,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.log('POST failed, trying GET...');
      return await parseWithGet(cleanStory, panelCount);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log('No content in POST response, trying GET...');
      return await parseWithGet(cleanStory, panelCount);
    }

    console.log('Response content length:', content.length);

    const parsed = JSON.parse(content);

    if (!parsed.panels || !Array.isArray(parsed.panels)) {
      throw new Error('Invalid response structure');
    }

    return processPanels(parsed);

  } catch (error) {
    console.error('POST method error:', error.message);
    return await parseWithGet(cleanStory, panelCount);
  }
}

async function parseWithGet(cleanStory, panelCount) {
  // Simpler prompt for GET request
  const prompt = `Create ${panelCount} comic panels. Return JSON only: {"panels":[{"panelNumber":1,"visualDescription":"scene description","narration":"caption","dialogue":""}]}

Story: "${cleanStory.substring(0, 800)}"`;

  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  let content = await response.text();
  console.log('GET response length:', content.length);
  console.log('GET response start:', content.substring(0, 200));

  content = content.trim();

  // Try to find panels array in the response
  let jsonStart = content.indexOf('{"panels"');
  if (jsonStart === -1) {
    jsonStart = content.indexOf('{');
  }
  const jsonEnd = content.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    content = content.substring(jsonStart, jsonEnd + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    console.error('Content to parse:', content.substring(0, 300));
    throw new Error('Failed to parse AI response as JSON');
  }

  // Handle different response structures
  if (parsed.panels && Array.isArray(parsed.panels)) {
    return processPanels(parsed);
  }

  // Maybe panels are at a different key
  const possiblePanelKeys = ['panels', 'comic_panels', 'scenes', 'frames'];
  for (const key of possiblePanelKeys) {
    if (parsed[key] && Array.isArray(parsed[key])) {
      parsed.panels = parsed[key];
      return processPanels(parsed);
    }
  }

  console.error('Response keys:', Object.keys(parsed));
  throw new Error('Invalid response structure from AI');
}

function processPanels(parsed) {
  // Build character reference string for consistent imagery
  const characterRef = (parsed.characters || [])
    .map(c => `${c.name}: ${c.appearance}`)
    .join('; ');

  const settingRef = parsed.setting || '';

  const enhancedPanels = parsed.panels.map((panel, idx) => {
    // Combine scene description with character and setting context
    let desc = panel.visualDescription || panel.scene || `Scene ${idx + 1}`;

    // Add character appearances if not already detailed
    if (characterRef && !desc.includes(characterRef.split(':')[0])) {
      desc = `${desc}. Characters: ${characterRef}`;
    }

    // Add setting context
    if (settingRef && !desc.toLowerCase().includes(settingRef.toLowerCase().split(' ')[0])) {
      desc = `Setting: ${settingRef}. ${desc}`;
    }

    return {
      panelNumber: panel.panelNumber || idx + 1,
      visualDescription: desc,
      scene: panel.scene || '',
      narration: panel.narration || panel.caption || '',
      dialogue: panel.dialogue || '',
      mood: panel.mood || 'neutral'
    };
  });

  return {
    setting: parsed.setting || '',
    characters: parsed.characters || [],
    panels: enhancedPanels
  };
}

module.exports = { parseStoryIntoPanels };
