#!/bin/bash
set -e

echo "=== Pars Tabela Setup ==="

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo ".env already exists, skipping"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push database schema
echo "Pushing database schema..."
npx prisma db push

# Seed data
echo "Seeding database..."
npm run seed

# Create backups directory
mkdir -p .backups

echo ""
echo "=== Setup complete! ==="
echo "Run: npm run dev"
