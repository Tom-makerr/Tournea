FROM node:18-alpine

# Installer curl pour healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm ci --only=production && npm audit fix

# Copier app
COPY server.js .
COPY public/ ./public/

# Permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
