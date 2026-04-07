import { PublicClientApplication } from '@azure/msal-browser';

// ══════════════════════════════════════════════════════════════
// Configuration MSAL — Microsoft Entra ID (Azure AD)
//
// Pour activer la synchro Outlook :
// 1. Aller sur https://portal.azure.com → Azure Active Directory → App registrations
// 2. New registration → nom : "Gestion Marchés UNICANCER"
// 3. Redirect URI : http://localhost:5173 (dev) + URL prod
// 4. Type : SPA (Single Page Application)
// 5. Copier le Client ID ci-dessous
// ══════════════════════════════════════════════════════════════

const MSAL_CONFIG = {
  auth: {
    // Remplacer par le vrai Client ID de l'app registration Azure AD
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: import.meta.env.VITE_AZURE_AUTHORITY || 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Permissions nécessaires pour créer/modifier les contacts Outlook
const LOGIN_SCOPES = {
  scopes: ['User.Read', 'Contacts.ReadWrite'],
};

let msalInstance = null;

export function getMsalInstance() {
  if (!msalInstance && MSAL_CONFIG.auth.clientId) {
    msalInstance = new PublicClientApplication(MSAL_CONFIG);
  }
  return msalInstance;
}

export function isConfigured() {
  return !!MSAL_CONFIG.auth.clientId;
}

export async function initMsal() {
  const instance = getMsalInstance();
  if (!instance) return null;
  await instance.initialize();
  return instance;
}

export async function loginMicrosoft() {
  const instance = await initMsal();
  if (!instance) throw new Error('MSAL non configuré — ajouter VITE_AZURE_CLIENT_ID dans .env');

  try {
    const response = await instance.loginPopup(LOGIN_SCOPES);
    return response;
  } catch (err) {
    if (err.errorCode === 'user_cancelled') return null;
    throw err;
  }
}

export async function getAccessToken() {
  const instance = await initMsal();
  if (!instance) return null;

  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const response = await instance.acquireTokenSilent({
      ...LOGIN_SCOPES,
      account: accounts[0],
    });
    return response.accessToken;
  } catch {
    // Token expiré → re-login
    const response = await instance.acquireTokenPopup(LOGIN_SCOPES);
    return response.accessToken;
  }
}

export function getAccount() {
  const instance = getMsalInstance();
  if (!instance) return null;
  const accounts = instance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

export async function logoutMicrosoft() {
  const instance = await initMsal();
  if (!instance) return;
  await instance.logoutPopup();
}
