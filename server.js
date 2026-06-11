require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const httpProxy = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// ─────── SÉCURITÉ ────────
// Headers de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Compatible proxy entreprise
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.ALLOWED_ORIGIN || 'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS non autorisé'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par IP
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limite stricte pour auth (5 tentatives)
  skipSuccessfulRequests: true,
});

app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─────── CHIFFREMENT ────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─────── AUTHENTIFICATION JWT ────────
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }

  req.user = decoded;
  next();
}

// ─────── PROTECTION CSRF ────────
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

// ─────── DONNÉES (Stockage simple - utiliser DB en prod) ────────
let users = [
  {
    id: 1,
    email: 'admin@laposte.fr',
    password: '$2b$10$YourHashedPasswordHere', // Utiliser bcrypt en prod
    role: 'admin'
  }
];

let teams = [];
let data = {};

// ─────── ROUTES ────────

// Health check (sans authentification)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', authLimiter, csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // En production, utiliser bcrypt.compare()
    const validPassword = password === 'admin123'; // À remplacer

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout (validation token)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Déconnecté' });
});

// Refresh token
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  const newToken = generateToken(req.user);
  res.json({ token: newToken });
});

// GET CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ─────── DONNÉES SÉCURISÉES ────────

// Récupérer données équipe (authentifié)
app.get('/api/teams/:teamId/data', authenticateToken, (req, res) => {
  try {
    const { teamId } = req.params;
    const teamData = data[teamId];

    if (!teamData) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }

    // Chiffrer les données sensibles avant envoi
    const encrypted = encrypt(JSON.stringify(teamData));
    res.json({ encrypted });
  } catch (err) {
    console.error('Erreur récupération données:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Sauvegarder données équipe (authentifié + CSRF)
app.post('/api/teams/:teamId/data', authenticateToken, csrfProtection, express.json(), (req, res) => {
  try {
    const { teamId } = req.params;
    const { encrypted } = req.body;

    if (!encrypted) {
      return res.status(400).json({ error: 'Données requises' });
    }

    // Déchiffrer et valider
    const decrypted = decrypt(encrypted);
    const teamData = JSON.parse(decrypted);

    // Sauvegarder
    data[teamId] = teamData;

    res.json({ message: 'Données sauvegardées' });
  } catch (err) {
    console.error('Erreur sauvegarde données:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────── PROXY SUPPORT ────────
// Gérer X-Forwarded-* headers pour proxy
app.set('trust proxy', true);

app.use((req, res, next) => {
  // Logging avec proxy info
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.ip) console.log(`  IP: ${req.ip}`);
  if (req.get('x-forwarded-for')) console.log(`  X-Forwarded-For: ${req.get('x-forwarded-for')}`);
  next();
});

// ─────── FICHIERS STATIQUES ────────
app.use(express.static(path.join(__dirname, 'public')));

// ─────── PAGE PRINCIPALE ────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────── GESTION ERREURS ────────
app.use((err, req, res, next) => {
  console.error('Erreur:', err);

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'CSRF invalide' });
  }

  res.status(500).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─────── DÉMARRAGE SERVEUR ────────
// HTTPS en production
if (process.env.NODE_ENV === 'production' && fs.existsSync('cert.pem') && fs.existsSync('key.pem')) {
  const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`🔒 Serveur HTTPS démarré sur https://localhost:${PORT}`);
    console.log(`📝 JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`⚠️  Mode développement - Utiliser HTTPS en production`);
  });
}

module.exports = app;
