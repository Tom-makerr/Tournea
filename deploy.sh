#!/bin/bash

# Script de déploiement sécurisé - La Poste RH

echo "🔒 Déploiement La Poste RH"

# 1. Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non installé"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# 2. Installer dépendances
echo "📦 Installation dépendances..."
npm install
npm audit fix

# 3. Vérifier .env
if [ ! -f .env ]; then
    echo "⚠️  Copie .env.example -> .env"
    cp .env.example .env
    echo "❌ Veuillez éditer .env avec vos paramètres"
    exit 1
fi

# 4. Générer certificats SSL (dev)
if [ ! -f cert.pem ] || [ ! -f key.pem ]; then
    echo "🔐 Génération certificats SSL..."
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
        -subj "/C=FR/ST=France/L=Paris/O=LaPoste/CN=localhost"
    echo "✅ Certificats générés (dev only)"
fi

# 5. Lancer serveur
echo "🚀 Démarrage serveur..."
NODE_ENV=production npm start
