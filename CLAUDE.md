# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multiflow is a WhatsApp Business automation platform consisting of 4 microservices:

- **backend**: Node.js/TypeScript main application with Sequelize ORM
- **frontend**: React.js web interface with Material-UI
- **api_oficial**: NestJS API for WhatsApp Business Official integration (Prisma ORM)
- **api_transcricao**: Python Flask API for audio transcription using Google Speech Recognition

## Architecture

### Backend (Node.js/TypeScript)
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io for live updates
- **Message Queue**: Redis with Bull for job processing
- **File Storage**: Local filesystem with public folder structure
- **WhatsApp Integration**: Baileys library for unofficial WhatsApp Web API
- **Models**: Located in `src/models/` (Company, User, Ticket, Message, Contact, etc.)
- **Services**: Business logic in various service directories under `src/services/`

### Frontend (React.js)
- **UI Framework**: Material-UI (@material-ui/core v4)
- **State Management**: React Context + local state
- **Real-time**: Socket.io-client for live updates
- **Charts**: Chart.js with react-chartjs-2
- **File Handling**: React Dropzone for uploads
- **Audio**: react-audio-player and mic-recorder-to-mp3

### API Oficial (NestJS)
- **Database**: PostgreSQL with Prisma ORM
- **WhatsApp**: Meta Business API integration
- **Message Broker**: RabbitMQ support
- **Cache**: Redis integration
- **Documentation**: Swagger/OpenAPI

### API Transcricao (Python Flask)
- **Speech Recognition**: Google Speech Recognition API
- **Audio Processing**: pydub and FFmpeg for format conversion
- **Parallel Processing**: ThreadPoolExecutor for chunk processing
- **Formats Supported**: WAV, OGG, MP3, MP4, M4A, AAC, FLAC

## Development Commands

### Backend
```bash
cd backend
npm install
npm run build          # Build TypeScript
npm run dev:server     # Development with hot reload
npm run db:migrate     # Run Sequelize migrations
npm run db:seed:all    # Seed database
npm test              # Run tests
```

### Frontend  
```bash
cd frontend
npm install
npm run dev           # Development server (legacy OpenSSL)
npm run build         # Production build
npm run builddev      # Development build
```

### API Oficial
```bash
cd api_oficial
npm install
npx prisma generate   # Generate Prisma client
npx prisma db push    # Push schema to database
npm run start:dev     # Development mode
npm run build && npm run start:prod  # Production
```

### API Transcricao
```bash
cd api_transcricao
pip3 install -r requirements.txt
python3 main.py       # Start Flask server on port 4002
# Or use PM2: pm2 start main.py --name transcricao --interpreter python3
```

## Environment Configuration

### Backend (.env)
Key variables:
- `DB_*`: PostgreSQL connection settings
- `REDIS_URI`: Redis connection with auth
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Authentication tokens
- `URL_API_OFICIAL` / `TOKEN_API_OFICIAL`: Official WhatsApp API connection
- `TRANSCRIBE_URL`: Points to api_transcricao (default: http://localhost:4002)
- `FACEBOOK_APP_*`: Facebook integration credentials

### Frontend (.env)
- `REACT_APP_BACKEND_URL`: Backend API URL
- `REACT_APP_NAME_SYSTEM`: Application branding
- `NODE_OPTIONS`: Required for build (--openssl-legacy-provider)

### API Oficial (.env)
- `DATABASE_LINK`: Prisma PostgreSQL connection string
- `TOKEN_ADMIN`: Admin API token
- `RABBITMQ_URL`: Message queue connection

### API Transcricao (.env)
- `API_TOKEN` / `PORT`: Optional authentication and port config

## Database Integration

- **Backend**: Uses Sequelize with PostgreSQL, migrations in `src/database/migrations/`
- **API Oficial**: Uses Prisma with schema in `prisma/schema.prisma`
- **Multi-tenant**: Backend supports multiple companies via `companyId` field

## Inter-Service Communication

- **Backend ↔ API Transcricao**: HTTP requests to `/transcrever` endpoint
- **Backend ↔ API Oficial**: Authentication via `TOKEN_API_OFICIAL`
- **Frontend ↔ Backend**: REST API + Socket.io WebSocket connections
- **Real-time Updates**: Socket.io broadcasts for ticket updates, message delivery

## Deployment

### Automated Installation (Ubuntu)
```bash
chmod +x instalador_ubuntu24-2.sh
sudo ./instalador_ubuntu24-2.sh
```

The installer handles:
- System dependencies (Node.js 20, PostgreSQL 17, Redis, FFmpeg, Nginx/Traefik)
- SSL certificate generation
- PM2 process management
- Database setup and migrations
- Proxy configuration

### Manual PM2 Setup
```bash
# Backend
cd backend && pm2 start dist/server.js --name multiflow-backend

# Frontend  
cd frontend && pm2 start server.js --name multiflow-frontend

# API Transcricao
pm2 start api_transcricao/main.py --name transcricao --interpreter python3
```

### Docker Deployment
Use `multiflow_deploy/deploy_fastalk.sh` for containerized deployment with Docker Compose.

## Key Service Integrations

- **WhatsApp Business**: Both unofficial (Baileys) and official (Meta API) integrations
- **Payment Processing**: Stripe, MercadoPago, Asaas, GerenciaNet
- **External Systems**: Chatwoot, N8N, CRM webhooks, Typebot
- **AI Services**: OpenAI, Google Dialogflow integration
- **File Processing**: FFmpeg for audio/video, Puppeteer for PDF generation

## Testing and Linting

- **Backend**: Jest testing framework, ESLint for code quality
- **Frontend**: React Testing Library, Create React App test runner  
- **API Oficial**: NestJS testing utilities, ESLint + Prettier
- **Python**: Standard Python testing practices

## Port Configuration

Default ports:
- Backend: 8080
- Frontend: 3000  
- API Oficial: 3001 (configurable)
- API Transcricao: 4002
- PostgreSQL: 5432
- Redis: 6379

## Common Issues

- **FFmpeg**: Backend requires FFmpeg for audio processing, configured in node_modules post-install
- **OpenSSL Legacy**: Frontend requires `--openssl-legacy-provider` flag for Node.js compatibility
- **Socket Connections**: Frontend connects to backend via Socket.io for real-time features
- **Audio Transcription**: Requires FFmpeg system installation and proper file permissions