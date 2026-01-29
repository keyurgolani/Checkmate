# CheckMate ♟️

A modern, enterprise-grade checklist application for creating, sharing, and tracking reusable checklists across various life events.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![PocketBase](https://img.shields.io/badge/PocketBase-0.25-blue)](https://pocketbase.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## Features

- 📝 **Checklist Blueprints** - Create reusable checklist templates for any scenario
- 🔗 **Nested References** - Include other checklists within checklists for complex workflows
- 👥 **Collaboration** - Share checklists with configurable permissions (viewer, editor, admin)
- 📊 **Progress Tracking** - Track completion across all your checklist instances
- 🔍 **Discovery** - Browse and search public checklists from the community
- 🎨 **Theming** - Light/dark mode with customizable color themes
- 📱 **Responsive** - Works seamlessly on desktop and mobile
- ⚡ **Real-time** - Live updates when collaborating with others
- 📤 **Export/Import** - Share templates via JSON export

## Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router), TypeScript, React 19 |
| **UI**         | shadcn/ui, Tailwind CSS, Radix UI             |
| **Backend**    | PocketBase (SQLite, Auth, Realtime)           |
| **Testing**    | Vitest, fast-check                            |
| **Deployment** | Docker Compose, Cloudflare Tunnel             |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Development with Docker (Recommended)

The easiest way to get started is with Docker Compose. Everything is automatic:

```bash
# Clone the repository
git clone https://github.com/keyurgolani/Checkmate.git
cd checkmate

# Start all services (Next.js + PocketBase)
docker compose -f docker-compose.dev.yml up -d
```

That's it! The app will:

1. Start PocketBase with auto-created admin user
2. Auto-import the database schema on first request
3. Start the Next.js development server

Open [http://localhost:3002](http://localhost:3002) to see the app.

PocketBase admin dashboard is available at [http://localhost:8090/\_/](http://localhost:8090/_/)

- Default admin: `admin@checkmate.local` / `checkmate_admin_2026`

### Fresh Start

To completely reset the database and start fresh:

```bash
npm run docker:fresh
```

### Local Development (Without Docker for Next.js)

If you prefer to run Next.js locally:

```bash
# Install dependencies
npm install

# Start only PocketBase in Docker
docker compose -f docker-compose.dev.yml up pocketbase -d

# Import schema (first time only)
npm run setup:schema

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment

CheckMate supports multiple deployment options:

| Option                          | Cost        | Best For                       |
| ------------------------------- | ----------- | ------------------------------ |
| **Homelab + Cloudflare Tunnel** | $0/month    | Home server, Raspberry Pi, NAS |
| **VPS + Coolify**               | $5-10/month | Managed deployments            |
| **Standard VPS**                | $5-10/month | Full control                   |

### Quick Deploy (Production)

```bash
# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start production stack
docker compose up -d
```

### Homelab with Cloudflare Tunnel

Deploy on your own hardware with secure public access at zero cost:

```bash
# Configure Cloudflare Tunnel token in .env
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
```

📖 See [Cloudflare Tunnel Setup Guide](docs/CLOUDFLARE_TUNNEL_SETUP.md) for detailed instructions.

## Documentation

| Document                                                   | Description                      |
| ---------------------------------------------------------- | -------------------------------- |
| [Deployment Guide](docs/DEPLOYMENT.md)                     | Complete deployment instructions |
| [Cloudflare Tunnel Setup](docs/CLOUDFLARE_TUNNEL_SETUP.md) | Homelab setup with Cloudflare    |
| [PocketBase Schema](docker/pocketbase/pb_schema.json)      | Database schema reference        |
| [Access Rules](docker/pocketbase/ACCESS_RULES.md)          | Collection access rules          |
| [Contributing](CONTRIBUTING.md)                            | Contribution guidelines          |
| [Changelog](CHANGELOG.md)                                  | Version history                  |

## Project Structure

```
checkmate/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── lib/              # Utilities, services, hooks
├── docker/
│   └── pocketbase/       # PocketBase configuration
├── docs/                 # Documentation
├── scripts/              # Setup and migration scripts
└── public/               # Static assets
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable                     | Description                           |
| ---------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_POCKETBASE_URL` | Public URL for PocketBase API         |
| `POCKETBASE_URL`             | Internal URL for server-side requests |
| `CLOUDFLARE_TUNNEL_TOKEN`    | Cloudflare Tunnel token (for homelab) |

## Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View logs
npm run docker:fresh     # Reset database and restart

# Database
npm run setup:schema     # Import PocketBase schema
npm run pocketbase:export # Export current schema
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [PocketBase](https://pocketbase.io/) - Backend as a service
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
