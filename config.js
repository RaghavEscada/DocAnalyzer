// Configuration file for environment variables
// This file can be used to set API keys in production


// Optionally set API keys for OpenAI and Gemini in production
window.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
window.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// You can also set other configuration here
window.APP_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['.pdf', '.docx'],
  defaultModel: 'gpt-3.5-turbo'
};
