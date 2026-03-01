# Story2Comic

A web application that transforms your stories into comic panels using AI. Enter a story, and the app uses GPT-4 to break it into scenes and DALL-E 3 to generate comic-style images for each panel.

## Features

- **Story Input**: Enter any story up to 5000 characters
- **Smart Scene Breaking**: GPT-4 intelligently divides your story into comic panels
- **AI Image Generation**: DALL-E 3 creates comic-style illustrations for each panel
- **Customizable Panels**: Choose 4, 6, or 8 panels for your comic
- **Real-time Progress**: Watch your comic being generated with progress updates
- **Download Support**: Save individual panel images

## Quick Start

### Prerequisites

- Node.js 18 or higher
- OpenAI API key with access to GPT-4 and DALL-E 3

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd story2comic
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp ../.env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to http://localhost:3000

## Project Structure

```
story2comic/
├── frontend/
│   ├── index.html        # Main page with story input
│   ├── styles.css        # Comic panel styling
│   └── app.js            # Frontend logic
├── backend/
│   ├── server.js         # Express server
│   ├── routes/
│   │   └── comic.js      # Comic generation endpoints
│   ├── services/
│   │   ├── storyParser.js    # GPT story-to-panels logic
│   │   └── imageGenerator.js # DALL-E image generation
│   └── package.json
├── .env.example          # Environment variables template
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/comic/generate` | POST | Generate comic from story |
| `/api/comic/status/:id` | GET | Check generation progress |
| `/api/health` | GET | Health check endpoint |

### Generate Comic Request

```json
POST /api/comic/generate
{
  "story": "Your story text here...",
  "panelCount": 6
}
```

### Response

```json
{
  "jobId": "job_123456789_abc123def",
  "message": "Comic generation started",
  "status": "processing"
}
```

## Cost Considerations

- **GPT-4**: ~$0.01-0.03 per story parsing
- **DALL-E 3**: ~$0.04 per image (standard quality, 1024x1024)
- **Total per comic**: ~$0.25-0.40 for a 6-panel comic

## Development

Run with auto-reload:
```bash
cd backend
npm run dev
```

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4, DALL-E 3
