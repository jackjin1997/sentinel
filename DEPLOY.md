# Sentinel · Vultr Deployment Guide

Target: get the public demo URL needed for Lablab.ai submission + Vultr Enterprise Agent award eligibility.

## Why Vultr

The AI Agent Olympics hackathon has a [Vultr Enterprise Agent award](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon) ($500-2000 partner prize) for projects deployed on Vultr. Deploying there hits two birds: hackathon requirement + extra prize eligibility.

## 3-step user setup (≤15 min)

### 1. Sign up + get $300 free credit

- Go to [vultr.com](https://www.vultr.com) → "Sign Up"
- Use GitHub OAuth for fastest signup
- **Apply the hackathon promo code** at [lablab.ai/ai-hackathons/milan-ai-week-hackathon](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon) — should grant $300 free credit (or use the standard `VULTR250` referral)
- Add a payment method (won't charge until credit runs out)

### 2. Create a $6/mo "Cloud Compute" instance

Recommended config:
- **Type**: Cloud Compute (regular performance)
- **Location**: closest to your geo (Tokyo / Singapore for APAC)
- **OS**: Ubuntu 24.04 LTS
- **Plan**: $6/mo (1 CPU, 1GB RAM, 32GB SSD) — enough for hackathon demo
- **Auto Backups**: skip
- **IPv6**: enable
- **Hostname**: `sentinel-demo`
- **SSH key**: upload your existing or use Vultr's web console

After spin-up (~60s), note the public IPv4 (let's call it `VULTR_IP`).

### 3. Tell Claude

Just paste back here:
```
VULTR_IP=xxx.xxx.xxx.xxx
```

I'll then run the deploy script remotely (SSH key flow) and you'll get a live URL.

## What Claude does after VULTR_IP arrives

Automated via the script below (`scripts/deploy-vultr.sh`):

1. SSH in, install Node 24 + bun
2. Clone the sentinel repo
3. Copy your `.env.local` over (API keys)
4. `bun install && bun run build`
5. Set up systemd service for `bun run start` on port 3000
6. Install Caddy as reverse proxy with auto-HTTPS
7. Point Caddy at the Vultr's reverse DNS (`<vultr-ip>.vultr.com`)
8. Hand back the live URL

**Total user time after step 3**: 0 minutes — Claude drives the rest.

## Backup plan: Vercel

If Vultr setup hits friction (KYC, payment), Vercel deploy is one command:
```bash
bunx vercel --prod
# Set GOOGLE_GENERATIVE_AI_API_KEY + ANTHROPIC_API_KEY in dashboard
```

Vercel loses Vultr award eligibility but covers the basic submission URL requirement.

## Estimated cost

- Vultr instance: $6/mo (covered by $300 free credit for ~50 months)
- LLM API: ~$0.05 per agent run × ~50 demo runs/judging = $2.50 (covered by Anthropic $5 trial)
- **Total out-of-pocket: $0** for the hackathon window

## Demo URL etiquette

Once live:
- Add to HACKATHON.md submission text
- Pin in X thread (tweet #8)
- Add to README badge
