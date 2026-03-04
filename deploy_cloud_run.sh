#!/bin/bash
export NEXT_PUBLIC_SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env | cut -d '=' -f2-)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d '=' -f2-)
export SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d '=' -f2-)
export RESEND_API_KEY=$(grep '^RESEND_API_KEY=' .env | cut -d '=' -f2-)
export EMAIL_FROM=$(grep '^EMAIL_FROM=' .env | cut -d '=' -f2-)

gcloud run deploy almuerzo-restaurant-dashboard-v6 \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,RESEND_API_KEY=$RESEND_API_KEY,EMAIL_FROM=$EMAIL_FROM"
