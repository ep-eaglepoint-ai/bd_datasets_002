#!/bin/bash
set -e

cd /app/repository_after

echo "Running migrations..."
python manage.py migrate --noinput

echo "Setup complete!"
