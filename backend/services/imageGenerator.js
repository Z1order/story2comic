const STABLE_HORDE_API = 'https://stablehorde.net/api/v2';
const ANONYMOUS_API_KEY = '0000000000';

// Art style prompts - focused on illustration, NOT comic panels
const ART_STYLES = {
  comic: 'digital illustration, bold ink outlines, vibrant colors, cel shaded, dynamic composition',
  manga: 'anime illustration style, expressive eyes, clean linework, cel shaded coloring',
  pixar: '3D cartoon render style, smooth lighting, expressive character design, Pixar quality',
  watercolor: 'watercolor illustration, soft edges, flowing colors, artistic brush strokes',
  noir: 'black and white illustration, high contrast, dramatic shadows, noir atmosphere',
  retro: 'retro illustration style, bold flat colors, vintage aesthetic, mid-century modern',
  fantasy: 'fantasy digital painting, detailed, magical atmosphere, epic lighting, artstation quality',
  minimal: 'minimalist illustration, simple shapes, limited color palette, clean flat design'
};

/**
 * Generate a comic panel image using Stable Horde (free, crowdsourced)
 * @param {Object} panel - Panel object with visual description
 * @param {number} index - Panel index for logging
 * @returns {Promise<Object>} Panel with generated image URL
 */
async function generatePanelImage(panel, index, artStyle = 'comic', comicSeed = null, retryCount = 0) {
  // Clean prompt and add safety keywords
  let basePrompt = panel.visualDescription.substring(0, 400);
  // Remove potentially problematic words
  basePrompt = basePrompt.replace(/\b(naked|nude|blood|gore|violent|death|kill|dead)\b/gi, '');

  const stylePrompt = ART_STYLES[artStyle] || ART_STYLES.comic;
  // Remove any mention of comic/panel/text from the base prompt
  basePrompt = basePrompt.replace(/\b(comic|panel|speech bubble|text|caption|dialogue)\b/gi, '');
  const prompt = `${basePrompt}, ${stylePrompt}, single scene illustration, no text, no speech bubbles, no panels, no borders, no words`;

  // Use a consistent seed base for all panels in the same comic (must be string)
  const seed = comicSeed ? String(comicSeed + index) : undefined;

  console.log(`Generating image for panel ${index + 1}...`);

  try {
    // Step 1: Submit generation request
    const submitResponse = await fetch(`${STABLE_HORDE_API}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANONYMOUS_API_KEY
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: 'text, words, letters, speech bubble, comic panel, panel border, frame, caption, dialogue, title, watermark, signature, blurry, bad anatomy, ugly, deformed, disfigured, low quality, worst quality, extra limbs, missing limbs, cropped',
        params: {
          width: 512,
          height: 512,
          steps: 25,
          cfg_scale: 7.5,
          sampler_name: 'k_dpmpp_2m',
          seed: seed,
          karras: true,
          clip_skip: 2
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['Deliberate', 'stable_diffusion']
      })
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.error('Stable Horde submit error:', error);
      throw new Error('Failed to submit image generation request');
    }

    const { id } = await submitResponse.json();
    console.log(`Panel ${index + 1}: Job submitted with ID ${id}`);

    // Step 2: Poll for completion
    let imageUrl = null;
    let wasCensored = false;
    const maxAttempts = 60; // Max 2 minutes

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`${STABLE_HORDE_API}/generate/status/${id}`);
      const status = await statusResponse.json();

      if (status.faulted) {
        throw new Error('Image generation failed on the server');
      }

      if (status.done && status.generations && status.generations.length > 0) {
        const gen = status.generations[0];

        // Check if image was censored
        if (gen.censored) {
          console.log(`Panel ${index + 1}: Image was censored`);
          wasCensored = true;
          break;
        }

        imageUrl = gen.img;
        console.log(`Panel ${index + 1}: Image generated successfully`);
        break;
      }

      if (status.wait_time) {
        console.log(`Panel ${index + 1}: Waiting... (${status.wait_time}s estimated, position: ${status.queue_position})`);
      }
    }

    // If censored and haven't retried too many times, try with simpler prompt
    if (wasCensored && retryCount < 2) {
      console.log(`Panel ${index + 1}: Retrying with simpler prompt...`);
      const simplePanel = {
        ...panel,
        visualDescription: `A scene from a story, panel ${index + 1}`
      };
      return generatePanelImage(simplePanel, index, artStyle, comicSeed, retryCount + 1);
    }

    if (!imageUrl) {
      throw new Error(wasCensored ? 'Image was censored' : 'Image generation timed out');
    }

    return {
      ...panel,
      imageUrl,
      revisedPrompt: prompt
    };

  } catch (error) {
    console.error(`Error generating image for panel ${index + 1}:`, error);

    // Fallback to placeholder
    const placeholderId = Date.now() + index * 100;
    return {
      ...panel,
      imageUrl: `https://picsum.photos/seed/${placeholderId}/512/512`,
      revisedPrompt: prompt,
      isPlaceholder: true,
      error: error.message
    };
  }
}

/**
 * Generate images for all comic panels
 * @param {Array} panels - Array of panel objects
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array>} Panels with generated image URLs
 */
async function generateAllPanelImages(panels, artStyle = 'comic', onProgress = null) {
  const results = [];

  // Generate a consistent seed for this comic
  const comicSeed = Math.floor(Math.random() * 1000000);
  console.log(`Using comic seed: ${comicSeed} for visual consistency`);

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: panels.length,
        status: 'generating',
        message: `Generating panel ${i + 1} of ${panels.length}... (this may take a moment)`
      });
    }

    // Add delay between requests to avoid rate limiting (max 2 per second)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const panelWithImage = await generatePanelImage(panel, i, artStyle, comicSeed);
    results.push(panelWithImage);
  }

  return results;
}

module.exports = { generatePanelImage, generateAllPanelImages };
