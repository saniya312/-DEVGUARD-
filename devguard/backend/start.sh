#!/bin/bash
# DevGuard Backend Startup Script

set -e

echo "Starting DevGuard Backend..."

# Check .env exists
if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and configure it."
  exit 1
fi

# Check GROQ_API_KEY is set
source .env
if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your-groq-api-key-here" ]; then
  echo "WARNING: GROQ_API_KEY is not configured. AI features will not work."
fi

# Run server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload