// Art style prompts
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

const STABLE_HORDE_API = 'https://stablehorde.net/api/v2';
const ANONYMOUS_API_KEY = '0000000000';

// DOM Elements
const storyForm = document.getElementById('story-form');
const storyInput = document.getElementById('story-input');
const panelCountInput = document.getElementById('panel-count');
const panelButtons = document.querySelectorAll('.panel-btn');
const artStyleSelect = document.getElementById('art-style');
const generateBtn = document.getElementById('generate-btn');
const charCurrent = document.getElementById('char-current');

const inputSection = document.getElementById('input-section');
const progressSection = document.getElementById('progress-section');
const comicSection = document.getElementById('comic-section');
const errorSection = document.getElementById('error-section');

const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const comicGrid = document.getElementById('comic-grid');
const errorMessage = document.getElementById('error-message');

const downloadBtn = document.getElementById('download-btn');
const newComicBtn = document.getElementById('new-comic-btn');
const retryBtn = document.getElementById('retry-btn');

// Initialize
function init() {
  storyInput.addEventListener('input', updateCharCount);
  panelButtons.forEach(btn => {
    btn.addEventListener('click', () => selectPanelCount(btn));
  });
  storyForm.addEventListener('submit', handleSubmit);
  downloadBtn.addEventListener('click', downloadComic);
  newComicBtn.addEventListener('click', resetToInput);
  retryBtn.addEventListener('click', resetToInput);
}

function updateCharCount() {
  charCurrent.textContent = storyInput.value.length;
}

function selectPanelCount(selectedBtn) {
  panelButtons.forEach(btn => btn.classList.remove('active'));
  selectedBtn.classList.add('active');
  panelCountInput.value = selectedBtn.dataset.count;
}

async function handleSubmit(e) {
  e.preventDefault();

  const story = storyInput.value.trim();
  const panelCount = parseInt(panelCountInput.value);
  const artStyle = artStyleSelect.value;

  if (!story) {
    showError('Please enter a story.');
    return;
  }

  setLoading(true);
  showSection('progress');

  try {
    // Step 1: Parse story into panels
    updateProgress(0, panelCount + 1, 'Analyzing your story...');
    const panels = await parseStoryIntoPanels(story, panelCount);

    // Step 2: Generate images for each panel
    const panelsWithImages = await generateAllImages(panels, artStyle, panelCount);

    // Display the comic
    displayComic(panelsWithImages);

  } catch (error) {
    console.error('Generation error:', error);
    showError(error.message);
  }

  setLoading(false);
}

function updateProgress(current, total, message) {
  const percent = (current / total) * 100;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = message;
}

// Parse story using Pollinations API
async function parseStoryIntoPanels(story, panelCount) {
  const cleanStory = story
    .substring(0, 1200)
    .replace(/[""'']/g, '"')
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const prompt = `Create ${panelCount} comic panels. Return JSON only: {"panels":[{"panelNumber":1,"visualDescription":"scene description","narration":"caption","dialogue":""}]}

Story: "${cleanStory}"`;

  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`);

  if (!response.ok) {
    throw new Error('Failed to analyze story');
  }

  let content = await response.text();
  content = content.trim();

  // Extract JSON
  const jsonStart = content.indexOf('{"panels"');
  const jsonEnd = content.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    content = content.substring(jsonStart, jsonEnd + 1);
  }

  const parsed = JSON.parse(content);

  if (!parsed.panels || !Array.isArray(parsed.panels)) {
    throw new Error('Failed to parse story into panels');
  }

  return parsed.panels.map((panel, idx) => ({
    panelNumber: panel.panelNumber || idx + 1,
    visualDescription: panel.visualDescription || `Scene ${idx + 1}`,
    narration: panel.narration || '',
    dialogue: panel.dialogue || ''
  }));
}

// Generate all images
async function generateAllImages(panels, artStyle, totalPanels) {
  const results = [];
  const comicSeed = Math.floor(Math.random() * 1000000);

  for (let i = 0; i < panels.length; i++) {
    updateProgress(i + 1, totalPanels + 1, `Generating panel ${i + 1} of ${panels.length}...`);

    // Add delay between requests to avoid rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const panelWithImage = await generatePanelImage(panels[i], i, artStyle, comicSeed);
    results.push(panelWithImage);
  }

  return results;
}

// Generate single panel image
async function generatePanelImage(panel, index, artStyle, comicSeed) {
  let basePrompt = panel.visualDescription.substring(0, 400);
  basePrompt = basePrompt.replace(/\b(naked|nude|blood|gore|violent|death|kill|dead|comic|panel|speech bubble|text|caption|dialogue)\b/gi, '');

  const stylePrompt = ART_STYLES[artStyle] || ART_STYLES.comic;
  const prompt = `${basePrompt}, ${stylePrompt}, single scene illustration, no text, no speech bubbles, no panels, no borders, no words`;
  const seed = String(comicSeed + index);

  try {
    // Submit to Stable Horde
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
          karras: true
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['Deliberate', 'stable_diffusion']
      })
    });

    if (!submitResponse.ok) {
      throw new Error('Failed to submit image request');
    }

    const { id } = await submitResponse.json();

    // Poll for completion
    let imageUrl = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`${STABLE_HORDE_API}/generate/status/${id}`);
      const status = await statusResponse.json();

      if (status.faulted) {
        throw new Error('Image generation failed');
      }

      if (status.done && status.generations && status.generations.length > 0) {
        const gen = status.generations[0];
        if (!gen.censored) {
          imageUrl = gen.img;
          break;
        }
      }

      if (status.wait_time) {
        updateProgress(index + 1, 7, `Panel ${index + 1}: Waiting... (${status.wait_time}s)`);
      }
    }

    if (!imageUrl) {
      throw new Error('Image generation timed out');
    }

    return { ...panel, imageUrl };

  } catch (error) {
    console.error(`Error generating panel ${index + 1}:`, error);
    // Fallback to placeholder
    const placeholderId = Date.now() + index * 100;
    return {
      ...panel,
      imageUrl: `https://picsum.photos/seed/${placeholderId}/512/512`,
      isPlaceholder: true
    };
  }
}

// Display the comic
function displayComic(panels) {
  comicGrid.innerHTML = '';

  panels.forEach((panel, index) => {
    const panelElement = document.createElement('div');
    panelElement.className = 'comic-panel';

    let captionHTML = '';
    if (panel.narration) {
      captionHTML += `<span class="narration">${panel.narration}</span>`;
    }
    if (panel.dialogue) {
      captionHTML += `<span class="dialogue">${panel.dialogue}</span>`;
    }
    if (!captionHTML) {
      captionHTML = '<span class="narration">...</span>';
    }

    panelElement.innerHTML = `
      <span class="panel-number">${index + 1}</span>
      <img class="panel-image" src="${panel.imageUrl}" alt="Panel ${index + 1}" crossorigin="anonymous">
      <div class="panel-caption">${captionHTML}</div>
    `;

    comicGrid.appendChild(panelElement);
  });

  showSection('comic');
}

// Download comic
function downloadComic() {
  const panels = comicGrid.querySelectorAll('.panel-image');
  if (panels.length === 0) return;

  const confirmed = confirm(
    'This will open each panel image for you to save. ' +
    'For a combined comic, you can screenshot the page.'
  );

  if (confirmed) {
    panels.forEach((img, index) => {
      window.open(img.src, '_blank');
    });
  }
}

// UI helpers
function showSection(section) {
  inputSection.hidden = section !== 'input';
  progressSection.hidden = section !== 'progress';
  comicSection.hidden = section !== 'comic';
  errorSection.hidden = section !== 'error';
}

function showError(message) {
  errorMessage.textContent = message;
  showSection('error');
  setLoading(false);
}

function resetToInput() {
  comicGrid.innerHTML = '';
  progressFill.style.width = '0%';
  progressText.textContent = 'Analyzing story...';
  showSection('input');
}

function setLoading(loading) {
  generateBtn.disabled = loading;
  generateBtn.querySelector('.btn-text').hidden = loading;
  generateBtn.querySelector('.btn-loading').hidden = !loading;
}

document.addEventListener('DOMContentLoaded', init);
