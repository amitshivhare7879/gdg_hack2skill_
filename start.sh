#!/bin/bash

# Start FastAPI backend
echo "Starting FastAPI backend on port 8000..."
cd /home/user/app/backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 &

# Wait for backend to start up
sleep 3

# Start Next.js frontend on port 7860
echo "Starting Next.js frontend on port 7860..."
cd /home/user/app/frontend
npx next start -p 7860
