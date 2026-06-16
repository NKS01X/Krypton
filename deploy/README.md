# 🚀 Krypton — Oracle Cloud Deployment Guide

Deploy Krypton securely on Oracle Cloud **Always Free** tier using **Cloudflare Tunnels**. Zero cost, enterprise-grade security.

## What You Get

| Resource | Spec | Cost |
|----------|------|------|
| **VM** | ARM A1 Flex — 2 OCPU, 12 GB RAM | Free |
| **Storage** | 100 GB boot volume | Free |
| **Network** | NO PUBLIC INBOUND PORTS (Secure) | Free |
| **HTTPS/WAF** | Cloudflare Edge Network | Free |
| **Tunnel** | cloudflared zero-trust tunnel | Free |

## Architecture

```
Internet → Cloudflare Edge (WAF, DDoS Protection, Rate Limiting, HTTPS)
                  ↓
       (Secure Outbound Tunnel)
                  ↓
[ Oracle Cloud VM - NO PUBLIC PORTS EXPOSED ]
           cloudflared container
                  ↓
          Frontend (Nginx :80)
                  ↓ /api/*
          API Server (:8080)
          ↙               ↘
    PostgreSQL           RabbitMQ
     (pgvector)            ↓
                         Worker
```

---

## Prerequisites

1. **Oracle Cloud account** — [Sign up](https://cloud.oracle.com)
2. **Terraform** — [Install](https://developer.hashicorp.com/terraform/install)
3. **Cloudflare Account** — Your domain must be active on Cloudflare.
4. **Cloudflare Tunnel Token** — Generated from Cloudflare Zero Trust.
5. **OCI API key & SSH key pair**.

---

## Step 1: Create Cloudflare Tunnel

1. Log into **Cloudflare Zero Trust** dashboard (One.dash.cloudflare.com).
2. Go to **Networks -> Tunnels**.
3. Create a tunnel (Cloudflared).
4. Save the **Tunnel Token** (you'll need this for `.env`).
5. Route a Public Hostname (e.g., `nikhil-krypton.duckdns.org` or your custom domain) to `http://frontend:80`.

## Step 2: Configure Cloudflare Security (Crucial)

Since we removed the local WAF (`pow-shield`), you **must** configure Cloudflare:
1. **SSL/TLS**: Set to **Full (strict)**.
2. **WAF**: Enable **Cloudflare Managed Ruleset** and **OWASP Core Ruleset**.
3. **Rate Limiting**: Create a rule for URI path `/api/v1/auth/login` and `/register` (e.g., block if > 5 requests / 1 min per IP).
4. **Bot Fight Mode**: Enable it under **Security -> Bots**.

## Step 3: Setup OCI API Key & Terraform

```bash
mkdir -p ~/.oci
# Generate API key in OCI Console, save to ~/.oci/oci_api_key.pem

cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
# Fill in your OCI credentials
```

## Step 4: Launch the VM

```bash
terraform init
terraform apply
```

Terraform outputs your VM's public IP. Wait 2-3 minutes for `cloud-init` to finish.

## Step 5: Deploy Krypton

```bash
# SSH into your server
ssh opc@<public-ip-from-terraform>

# Clone the repo
git clone https://github.com/YOUR_USERNAME/Krypton.git /opt/krypton/app
cd /opt/krypton/app

# Setup environment variables
cp deploy/.env.prod.example .env
nano .env   
# Fill in your actual API keys, JWT secret, and CLOUDFLARE_TUNNEL_TOKEN

# Deploy! 🚀
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## Step 6: Verify

```bash
# Check all containers are healthy
docker compose -f deploy/docker-compose.prod.yml ps

# Check tunnel logs
docker compose -f deploy/docker-compose.prod.yml logs cloudflared
```

Visit your domain. Traffic is now securely proxied via Cloudflare!

---

## Troubleshooting

### Cloudflare 502 Bad Gateway
1. Ensure the `cloudflared` container is running: `docker compose -f deploy/docker-compose.prod.yml ps cloudflared`
2. Check logs: `docker compose -f deploy/docker-compose.prod.yml logs cloudflared`
3. Verify your tunnel configuration in the Cloudflare Dashboard points exactly to `http://frontend:80`.

### Real-IP not logging correctly
Nginx is configured to trust Docker subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and read `CF-Connecting-IP`. Ensure `cloudflared` is on the same Docker network as `frontend`.

---

## File Structure

```
deploy/
├── README.md                    ← You are here
├── docker-compose.prod.yml      ← Production compose (cloudflared + services)
├── .env.prod.example            ← Environment variable template
└── terraform/
    ├── provider.tf              ← OCI Terraform provider
    ├── variables.tf             ← Input variables
    ├── terraform.tfvars.example ← Credentials template
    ├── network.tf               ← VCN, subnet, firewall rules
    ├── compute.tf               ← ARM A1 Flex instance
    ├── cloud-init.yaml          ← Server bootstrap (Docker, swap, cron)
    └── outputs.tf               ← IP address, SSH command
```
