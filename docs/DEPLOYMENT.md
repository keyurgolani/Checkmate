# CheckMate Deployment Guide

This comprehensive guide covers all deployment options for CheckMate, including environment configuration, backup procedures, and maintenance tasks.

## Table of Contents

- [Deployment Options Overview](#deployment-options-overview)
- [Option 1: Homelab with Cloudflare Tunnel (Zero Cost)](#option-1-homelab-with-cloudflare-tunnel-zero-cost)
- [Option 2: VPS with Coolify](#option-2-vps-with-coolify)
- [Option 3: Standard VPS Deployment](#option-3-standard-vps-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [Backup and Restore Procedures](#backup-and-restore-procedures)
- [Maintenance and Updates](#maintenance-and-updates)
- [Troubleshooting](#troubleshooting)

---

## Deployment Options Overview

| Option                          | Cost        | Best For                        | Complexity |
| ------------------------------- | ----------- | ------------------------------- | ---------- |
| **Homelab + Cloudflare Tunnel** | $0/month    | Home server, Raspberry Pi, NAS  | Medium     |
| **VPS + Coolify**               | $5-10/month | No homelab, managed deployments | Low        |
| **Standard VPS**                | $5-10/month | Full control, custom setups     | Medium     |

### System Requirements

| Resource    | Minimum                        | Recommended                  |
| ----------- | ------------------------------ | ---------------------------- |
| **CPU**     | 1 vCPU / ARM64                 | 2 vCPU                       |
| **RAM**     | 1GB                            | 2GB                          |
| **Storage** | 10GB SSD                       | 20GB+ SSD                    |
| **OS**      | Linux (any distro with Docker) | Ubuntu 22.04 LTS / Debian 12 |

---

## Option 1: Homelab with Cloudflare Tunnel (Zero Cost)

This is the recommended option for users with home servers, Raspberry Pi, NAS devices, or any always-on computer.

### Benefits

- **$0/month** - Only electricity costs
- **No port forwarding** - Outbound-only connections
- **Free SSL** - Automatic HTTPS from Cloudflare
- **DDoS protection** - Cloudflare's edge network
- **Global CDN** - Static assets cached worldwide

### Prerequisites

- Docker and Docker Compose installed
- Cloudflare account (free): https://dash.cloudflare.com/sign-up
- (Optional) Domain name added to Cloudflare

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/keyurgolani/Checkmate.git
cd Checkmate

# 2. Copy environment file
cp .env.example .env

# 3. Configure your Cloudflare Tunnel token (see detailed guide)
# Edit .env and set CLOUDFLARE_TUNNEL_TOKEN

# 4. Start with Cloudflare Tunnel
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d

# 5. Check status
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml ps
```

### Detailed Setup

For step-by-step Cloudflare Tunnel configuration, see:
**[Cloudflare Tunnel Setup Guide](./CLOUDFLARE_TUNNEL_SETUP.md)**

---

## Option 2: VPS with Coolify

[Coolify](https://coolify.io/) is a self-hosted alternative to Vercel/Netlify that simplifies deployments.

### Benefits

- **Git-based deployments** - Push to deploy
- **Automatic SSL** - Let's Encrypt certificates
- **Web UI** - Manage deployments visually
- **Multiple apps** - Host other projects too

### Prerequisites

- VPS with 2GB+ RAM (Hetzner, DigitalOcean, Linode, etc.)
- Domain name with DNS access

### Step 1: Install Coolify

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install Coolify (one-liner)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

After installation, access Coolify at `http://your-vps-ip:8000`

### Step 2: Configure Coolify

1. **Create an account** on first visit
2. **Add your server** (localhost is auto-detected)
3. **Add your domain** in Settings → Domains

### Step 3: Deploy CheckMate

1. **Create a new project** in Coolify
2. **Add a new resource** → Docker Compose
3. **Connect your Git repository** or upload files
4. **Configure environment variables** (see [Environment Variables](#environment-variables-reference))
5. **Deploy**

### Step 4: Configure DNS

Point your domain to your VPS IP:

```
A    checkmate.yourdomain.com    → your-vps-ip
A    api.checkmate.yourdomain.com → your-vps-ip
```

### Coolify Docker Compose Configuration

When deploying via Coolify, use this modified configuration:

```yaml
# docker-compose.coolify.yml
services:
  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL}
      - POCKETBASE_URL=http://pocketbase:8090
    depends_on:
      pocketbase:
        condition: service_healthy
    labels:
      - "coolify.managed=true"

  pocketbase:
    build:
      context: ./docker/pocketbase
      dockerfile: Dockerfile
    volumes:
      - pocketbase_data:/pb/pb_data
    healthcheck:
      test:
        ["CMD", "wget", "--spider", "-q", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "coolify.managed=true"

volumes:
  pocketbase_data:
```

---

## Option 3: Standard VPS Deployment

For users who want full control without Coolify.

### Prerequisites

- VPS with Docker and Docker Compose
- Domain name
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in for group changes
exit
```

### Step 2: Deploy CheckMate

```bash
# Clone repository
git clone https://github.com/keyurgolani/Checkmate.git
cd Checkmate

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start services
docker compose up -d
```

### Step 3: Configure Reverse Proxy (Nginx)

Install and configure Nginx as a reverse proxy with SSL:

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create Nginx configuration:

```nginx
# /etc/nginx/sites-available/checkmate
server {
    listen 80;
    server_name checkmate.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name checkmate.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/checkmate.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/checkmate.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.checkmate.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.checkmate.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.checkmate.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.checkmate.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and get SSL certificates:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/checkmate /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Get SSL certificates
sudo certbot --nginx -d checkmate.yourdomain.com -d api.checkmate.yourdomain.com

# Reload Nginx
sudo systemctl reload nginx
```

---

## Environment Variables Reference

### Required Variables

| Variable                     | Description                           | Example                                |
| ---------------------------- | ------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_POCKETBASE_URL` | Public URL for PocketBase API         | `https://api.checkmate.yourdomain.com` |
| `POCKETBASE_URL`             | Internal URL for server-side requests | `http://pocketbase:8090`               |

### Optional Variables

| Variable                  | Description                  | Default      |
| ------------------------- | ---------------------------- | ------------ |
| `NEXTJS_PORT`             | Port for Next.js application | `3000`       |
| `POCKETBASE_PORT`         | Port for PocketBase          | `8090`       |
| `NODE_ENV`                | Node environment             | `production` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Tunnel token      | -            |
| `PB_ADMIN_EMAIL`          | PocketBase admin email       | -            |
| `PB_ADMIN_PASSWORD`       | PocketBase admin password    | -            |

### OAuth Configuration (Optional)

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID     |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |

### Email Configuration (Optional)

| Variable        | Description          |
| --------------- | -------------------- |
| `SMTP_HOST`     | SMTP server hostname |
| `SMTP_PORT`     | SMTP server port     |
| `SMTP_USER`     | SMTP username        |
| `SMTP_PASSWORD` | SMTP password        |
| `SMTP_FROM`     | From email address   |

---

## Backup and Restore Procedures

PocketBase stores all data in SQLite database files within the `pb_data` directory. Regular backups are essential.

### Manual Backup

```bash
# Create backup directory
mkdir -p ~/checkmate-backups

# Stop services (optional but recommended for consistency)
docker compose stop pocketbase

# Create timestamped backup
docker run --rm \
  -v checkmate_pocketbase_data:/data:ro \
  -v ~/checkmate-backups:/backup \
  alpine tar czf /backup/pocketbase-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Restart services
docker compose start pocketbase

# Verify backup
ls -la ~/checkmate-backups/
```

### Automated Backup Script

Create a backup script for scheduled backups:

```bash
#!/bin/bash
# /opt/checkmate/backup.sh

BACKUP_DIR="/opt/checkmate-backups"
RETENTION_DAYS=30
COMPOSE_DIR="/opt/checkmate"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
docker run --rm \
  -v checkmate_pocketbase_data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/pocketbase-$TIMESTAMP.tar.gz" -C /data .

# Remove old backups
find "$BACKUP_DIR" -name "pocketbase-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Backup completed - pocketbase-$TIMESTAMP.tar.gz" >> "$BACKUP_DIR/backup.log"
```

Make it executable and schedule with cron:

```bash
# Make executable
chmod +x /opt/checkmate/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /opt/checkmate/backup.sh
```

### Restore from Backup

```bash
# Stop services
cd /path/to/checkmate
docker compose down

# Remove existing data volume
docker volume rm checkmate_pocketbase_data

# Create new volume
docker volume create checkmate_pocketbase_data

# Restore from backup
docker run --rm \
  -v checkmate_pocketbase_data:/data \
  -v ~/checkmate-backups:/backup:ro \
  alpine sh -c "cd /data && tar xzf /backup/pocketbase-YYYYMMDD-HHMMSS.tar.gz"

# Start services
docker compose up -d
```

### Backup to Remote Storage

For additional safety, sync backups to cloud storage:

```bash
# Using rclone (supports S3, Google Drive, Dropbox, etc.)
# Install: https://rclone.org/install/

# Configure rclone
rclone config

# Sync backups to remote
rclone sync ~/checkmate-backups remote:checkmate-backups
```

Add to backup script:

```bash
# After local backup
rclone copy "$BACKUP_DIR/pocketbase-$TIMESTAMP.tar.gz" remote:checkmate-backups/
```

---

## Maintenance and Updates

### Updating CheckMate

```bash
cd /path/to/checkmate

# Pull latest code
git pull origin main

# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build
```

### Updating with Cloudflare Tunnel

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml pull
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nextjs
docker compose logs -f pocketbase

# Last 100 lines
docker compose logs --tail 100
```

### Health Checks

```bash
# Check service status
docker compose ps

# Check PocketBase health
curl http://localhost:8090/api/health

# Check Next.js health
curl http://localhost:3000
```

### Database Maintenance

PocketBase automatically handles SQLite maintenance, but you can manually optimize:

```bash
# Access PocketBase container
docker exec -it checkmate-pocketbase sh

# Run SQLite vacuum (compacts database)
sqlite3 /pb/pb_data/data.db "VACUUM;"

# Exit container
exit
```

---

## Troubleshooting

### Common Issues

#### Services won't start

```bash
# Check logs for errors
docker compose logs

# Check if ports are in use
sudo lsof -i :3000
sudo lsof -i :8090

# Restart Docker
sudo systemctl restart docker
```

#### PocketBase connection errors

```bash
# Verify PocketBase is healthy
docker compose ps pocketbase

# Check PocketBase logs
docker compose logs pocketbase

# Test internal connectivity
docker exec checkmate-app wget -q -O- http://pocketbase:8090/api/health
```

#### Cloudflare Tunnel not connecting

```bash
# Check tunnel logs
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs cloudflared

# Verify token is set
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml config | grep TUNNEL_TOKEN

# Check tunnel status in Cloudflare dashboard
# https://one.dash.cloudflare.com/ → Networks → Tunnels
```

#### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a

# Remove old backups
find ~/checkmate-backups -name "*.tar.gz" -mtime +7 -delete
```

#### Memory issues

```bash
# Check memory usage
docker stats

# Limit container memory in docker-compose.yml
services:
  nextjs:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the `/docs` folder for guides
- **PocketBase Docs**: https://pocketbase.io/docs/
- **Next.js Docs**: https://nextjs.org/docs

---

## Security Best Practices

1. **Keep software updated** - Regularly update Docker images and dependencies
2. **Use strong passwords** - Especially for PocketBase admin
3. **Enable HTTPS** - Always use SSL in production
4. **Backup regularly** - Automate backups and test restores
5. **Monitor logs** - Watch for suspicious activity
6. **Limit access** - Use firewalls and Cloudflare Access policies
7. **Never commit secrets** - Keep `.env` out of version control
