###########################
# Frontend build stage    #
###########################
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend .
RUN npm run build

###########################
# Backend runtime stage    #
###########################
FROM python:3.11-slim

# Evitar .pyc e forçar logs em stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8080

# Dependências básicas (bcrypt/pandas wheels costumam funcionar sem build, mas deixamos build-essential se necessário)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependências Python
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copiar backend
COPY backend /app/backend

# Copiar frontend build para ser servido pelo Flask
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8080

# Rodar via gunicorn na porta $PORT (Fly.io define automaticamente)
CMD ["sh", "-c", "cd /app/backend && exec gunicorn -w 1 -k gthread -t 120 -b 0.0.0.0:${PORT:-8080} app:server"]


