/* Sécurité Client - Requêtes chiffrées */

class SecureAPI {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
    this.csrfToken = null;
  }

  // Initialiser CSRF
  async initCSRF() {
    try {
      const response = await fetch(`${this.baseURL}/csrf-token`);
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (err) {
      console.error('Erreur CSRF:', err);
    }
  }

  // Requête générique sécurisée
  async request(method, endpoint, body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const options = {
      method,
      headers,
      credentials: 'include' // Important pour proxy
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, options);

      if (response.status === 401) {
        // Token expiré - refresh
        await this.refreshToken();
        return this.request(method, endpoint, body);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur requête');
      }

      return await response.json();
    } catch (err) {
      console.error(`Erreur ${method} ${endpoint}:`, err);
      throw err;
    }
  }

  // Login
  async login(email, password) {
    await this.initCSRF();
    const data = await this.request('POST', '/auth/login', { email, password });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }

  // Logout
  async logout() {
    await this.request('POST', '/auth/logout');
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Refresh token
  async refreshToken() {
    try {
      const data = await this.request('POST', '/auth/refresh');
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
    } catch (err) {
      this.logout();
    }
  }

  // Chiffrer données
  encryptData(data) {
    // Utiliser TweetNaCl.js ou libsodium.js en production
    return btoa(JSON.stringify(data)); // Base64 temporaire
  }

  // Déchiffrer données
  decryptData(encrypted) {
    try {
      return JSON.parse(atob(encrypted));
    } catch (err) {
      console.error('Erreur déchiffrement:', err);
      return null;
    }
  }

  // Récupérer données équipe
  async getTeamData(teamId) {
    const response = await this.request('GET', `/teams/${teamId}/data`);
    if (response.encrypted) {
      return this.decryptData(response.encrypted);
    }
    return response;
  }

  // Sauvegarder données équipe
  async saveTeamData(teamId, data) {
    const encrypted = this.encryptData(data);
    return this.request('POST', `/teams/${teamId}/data`, { encrypted });
  }
}

// Exporter
window.SecureAPI = SecureAPI;
