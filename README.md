# CFBC Invigilation System

Automated exam invigilation notification system for Clarence Fitzroy Bryant College.

## Repo Structure

```
cfbc-invig/
├── frontend/
│   └── index.html          ← Single-file webapp (GitHub Pages)
├── backend/
│   ├── server.js           ← Express + Nodemailer API
│   ├── package.json
│   ├── ecosystem.config.js ← PM2 config for tekii.org
│   ├── .env.example        ← Copy to .env and fill in credentials
│   └── .gitignore          ← .env is excluded from git
└── README.md
```

## Quick Start

### 1 — Backend (tekii.org)

```bash
# SSH into tekii.org
ssh root@104.236.15.123

# Clone the repo
git clone https://github.com/YOUR_USERNAME/cfbc-invig.git /opt/cfbc-invig
cd /opt/cfbc-invig/backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env          # Fill in SMTP credentials and ALLOWED_ORIGINS

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # Follow the printed command to survive reboots
```

Open port 3005 in UFW:
```bash
ufw allow 3005/tcp
```

Verify it's running:
```bash
curl http://localhost:3005/health
```

### 2 — Frontend (GitHub Pages)

1. Push this repo to GitHub
2. Go to repo **Settings → Pages**
3. Set source to **Deploy from branch → main → /frontend**
4. Your app will be live at `https://YOUR_USERNAME.github.io/cfbc-invig/`

### 3 — Connect them

1. Open the webapp on GitHub Pages
2. Go to **Settings** in the sidebar
3. Enter `http://tekii.org:3005` as the Backend URL
4. Click **Test** — should show ✅ Connected
5. Update SMTP settings if needed and click **Save**
6. Switch Send Mode from **Simulate** to **Live**

## CORS — Adding GitHub Pages URL

Once you know your GitHub Pages URL, add it to `.env` on the server:

```
ALLOWED_ORIGINS=http://localhost:5500,https://YOUR_USERNAME.github.io
```

Then restart the backend:
```bash
pm2 restart cfbc-invig
```

## Updating the Backend

```bash
cd /opt/cfbc-invig
git pull
cd backend && npm install
pm2 restart cfbc-invig
```

## Gmail App Password

The backend uses `clientmon@gmail.com` with a Gmail App Password (not the regular password).

If you need to regenerate:
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Create a new app password for "Mail"
3. Update `SMTP_PASS` in `.env` and restart PM2
