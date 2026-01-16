# Cloudflare Tunnel Setup Guide

This guide walks you through setting up CheckMate with Cloudflare Tunnel for secure homelab deployment. This approach provides:

- **Zero cost** - Cloudflare's free tier includes unlimited tunnel bandwidth
- **No port forwarding** - Outbound-only connections, no router configuration needed
- **Free SSL** - Automatic HTTPS certificates from Cloudflare
- **DDoS protection** - Cloudflare's edge network protects your homelab
- **Global CDN** - Static assets cached at Cloudflare's edge locations

## Prerequisites

- A computer to run Docker (Raspberry Pi 4+, old laptop, mini PC, NAS, etc.)
- Docker and Docker Compose installed
- A Cloudflare account (free): https://dash.cloudflare.com/sign-up
- (Optional) A domain name added to Cloudflare, or use free `*.cfargotunnel.com` subdomains

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Internet                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge Network                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   SSL/TLS       │  │   DDoS          │  │   CDN Cache             │  │
│  │   Termination   │  │   Protection    │  │   (Static Assets)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          Cloudflare Tunnel
                        (Outbound connection)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Your Homelab                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Docker Compose                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │ cloudflared │  │   Next.js   │  │      PocketBase         │  │    │
│  │  │   daemon    │──│   :3000     │  │        :8090            │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  │                                              │                   │    │
│  │                                    ┌─────────┴─────────┐        │    │
│  │                                    │   SQLite Data     │        │    │
│  │                                    │   (Persistent)    │        │    │
│  │                                    └───────────────────┘        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Step 1: Create a Cloudflare Tunnel

1. **Log in to Cloudflare Zero Trust Dashboard**

   - Go to https://one.dash.cloudflare.com/
   - If this is your first time, you'll be prompted to set up Zero Trust (free plan available)

2. **Create a New Tunnel**

   - Navigate to **Networks** → **Tunnels**
   - Click **Create a tunnel**
   - Select **Cloudflared** as the connector type
   - Name your tunnel (e.g., `checkmate-homelab`)
   - Click **Save tunnel**

3. **Copy the Tunnel Token**
   - After creating the tunnel, you'll see installation instructions
   - Look for the token in the command (starts with `eyJ...`)
   - Copy this token - you'll need it for the `.env` file

## Step 2: Configure Public Hostnames

In the Cloudflare Zero Trust dashboard, configure how traffic reaches your services:

1. **Add hostname for the web app**

   - In your tunnel configuration, go to **Public Hostname**
   - Click **Add a public hostname**
   - Configure:
     - **Subdomain**: `checkmate` (or your preferred name)
     - **Domain**: Select your domain (or use `cfargotunnel.com` for free subdomain)
     - **Service Type**: `HTTP`
     - **URL**: `nextjs:3000`
   - Click **Save hostname**

2. **Add hostname for the API (PocketBase)**
   - Click **Add a public hostname** again
   - Configure:
     - **Subdomain**: `api.checkmate` (or `checkmate-api`)
     - **Domain**: Select your domain
     - **Service Type**: `HTTP`
     - **URL**: `pocketbase:8090`
   - Click **Save hostname**

**Example hostnames:**

- Web app: `https://checkmate.yourdomain.com`
- API: `https://api.checkmate.yourdomain.com`

## Step 3: Configure CheckMate

1. **Copy the environment file**

   ```bash
   cd checkmate
   cp .env.example .env
   ```

2. **Edit the `.env` file**

   ```bash
   # Update these values:

   # Your Cloudflare Tunnel token (from Step 1)
   CLOUDFLARE_TUNNEL_TOKEN=eyJ...your-token-here...

   # Public URL for the PocketBase API (from Step 2)
   NEXT_PUBLIC_POCKETBASE_URL=https://api.checkmate.yourdomain.com
   ```

## Step 4: Deploy CheckMate

1. **Start the services with Cloudflare Tunnel**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
   ```

2. **Check the logs to verify tunnel connection**

   ```bash
   docker logs checkmate-tunnel
   ```

   You should see output like:

   ```
   INF Connection established connIndex=0 ...
   INF Registered tunnel connection connIndex=0 ...
   ```

3. **Verify all services are healthy**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml ps
   ```

## Step 5: Initial Setup

1. **Access PocketBase Admin**

   - Go to `https://api.checkmate.yourdomain.com/_/`
   - Create your admin account on first visit

2. **Access CheckMate**
   - Go to `https://checkmate.yourdomain.com`
   - Create your first user account

## Troubleshooting

### Tunnel not connecting

1. **Check the tunnel token**

   ```bash
   # Verify the token is set
   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml config | grep TUNNEL_TOKEN
   ```

2. **Check cloudflared logs**

   ```bash
   docker logs checkmate-tunnel --tail 50
   ```

3. **Verify tunnel status in Cloudflare dashboard**
   - Go to Networks → Tunnels
   - Your tunnel should show as "Healthy"

### Services not reachable

1. **Check if services are healthy**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml ps
   ```

2. **Verify hostname configuration**

   - Ensure the service URLs in Cloudflare match the Docker service names
   - `nextjs:3000` for the web app
   - `pocketbase:8090` for the API

3. **Check internal network connectivity**
   ```bash
   # Test from cloudflared container
   docker exec checkmate-tunnel wget -q -O- http://nextjs:3000 | head
   docker exec checkmate-tunnel wget -q -O- http://pocketbase:8090/api/health
   ```

### SSL/Certificate issues

Cloudflare handles SSL automatically. If you see certificate warnings:

- Ensure you're accessing via `https://`
- Check that your domain's SSL/TLS mode in Cloudflare is set to "Full" or "Full (strict)"

## Maintenance

### Updating CheckMate

```bash
# Pull latest images
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml pull

# Restart with new images
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
```

### Backing up PocketBase data

```bash
# Create a backup of the PocketBase data volume
docker run --rm -v checkmate_pocketbase_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/pocketbase-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Viewing logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f

# Specific service
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f cloudflared
```

## Security Considerations

1. **Tunnel token security**

   - Never commit your `.env` file to version control
   - The tunnel token grants access to route traffic through your tunnel

2. **PocketBase admin**

   - Use a strong password for the PocketBase admin account
   - Consider restricting admin access via Cloudflare Access policies

3. **Cloudflare Access (optional)**
   - You can add authentication in front of your services using Cloudflare Access
   - This adds an extra layer of security before traffic reaches your homelab

## Alternative: Using a Free Cloudflare Subdomain

If you don't have a domain, you can use Cloudflare's free `*.cfargotunnel.com` subdomains:

1. When configuring public hostnames, select `cfargotunnel.com` as the domain
2. Your URLs will be like:
   - `https://checkmate-abc123.cfargotunnel.com`
   - `https://checkmate-api-abc123.cfargotunnel.com`

Note: These subdomains are randomly generated and may change if you recreate the tunnel.
