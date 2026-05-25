# =============================================================================
# NotaKu — Deploy to Google Cloud Run (Windows PowerShell)
# =============================================================================
# Prerequisite:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Restart terminal setelah install
#   3. Jalankan: gcloud auth login
#   4. Jalankan: gcloud config set project jvcwellinotaku
#   5. Jalankan: gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
# =============================================================================

$ErrorActionPreference = "Stop"

# Load GEMINI_API_KEY from .env.local if not already in environment
if (-not $env:GEMINI_API_KEY -and (Test-Path ".env.local")) {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^GEMINI_API_KEY=(.+)$") {
            $env:GEMINI_API_KEY = $Matches[1].Trim()
        }
    }
}

# --- Configuration ---
$PROJECT_ID = "sapient-reducer-495808-i1"
$REGION = "asia-southeast2"  # Jakarta
$SERVICE_NAME = "notaku"

Write-Host ""
Write-Host " Deploying NotaKu to Google Cloud Run..." -ForegroundColor Green
Write-Host "   Project: $PROJECT_ID"
Write-Host "   Region:  $REGION"
Write-Host "   Service: $SERVICE_NAME"
Write-Host ""

# --- Step 1: Set project ---
Write-Host " Setting gcloud project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# --- Step 2: Deploy ---
Write-Host " Building and deploying (ini bisa 5-10 menit)..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --source . `
  --clear-base-image `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 3 `
  --set-env-vars "GEMINI_API_KEY=$env:GEMINI_API_KEY" `
  --set-build-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB1W9KINBV0zuEhii56qO0gdo2M5f8spJE,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jvcwellinotaku.firebaseapp.com,NEXT_PUBLIC_FIREBASE_PROJECT_ID=jvcwellinotaku,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jvcwellinotaku.firebasestorage.app,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=799970342476,NEXT_PUBLIC_FIREBASE_APP_ID=1:799970342476:web:0c51fb57f7fe2576f826e9"

Write-Host ""
Write-Host " Deployment selesai!" -ForegroundColor Green
Write-Host " Buka URL yang ditampilkan di atas dari HP Anda." -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:"
Write-Host "  1. Test live URL di HP"
Write-Host "  2. Record video demo (2-3 menit) - lihat docs/video_script.md"
Write-Host "  3. Post LinkedIn (public) - lihat docs/linkedin_post.md"
Write-Host "  4. Submit via official form"
