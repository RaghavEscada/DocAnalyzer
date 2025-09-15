# DocuSummarize AI

A sleek, modern document summarization app with AI-powered analysis and actionable checklists.


## Features

- 📄 **Document Upload**: Support for PDF and DOCX files
- 🤖 **AI Analysis**: Comprehensive summaries with tech stack and project flow analysis
- ✅ **Actionable Checklists**: Interactive task lists extracted from documents
- 🎨 **Modern UI**: Clean, Vercel-style black and white design
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🔄 **Provider Choice**: Choose between OpenAI and Gemini for AI-powered analysis

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed

### Run with Docker Compose
```bash
# Clone the repository
git clone <your-repo-url>
cd AI-Summary-SaaS-main

# Build and run
docker-compose up --build

# Access the app at http://localhost:3000
```

### Run with Docker
```bash
# Build the image
docker build -t docu-summarize .

# Run the container
docker run -p 3000:80 docu-summarize

# Access the app at http://localhost:3000
```

## Manual Setup

1. Open `index.html` in your web browser
2. Upload a PDF or DOCX document
3. Get comprehensive AI analysis and actionable checklist

## Deployment Options

### Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign up and create new project
3. Upload your project folder
4. Deploy!

### Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Your site is live instantly!

### Docker Deployment
```bash
# Build for production
docker build -t docu-summarize:latest .

# Run in production
docker run -d -p 80:80 --name docu-summarize docu-summarize:latest
```

## File Structure

```
├── index.html          # Main HTML file
├── script.js           # JavaScript functionality
├── style.css           # Styling
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
├── nginx.conf          # Nginx configuration
└── README.md           # This file
```

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI**: OpenAI GPT API
- **Styling**: Custom CSS with Inter font
- **Deployment**: Docker, Nginx
- **File Processing**: PDF.js, Mammoth.js


## API Key

The app supports both OpenAI and Gemini API keys. For production use, consider:
- Using environment variables (OPENAI_API_KEY, GEMINI_API_KEY)
- Implementing user-specific API keys
- Adding rate limiting

## License

MIT License - feel free to use and modify as needed.
