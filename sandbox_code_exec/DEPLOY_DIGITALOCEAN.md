# Deploy to a DigitalOcean Droplet

This guide deploys the app using Docker Compose with:
- `frontend` (Nginx serving Vite build + proxy)
- `backend` (Express API + WebSocket endpoints)
- `worker`
- `redis`
- `mongo`

## 1) Create + prepare Droplet

Use Ubuntu 22.04/24.04.

SSH into the droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Install Docker + Compose plugin:

```bash
apt update
apt install -y ca-certificates curl gnupg ufw
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
docker compose version
```

## 2) Pull your code on the droplet

```bash
cd /opt
git clone YOUR_GITHUB_REPO_URL sandbox_code_exec
cd sandbox_code_exec
```

## 3) Configure environment

Copy/edit env file:

```bash
cp backend-api/.env.example backend-api/.env
nano backend-api/.env
```

Minimum values:

```env
MONGO_URI=mongodb://mongo:27017/code_exec
REDIS_URL=redis://redis:6379
PORT=5000
```

## 4) Deploy the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check status/logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Your app should now be reachable at:

```text
http://YOUR_DROPLET_IP
```

## 5) Open firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

## 6) Domain + HTTPS (recommended)

Point your domain A record to droplet IP, then run:

```bash
apt install -y certbot
snap install core; snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
```

If you keep TLS on host Nginx, you can terminate HTTPS there and reverse proxy to container port 80.
If you prefer fully containerized TLS, use a dedicated reverse-proxy setup (Traefik/Caddy/Nginx Proxy Manager).

## 7) Updating after code changes

```bash
cd /opt/sandbox_code_exec
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 8) Useful troubleshooting

Tail all logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Restart one service:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

Rebuild one service:

```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```
