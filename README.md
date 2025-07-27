# SP.AI Neural Interface

A next-generation voice-powered AI assistant with a futuristic holographic interface. SP.AI features automatic wake word detection, intelligent conversation processing, and seamless integration with OpenAI, ElevenLabs, and search APIs.

## 🚀 Features

- **Voice Activation**: Wake with "SP" command - no manual controls needed
- **Auto-Sleep**: Hibernates after 10 minutes of inactivity to conserve resources
- **Neural Interface**: Futuristic UI with holographic effects and animations
- **Multi-API Integration**: OpenAI GPT-4, ElevenLabs TTS, SerpAPI search
- **Real-time Processing**: Instant speech recognition and response generation
- **Production Ready**: Comprehensive error handling, security, and monitoring

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom animations
- **APIs**: OpenAI, ElevenLabs, SerpAPI
- **Speech**: Web Speech API (Chrome/Edge)
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- Modern browser with Web Speech API support (Chrome, Edge)
- API Keys:
  - OpenAI API key
  - ElevenLabs API key (optional)
  - SerpAPI key (optional)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd sp-ai-assistant
npm install
\`\`\`

### 2. Environment Setup

Create `.env.local`:

\`\`\`env
# Required
OPENAI_API_KEY=sk-your-openai-key-here

# Optional but recommended
ELEVENLABS_API_KEY=your-elevenlabs-key-here
SERPAPI_KEY=your-serpapi-key-here

# Security (auto-generated in production)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
\`\`\`

### 3. Development

\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000`

### 4. Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

## 🔧 Configuration

### API Keys Setup

1. **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com)
2. **ElevenLabs**: Sign up at [ElevenLabs](https://elevenlabs.io) for voice synthesis
3. **SerpAPI**: Get search API access at [SerpAPI](https://serpapi.com)

### Browser Permissions

SP.AI requires microphone access for voice recognition:
- Chrome/Edge: Automatically prompts for permission
- Firefox: Limited Web Speech API support
- Safari: Not supported

## 🎯 Usage

### Voice Commands

1. **Activation**: Say "SP" to wake the assistant
2. **Commands**: Follow with your request
3. **Auto-Sleep**: Assistant hibernates after 10 minutes

### Examples

\`\`\`
"SP, what's the weather in New York?"
"SP, summarize this document"
"SP, run system diagnostics"
"SP, search for latest AI news"
\`\`\`

### Manual Input

- Type commands in the neural input field
- Press Enter to send
- Useful as backup when voice isn't available

## 🏗️ Architecture

### Project Structure

\`\`\`
sp-ai-assistant/
├── app/
│   ├── api/
│   │   ├── process-command/route.ts    # Main command processor
│   │   ├── search/route.ts             # Web search handler
│   │   ├── read-file/route.ts          # File operations
│   │   └── run-script/route.ts         # Script execution
│   ├── globals.css                     # Global styles
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # Main interface
├── components/ui/                      # Reusable UI components
├── hooks/                              # Custom React hooks
├── lib/                                # Utility functions
├── public/                             # Static assets
├── docs/                               # Documentation
└── README.md                           # This file
\`\`\`

### API Routes

- `/api/process-command` - Main AI processing endpoint
- `/api/search` - Web search functionality
- `/api/read-file` - File reading operations
- `/api/run-script` - Script execution (with confirmation)

## 🔒 Security

### API Key Protection

- Environment variables for sensitive data
- Server-side API calls only
- No client-side key exposure
- Rate limiting on API endpoints

### Input Validation

- Command sanitization
- File path validation
- Script execution confirmation
- XSS protection

### Privacy

- No conversation logging by default
- Local speech processing
- Configurable data retention
- GDPR compliance ready

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**:
   \`\`\`bash
   vercel --prod
   \`\`\`

2. **Environment Variables**:
   Add your API keys in Vercel dashboard

3. **Domain Setup**:
   Configure custom domain if needed

### Docker Deployment

\`\`\`dockerfile
# Dockerfile included in project
docker build -t sp-ai .
docker run -p 3000:3000 sp-ai
\`\`\`

### Manual Server

\`\`\`bash
npm run build
npm start
\`\`\`

## 📊 Monitoring

### Health Checks

- `/api/health` - System status endpoint
- Speech recognition status monitoring
- API connectivity checks
- Error rate tracking

### Logging

- Structured logging with Winston
- Error tracking with Sentry (optional)
- Performance monitoring
- Usage analytics

## 🧪 Testing

### Unit Tests

\`\`\`bash
npm run test
\`\`\`

### E2E Tests

\`\`\`bash
npm run test:e2e
\`\`\`

### API Testing

\`\`\`bash
npm run test:api
\`\`\`

## 🔧 Customization

### Styling

- Modify `app/globals.css` for global styles
- Update Tailwind config for theme changes
- Customize animations in component files

### Voice Settings

- Adjust wake word sensitivity
- Modify auto-sleep duration
- Configure speech recognition parameters

### API Integration

- Add new API endpoints in `app/api/`
- Extend command processing logic
- Implement custom tools and functions

## 📈 Performance

### Optimization

- Next.js automatic code splitting
- Image optimization
- API response caching
- Lazy loading components

### Monitoring

- Core Web Vitals tracking
- API response times
- Speech recognition accuracy
- User engagement metrics

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Not Working**:
   - Check browser permissions
   - Ensure HTTPS in production
   - Test with different browsers

2. **API Errors**:
   - Verify API keys are correct
   - Check rate limits
   - Monitor network connectivity

3. **Speech Recognition Issues**:
   - Chrome/Edge work best
   - Check for background noise
   - Verify microphone quality

### Debug Mode

Enable debug logging:

\`\`\`env
NODE_ENV=development
DEBUG=sp-ai:*
\`\`\`

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Test coverage >80%

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@sp-ai.com

## 🗺️ Roadmap

### v2.0 (Q2 2024)

- [ ] Multi-language support
- [ ] Custom voice training
- [ ] Plugin system
- [ ] Mobile app

### v2.1 (Q3 2024)

- [ ] Offline mode
- [ ] Advanced file processing
- [ ] Team collaboration
- [ ] API marketplace

---

**Built with ❤️ by the SP.AI Team**

*"The future of human-AI interaction"*
