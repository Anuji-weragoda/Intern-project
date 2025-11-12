const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || process.env.AUTH_URL || null;
const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID || null;
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET || null;
const AUTH_TOKEN_URL = process.env.AUTH_TOKEN_URL || (AUTH_SERVICE_URL ? `${AUTH_SERVICE_URL.replace(/\/$/, '')}/oauth/token` : null);
const USER_CACHE_TTL = Number(process.env.USER_CACHE_TTL || 60); // seconds

const userCache = new Map();
let serviceToken = null;

function nowSec() { return Math.floor(Date.now() / 1000); }

async function fetchServiceToken() {
  if (!AUTH_CLIENT_ID || !AUTH_CLIENT_SECRET || !AUTH_TOKEN_URL) return null;
  if (serviceToken && serviceToken.expires_at && serviceToken.expires_at > nowSec() + 5) return serviceToken.token;

  try {
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    const res = await fetch(AUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      timeout: 5000
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.access_token;
    const expires_in = data.expires_in || 300;
    serviceToken = { token, expires_at: nowSec() + expires_in };
    return token;
  } catch (err) {
    return null;
  }
}

async function fetchUserFromService(userId) {
  if (!AUTH_SERVICE_URL) return null;
  try {
    const token = await fetchServiceToken();
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${AUTH_SERVICE_URL.replace(/\/$/, '')}/api/v1/users/${userId}`, { headers, timeout: 5000 });
    if (res.status === 200) return await res.json();
    if (res.status === 404) return null;
    return null;
  } catch (err) {
    return null;
  }
}

// List users from authservice (requires AUTH_SERVICE_URL and client credentials)
async function listUsersFromService() {
  if (!AUTH_SERVICE_URL) return null;
  try {
    const token = await fetchServiceToken();
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${AUTH_SERVICE_URL.replace(/\/$/, '')}/api/v1/users`, { headers, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    // Expecting an array of users
    return Array.isArray(data) ? data : (data.users || null);
  } catch (err) {
    return null;
  }
}

async function userExists(userId) {
  if (!userId) return false;
  if (!AUTH_SERVICE_URL) return true; // permissive fallback for dev

  const cached = userCache.get(userId);
  if (cached && cached.expires_at > Date.now()) return cached.value !== null;

  const user = await fetchUserFromService(userId);
  userCache.set(userId, { value: user, expires_at: Date.now() + USER_CACHE_TTL * 1000 });
  return user !== null;
}

async function getUser(userId) {
  if (!userId) return null;
  if (!AUTH_SERVICE_URL) return { id: userId };
  const cached = userCache.get(userId);
  if (cached && cached.expires_at > Date.now()) return cached.value;
  const user = await fetchUserFromService(userId);
  userCache.set(userId, { value: user, expires_at: Date.now() + USER_CACHE_TTL * 1000 });
  return user;
}

export default { userExists, getUser, listUsersFromService };
