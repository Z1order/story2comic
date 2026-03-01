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

// State
let currentJobId = null;
let pollInterval = null;

// Initialize
function init() {
  // Character count
  storyInput.addEventListener('input', updateCharCount);

  // Panel selector
  panelButtons.forEach(btn => {
    btn.addEventListener('click', () => selectPanelCount(btn));
  });

  // Form submission
  storyForm.addEventListener('submit', handleSubmit);

  // Other buttons
  downloadBtn.addEventListener('click', downloadComic);
  newComicBtn.addEventListener('click', resetToInput);
  retryBtn.addEventListener('click', resetToInput);
}

// Update character count
function updateCharCount() {
  charCurrent.textContent = storyInput.value.length;
}

// Select panel count
function selectPanelCount(selectedBtn) {
  panelButtons.forEach(btn => btn.classList.remove('active'));
  selectedBtn.classList.add('active');
  panelCountInput.value = selectedBtn.dataset.count;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  const story = storyInput.value.trim();
  const panelCount = parseInt(panelCountInput.value);
  const artStyle = artStyleSelect.value;

  if (!story) {
    showError('Please enter a story.');
    return;
  }

  // Update UI
  setLoading(true);

  try {
    // Start generation
    const response = await fetch('/api/comic/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story, panelCount, artStyle })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start generation');
    }

    currentJobId = data.jobId;

    // Show progress section
    showSection('progress');

    // Start polling for status
    startPolling();

  } catch (error) {
    console.error('Generation error:', error);
    showError(error.message);
    setLoading(false);
  }
}

// Start polling for job status
function startPolling() {
  pollInterval = setInterval(checkJobStatus, 2000);
  checkJobStatus(); // Check immediately
}

// Check job status
async function checkJobStatus() {
  if (!currentJobId) return;

  try {
    const response = await fetch(`/api/comic/status/${currentJobId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to check status');
    }

    // Update progress
    if (data.progress) {
      const percent = (data.progress.current / data.progress.total) * 100;
      progressFill.style.width = `${percent}%`;
      progressText.textContent = data.progress.message;
    }

    // Check completion
    if (data.status === 'completed') {
      stopPolling();
      displayComic(data.panels);
    } else if (data.status === 'failed') {
      stopPolling();
      showError(data.error || 'Comic generation failed');
    }

  } catch (error) {
    console.error('Status check error:', error);
    stopPolling();
    showError(error.message);
  }
}

// Stop polling
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Display the generated comic
function displayComic(panels) {
  comicGrid.innerHTML = '';

  panels.forEach((panel, index) => {
    const panelElement = document.createElement('div');
    panelElement.className = 'comic-panel';

    // Build caption with narration and dialogue
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
      <img class="panel-image" src="${panel.imageUrl}" alt="Panel ${index + 1}">
      <div class="panel-caption">${captionHTML}</div>
    `;

    comicGrid.appendChild(panelElement);
  });

  showSection('comic');
  setLoading(false);
}

// Download comic as image
async function downloadComic() {
  // For now, alert user - full implementation would use html2canvas
  const panels = comicGrid.querySelectorAll('.panel-image');
  if (panels.length === 0) return;

  // Simple approach: open all images in new tabs for download
  // In production, you'd use html2canvas or server-side rendering
  const confirmed = confirm(
    'This will open each panel image for you to save. ' +
    'For a combined comic, you can screenshot the page or use a screenshot tool.'
  );

  if (confirmed) {
    panels.forEach((img, index) => {
      const link = document.createElement('a');
      link.href = img.src;
      link.download = `comic-panel-${index + 1}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

// Show specific section
function showSection(section) {
  inputSection.hidden = section !== 'input';
  progressSection.hidden = section !== 'progress';
  comicSection.hidden = section !== 'comic';
  errorSection.hidden = section !== 'error';
}

// Show error
function showError(message) {
  errorMessage.textContent = message;
  showSection('error');
  setLoading(false);
  stopPolling();
}

// Reset to input section
function resetToInput() {
  stopPolling();
  currentJobId = null;
  comicGrid.innerHTML = '';
  progressFill.style.width = '0%';
  progressText.textContent = 'Analyzing story...';
  showSection('input');
}

// Set loading state
function setLoading(loading) {
  generateBtn.disabled = loading;
  generateBtn.querySelector('.btn-text').hidden = loading;
  generateBtn.querySelector('.btn-loading').hidden = !loading;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
