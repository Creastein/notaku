#!/bin/bash
# =============================================================================
# NotaKu — Deploy to Google Cloud Run
# =============================================================================
# Prerequisite:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login
#   3. gcloud config set project jvcwellinotaku
#   4. gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
# =============================================================================

set -e

# ─── Configuration ──────────────────────────────────────────────────────────
PROJECT_ID="sapient-reducer-495808-i1"
REGION="asia-southeast2"  # Jakarta
SERVICE_NAME="notaku"

# ─── Colors ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying NotaKu to Google Cloud Run...${NC}"
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# ─── Step 1: Verify gcloud auth ─────────────────────────────────────────────
echo -e "${YELLOW}📋 Checking gcloud authentication...${NC}"
gcloud config set project $PROJECT_ID

# ─── Step 2: Deploy using Cloud Build (source deploy) ───────────────────────
echo -e "${YELLOW}🏗️  Building and deploying...${NC}"
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --set-build-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB1W9KlNBV0zuEhii56qO0gdo2M5f8spJE,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jvcwellinotaku.firebaseapp.com,NEXT_PUBLIC_FIREBASE_PROJECT_ID=jvcwellinotaku,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jvcwellinotaku.firebasestorage.app,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=799970342476,NEXT_PUBLIC_FIREBASE_APP_ID=1:799970342476:web:0c51fb57f7fe2576f826e9"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app is live at the URL shown above.${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the live URL on your phone"
echo "  2. Record the demo video (2-3 minutes)"
echo "  3. Post on LinkedIn with #JuaraVibeCoding"
echo "  4. Submit via the official form"
