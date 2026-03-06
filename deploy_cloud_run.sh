#!/bin/bash
set -e

NEXT_PUBLIC_SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env | cut -d '=' -f2-)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d '=' -f2-)
SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d '=' -f2-)
RESEND_API_KEY=$(grep '^RESEND_API_KEY=' .env | cut -d '=' -f2-)
EMAIL_FROM=$(grep '^EMAIL_FROM=' .env | cut -d '=' -f2-)

echo "Deploying almuerzo-restaurant-dashboard-v6 to Cloud Run..."
echo "Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL}"

# Use ^##^ as delimiter to handle special chars (spaces, < >) in EMAIL_FROM
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions "^##^_NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}##_NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}##_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}##_RESEND_API_KEY=${RESEND_API_KEY}##_EMAIL_FROM=${EMAIL_FROM}" \
  .

echo "Deployment complete!"
