###########################
# Frontend build stage    #
###########################
FROM node:20-bullseye-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend .
RUN node node_modules/vite/bin/vite.js build

###########################
# Backend runtime stage    #
###########################
FROM python:3.11-slim


ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8080 \
    GUNICORN_WORKERS=2 \
    GUNICORN_THREADS=8 \
    GUNICORN_TIMEOUT=180


RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl ca-certificates imagemagick \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt


COPY backend /app/backend


COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/frontend/dist/icons \
    && [ -f /app/frontend/dist/icons/icon-192.png ] || convert -size 192x192 canvas:#0f172a /app/frontend/dist/icons/icon-192.png \
    && [ -f /app/frontend/dist/icons/icon-512.png ] || convert -size 512x512 canvas:#0f172a /app/frontend/dist/icons/icon-512.png

EXPOSE 8080


CMD ["sh", "-c", "cd /app/backend && exec gunicorn -w ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-8} -k gthread -t ${GUNICORN_TIMEOUT:-180} -b 0.0.0.0:${PORT:-8080} app:server"]


