#!/bin/bash
echo "Starting AI Service..."
cd ai-service && python3 app.py &

echo "Starting Node Backend..."
cd backend && node index.js &

echo "Starting React Frontend..."
cd frontend && npm run dev &

wait
