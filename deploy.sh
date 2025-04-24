#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and pip
sudo apt-get install -y python3 python3-pip

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Build Next.js application
npm run build

# Create downloads directory
mkdir -p downloads

# Start the FastAPI backend
nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# Start the Next.js frontend
nohup npm start & 