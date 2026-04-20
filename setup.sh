#!/usr/bin/env bash
# ─── JobHunter AI — One-time setup script ────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       JobHunter AI — Setup Script        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Node dependencies
echo "→ Installing Node.js dependencies..."
npm install

# 2. Python dependencies
echo ""
echo "→ Installing Python dependencies..."
cd backend
pip3 install -r requirements.txt --break-system-packages 2>/dev/null || \
  pip3 install -r requirements.txt

# 3. Optional: Playwright (for browser automation method)
echo ""
read -p "Install Playwright for browser automation support? (y/N): " yn
if [[ "$yn" =~ ^[Yy]$ ]]; then
  pip3 install "playwright>=1.48.0" --break-system-packages 2>/dev/null || \
    pip3 install "playwright>=1.48.0"
  python3 -m playwright install chromium
  echo "✓ Playwright + Chromium installed"
fi

cd ..
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              Setup Complete!             ║"
echo "║                                          ║"
echo "║  Run the app with:  npm start            ║"
echo "║  Or run manually:                        ║"
echo "║    Terminal 1: npm run backend           ║"
echo "║    Terminal 2: npm run dev               ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "⚠️  Add your Claude API key in Settings to"
echo "   enable AI-powered resume tailoring."
echo ""
