#!/bin/bash
set -e

echo "========================================"
echo "Building SIRET Extractor Docker images"
echo "========================================"
echo ""

# Build backend
echo ">>> Building backend image..."
docker build -t siret-extractor-backend:latest -t siret-extractor-backend:1.0.0 .
echo "Backend image built successfully!"
echo ""

# Build frontend
echo ">>> Building frontend image..."
cd frontend
docker build -t siret-extractor-frontend:latest -t siret-extractor-frontend:1.0.0 .
cd ..
echo "Frontend image built successfully!"
echo ""

echo "========================================"
echo "Docker images built successfully!"
echo "========================================"
echo ""
echo "Available images:"
docker images | grep siret-extractor
echo ""
echo "To start the application:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop the application:"
echo "  docker-compose down"
echo ""
