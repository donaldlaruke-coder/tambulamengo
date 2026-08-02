#!/bin/sh
set -e

echo "📦 Running Django database migrations..."
python manage.py migrate --noinput

echo "🚀 Starting Gunicorn server..."
exec "$@"
