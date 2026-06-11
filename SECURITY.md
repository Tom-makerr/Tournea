# 🔒 Guide Sécurité - La Poste RH

## Installation & Configuration

### 1. Installation dépendances
```bash
npm install
```

### 2. Configurer variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 3. Générer certificats SSL/TLS (Production)
```bash
npm run build-ssl
# Ou avec Let's Encrypt pour domaine réel
```

## 🔐 Fonctionnalités de Sécurité

### ✅ Authentification JWT
- Tokens JWT avec expiration 24h
- Refresh automatique des tokens
- Rate limiting strict (5 tentatives/15min)

### ✅ Chiffrement AES-256
- Données sensibles chiffrées côté serveur
- IV aléatoire pour chaque chiffrement
- Déchiffrement à la réception

### ✅ Protection CSRF
- Tokens CSRF validés sur POST/PUT/DELETE
- Compatible avec proxy entreprise

### ✅ Headers de Sécurité
- Helmet.js pour sécurité HTTP
- CSP (Content Security Policy)
- X-Frame-Options, X-Content-Type-Options, etc.

### ✅ Rate Limiting
- 100 requêtes/15min par IP
- 5 tentatives login/15min
- Compatible avec X-Forwarded-For (proxy)

### ✅ CORS Sécurisé
- Whitelist d'origines
- Credentials inclus pour proxy
- Préflight requests

## 🌐 Compatibilité Proxy Entreprise

L'application supporte :
- Proxies HTTP/HTTPS
- Authentification proxy
- Headers X-Forwarded-*
- Cookies persistants
- WebSockets (si nécessaire)

### Configuration Proxy

**Côté serveur** :
```javascript
app.set('trust proxy', true); // Déjà configuré
```

**Côté client** :
```javascript
fetch(url, {
  credentials: 'include' // Envoyer cookies à travers proxy
})
```

## 📋 Déploiement Production

### 1. Heroku
```bash
heroku create laposte-rh
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
git push heroku main
```

### 2. VPS (Nginx reverse proxy)
```nginx
server {
  listen 443 ssl;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### 3. Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🛡️ Bonnes Pratiques

1. **Secrets** : Jamais dans le code, utiliser `.env`
2. **Logs** : Ne pas logger mots de passe/tokens
3. **HTTPS** : Obligatoire en production
4. **Mise à jour** : `npm audit fix`
5. **Monitoring** : Activer logs d'erreur

## ⚠️ À Faire Avant Production

- [ ] Changer JWT_SECRET dans `.env`
- [ ] Changer ENCRYPTION_KEY (32 bytes)
- [ ] Configurer DATABASE_URL pour persistance
- [ ] Activer HTTPS avec certificats valides
- [ ] Ajouter authentification forte (Oauth2, LDAP)
- [ ] Tester avec proxy réel La Poste
- [ ] Audit sécurité externe
- [ ] Configurer WAF (Web Application Firewall)

## 📞 Support

Pour questions proxy La Poste : contactez `infracom@laposte.fr`
