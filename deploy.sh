#!/bin/bash

echo "🚀 Deploy started."

cd ~/maava
git pull origin main

# FRONTEND
cd Frontend
pnpm install
pnpm run build

sudo rm -rf /var/www/Maava/maava/*
sudo cp -r dist/* /var/www/Maava/maava/

# BACKEND
cd ../Backend
pnpm install

pm2 startOrReload ecosystem.config.cjs || pm2 restart all

echo "✅ Deploy finished"
