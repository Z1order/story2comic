const express = require('express');
const router = express.Router();
const { parseStoryIntoPanels } = require('../services/storyParser');
const { generateAllPanelImages } = require('../services/imageGenerator');

// In-memory storage for generation jobs (in production, use Redis or a database)
const jobs = new Map();

/**
 * POST /api/comic/generate
 * Generate a comic from a story
 */
router.post('/generate', async (req, res) => {
  const { story, panelCount = 6, artStyle = 'comic' } = req.body;

  // Validation
  if (!story || typeof story !== 'string') {
    return res.status(400).json({ error: 'Story text is required' });
  }

  if (story.trim().length < 20) {
    return res.status(400).json({ error: 'Story is too short. Please provide at least a few sentences.' });
  }

  if (story.length > 5000) {
    return res.status(400).json({ error: 'Story is too long. Please keep it under 5000 characters.' });
  }

  const validPanelCounts = [4, 6, 8];
  if (!validPanelCounts.includes(panelCount)) {
    return res.status(400).json({ error: 'Panel count must be 4, 6, or 8' });
  }

  // Create a job ID for tracking
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  jobs.set(jobId, {
    status: 'processing',
    progress: { current: 0, total: panelCount + 1, message: 'Analyzing story...' },
    createdAt: new Date()
  });

  // Start async generation
  generateComic(jobId, story, panelCount, artStyle);

  res.json({
    jobId,
    message: 'Comic generation started',
    status: 'processing'
  });
});

/**
 * GET /api/comic/status/:id
 * Check generation progress
 */
router.get('/status/:id', (req, res) => {
  const { id } = req.params;
  const job = jobs.get(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

/**
 * Async comic generation function
 */
async function generateComic(jobId, story, panelCount, artStyle) {
  const job = jobs.get(jobId);

  try {
    // Step 1: Parse story into panels
    job.progress = { current: 1, total: panelCount + 1, message: 'Breaking story into panels...' };

    const { characters, panels } = await parseStoryIntoPanels(story, panelCount);

    job.characters = characters;
    job.progress = { current: 1, total: panelCount + 1, message: 'Story analyzed. Starting image generation...' };

    // Step 2: Generate images for each panel
    const panelsWithImages = await generateAllPanelImages(panels, artStyle, (progress) => {
      job.progress = {
        current: progress.current + 1, // +1 for the story parsing step
        total: panelCount + 1,
        message: progress.message
      };
    });

    // Complete
    job.status = 'completed';
    job.panels = panelsWithImages;
    job.progress = { current: panelCount + 1, total: panelCount + 1, message: 'Comic complete!' };
    job.completedAt = new Date();

  } catch (error) {
    console.error('Comic generation error:', error);
    job.status = 'failed';
    job.error = error.message;
    job.progress = { current: 0, total: panelCount + 1, message: `Error: ${error.message}` };
  }
}

// Clean up old jobs every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, job] of jobs) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 60 * 60 * 1000);

module.exports = router;
