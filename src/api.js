
// console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// src/api.js
const K = {
  ACCESS: "auth:access",
  USERNAME: "auth:username",
  PROFILE: "profile",
  PROFILE_NS: (u) => `profile:${u}`,
  DONE: "onboarding:done",
  DONE_NS: (u) => `onboarding:done:${u}`,
};

/* ========= Credenciales (localStorage) =========
   Estructura: { usernameLower: { username, emailLower, password } }
*/
const USERS_KEY = "users";
function _getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; }
}
function _setUsers(map) {
  localStorage.setItem(USERS_KEY, JSON.stringify(map || {}));
}

/* -------- Auth -------- */
function _authToken(){ return (localStorage.getItem(K.ACCESS) || "").trim(); }
async function _fetchJSON(path, { method = 'GET', body, headers } = {}){
  const token = _authToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { data = null; }
  if (!res.ok) { throw new Error(data?.error || data?.message || `Error ${res.status}`); }
  return data;
}
export async function pingApi() {
  const url = `${API}/health`;
  console.log("Haciendo ping a:", url);
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  console.log("Respuesta /health:", r.status, data);
  return { status: r.status, data };
}


export function isAuthed() { return !!localStorage.getItem(K.ACCESS); }
export function getAuthUsername() { return localStorage.getItem(K.USERNAME) || ""; }
export function setAuth(username, token) {
  localStorage.setItem(K.ACCESS, (token || "dummy-token"));
  localStorage.setItem(K.USERNAME, (username || "").trim().toLowerCase());
}
export function logout() {
  localStorage.removeItem(K.ACCESS);
  localStorage.removeItem(K.USERNAME);
  localStorage.removeItem(K.PROFILE);
  localStorage.removeItem(K.DONE);
}

/* -------- Perfil -------- */
export function readProfile() {
  try { return JSON.parse(localStorage.getItem(K.PROFILE) || "null"); } catch { return null; }
}
function mergeWithPrevIdentity(profile) {
const u = getAuthUsername();
let prev = null;
try { prev = JSON.parse(localStorage.getItem(K.PROFILE) || "null"); } catch {}
const merged = { ...(prev || {}), ...(profile || {}) };
if (!merged.id && u) {
try {
const ns = JSON.parse(localStorage.getItem(K.PROFILE_NS(u)) || "null");
if (ns && ns.id) merged.id = ns.id;
if (ns && ns.username && !merged.username) merged.username = ns.username;
if (ns && ns.email && !merged.email) merged.email = ns.email;
} catch {}
}
return merged;
}

export function saveProfile(profile) {
  const u = getAuthUsername();
  const merged = mergeWithPrevIdentity(profile);

  // Payload para backend (snake_case)
  const payload = { ...(profile || {}) };
  if (profile?.displayName) payload.display_name = profile.displayName;
  // Solo enviamos al backend si es una URL válida (evitamos dataURL base64 que no pasa el URLField)
  if (profile?.photoURL && /^https?:\/\//i.test(profile.photoURL)) {
    payload.photo_url = profile.photoURL;
  } else {
    // la guardamos localmente aunque no vaya al backend
    merged.photoURL = profile?.photoURL || merged.photoURL || "";
  }

  const raw = JSON.stringify(merged || {});
  localStorage.setItem(K.PROFILE, raw);
  if (u) localStorage.setItem(K.PROFILE_NS(u), raw);

  // Sincroniza y refresca cache con id completo (no bloqueante)
  (async () => {
    try {
      await _fetchJSON('/profile', { method: 'PUT', body: payload });
      try {
        const me = await _fetchJSON('/profile');
        const cache = me?.profile
          ? { id: me.id, ...me.profile, username: me.username, email: me.email }
          : { id: me?.id, username: me?.username, email: me?.email };
        // normaliza campos y preserva foto/nombre si no vienen del backend
        cache.displayName = cache.displayName || cache.display_name || merged.displayName || "";
        cache.photoURL = cache.photoURL || cache.photo_url || merged.photoURL || "";
        const fullRaw = JSON.stringify(cache || {});
        localStorage.setItem(K.PROFILE, fullRaw);
        const uu = getAuthUsername();
        if (uu) localStorage.setItem(K.PROFILE_NS(uu), fullRaw);
      } catch {}
    } catch {}
  })();
}

// Obtiene rÃ¡pidamente el ID del usuario autenticado desde el backend
export async function fetchMyProfile() {
  try { return await _fetchJSON('/profile'); } catch { return null; }
}
export async function fetchMyId() {
  const p = await fetchMyProfile();
  return p?.id || '';
}
export function hasOnboardingDone() {
  const u = getAuthUsername();
  const cached = readProfile();
  const byRole = cached?.role === 'client' || cached?.role === 'provider';
  return byRole || localStorage.getItem(K.DONE) === "1" || (u && localStorage.getItem(K.DONE_NS(u)) === "1");
}
export function setOnboardingDone() {
  const u = getAuthUsername();
  localStorage.setItem(K.DONE, "1");
  if (u) localStorage.setItem(K.DONE_NS(u), "1");
}

/* -------- Auth endpoints (ahora con validaciÃ³n real) -------- */
async function registerLocal({ username, email, password }) {
  const u = String(username || "").trim().toLowerCase();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!u || !e || !p) throw new Error("Faltan campos");
  const users = _getUsers();

  if (users[u]) throw new Error("El usuario ya existe");
  if (Object.values(users).some((x) => x.emailLower === e)) {
    throw new Error("El email ya estÃƒÆ’Ã‚Â¡ registrado");
  }

  users[u] = { username: username.trim(), emailLower: e, password: p };
  _setUsers(users);

  // No autenticamos aquÃƒÆ’Ã‚Â­; el usuario va al Login
  return { ok: true };
}

/** Login admite usuario o email */
async function loginLocal(userOrEmail, password) {
  const id = String(userOrEmail || "").trim().toLowerCase();
  const p = String(password || "");

  const users = _getUsers();
  const byUser = users[id];
  const byEmail = Object.values(users).find((x) => x.emailLower === id);
  const account = byUser || byEmail;

  if (!account || account.password !== p) {
    throw new Error("Credenciales invÃ¡lidas");
  }

  // Autentica y sincroniza perfil + onboarding previos
  setAuth(account.username);
  const u = getAuthUsername();
  const savedProfile = localStorage.getItem(K.PROFILE_NS(u));
  if (savedProfile) localStorage.setItem(K.PROFILE, savedProfile);
  if (localStorage.getItem(K.DONE_NS(u)) === "1") {
    localStorage.setItem(K.DONE, "1");
  }
  return { ok: true };
}

/* -------- Requests (API) -------- */
function _uid() { return String(Date.now()) + Math.random().toString(36).slice(2,6); }

export async function lsGetRequests() {
  const list = await _fetchJSON('/requests');
  return Array.isArray(list) ? list : [];
}
export async function lsGetRequestById(id) {
  try { return await _fetchJSON(`/requests/${id}`); } catch { return null; }
}
export async function lsCreateRequest(payload) {
  const created = await _fetchJSON('/requests', { method: 'POST', body: {
    title: payload.title?.trim() || 'Solicitud',
    category: payload.category || 'General',
    location: payload.location || '',
    urgency: payload.urgency || 'normal',
    description: payload.description || '',
    budget: payload.budget ?? 0,
  }});
  return created;
}
export async function lsUpdateRequest(id, patch) {
  try { return await _fetchJSON(`/requests/${id}`, { method: 'PUT', body: patch }); } catch { return null; }
}
export async function lsDeleteRequest(id) {
  await _fetchJSON(`/requests/${id}`, { method: 'DELETE' });
  return true;
}

/* -------- Perfil utils -------- */
export function currentUserKey() {
  try {
    const p = readProfile();
    if (p && p.id) return String(p.id);
  } catch {}
  return (localStorage.getItem(K.USERNAME) || "").trim().toLowerCase() || "guest";
}
export function isOwner(req) {
  const u = currentUserKey();
  // Compatibilidad: backend viejo (ownerId) y Django (owner pk) o posible objeto
  const ownerVal = req?.owner;
  const ownerId = req?.ownerId || (ownerVal && typeof ownerVal === 'object' ? ownerVal.id : ownerVal);
  return ownerId === u;
}
// === Servicios (API) ===
export async function lsGetServices(){
  const list = await _fetchJSON('/services');
  return Array.isArray(list) ? list : [];
}
export async function lsGetMyServices(){
  const list = await _fetchJSON('/services/me');
  return Array.isArray(list) ? list : [];
}
export async function lsCreateService(payload){
  const created = await _fetchJSON('/services', { method: 'POST', body: {
    title: (payload.title||'').trim() || 'Servicio',
    category: payload.category || 'General',
    custom_category: payload.customCategory || '',
    priceFrom: Number(payload.priceFrom)||0,
    location: payload.location || '',
    description: payload.description || '',
  }});
  return created;
}
export async function lsUpdateService(id, patch){
  try { return await _fetchJSON(`/services/${id}`, { method: 'PUT', body: patch }); } catch { return null; }
}
export async function lsDeleteService(id){ await _fetchJSON(`/services/${id}`, { method: 'DELETE' }); return true; }
export const createService = lsCreateService;
export const getMyServices = lsGetMyServices;

/* ===================== OFERTAS ===================== */
export async function lsGetOffers(requestId) {
  const list = await _fetchJSON(`/requests/${requestId}/offers`);
  return Array.isArray(list) ? list : [];
}
export async function lsMyOffer(requestId) {
  const me = currentUserKey();
  const list = await lsGetOffers(requestId);
  return list.find(o => o.providerId === me) || null;
}
export async function lsUpsertMyOffer(requestId, { message, price }) {
  const offer = await _fetchJSON(`/requests/${requestId}/offers`, { method: 'POST', body: {
    message: String(message||''),
    price: Number(price)||0,
  }});
  return offer;
}
export async function lsAcceptOffer(requestId, offerId) {
  await _fetchJSON(`/requests/${requestId}/offers/${offerId}/accept`, { method: 'POST' });
  return await lsGetRequestById(requestId);
}
export async function lsRejectOffer(requestId, offerId) {
  await _fetchJSON(`/requests/${requestId}/offers/${offerId}/reject`, { method: 'POST' });
  return await lsGetRequestById(requestId);
}

/* Alias Ãºtil usado en otros archivos */
export const createRequest = lsCreateRequest;

// --- PERFIL DE OTRO USUARIO (por usernameLower) ---
export function readProfileOf(usernameLower) {
  try {
    const key = K.PROFILE_NS((usernameLower || "").trim().toLowerCase());
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

/* ===================== LEADS (contactos por servicio) ===================== */
const LEADS_KEY = "service_leads";
function _readLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]"); } catch { return []; }
}
function _writeLeads(arr) { localStorage.setItem(LEADS_KEY, JSON.stringify(arr || [])); }

/** Crea un lead del cliente actual hacia el proveedor de un servicio */
export function lsCreateLead({ serviceId, providerId, message, contact }) {
  const id = String(Date.now());
  const clientId = currentUserKey();
  const item = {
    id,
    serviceId: String(serviceId || ""),
    providerId: String(providerId || ""),
    clientId: String(clientId || ""),
    message: String(message || ""),
    contact: String(contact || ""), // opcional: email/telÃ©fono
    createdAt: new Date().toISOString(),
    status: "nuevo", // nuevo | visto | respondido
  };
  const list = _readLeads();
  list.unshift(item);
  _writeLeads(list);
  return item;
}

/** Leads recibidos por el proveedor autenticado */
export function lsGetMyLeads() {
  const me = currentUserKey();
  return _readLeads().filter(x => x.providerId === me);
}
/* ===================== CHAT (API) ===================== */
export async function chatGetParticipants(requestId) {
  const req = await lsGetRequestById(requestId);
  if (!req) return null;
  const client = req.ownerId || req.owner;
  const winner = (Array.isArray(req.offers) ? req.offers : []).find(o => String(o.status || '').toLowerCase() === 'accepted')
    || (req.acceptedOfferId ? (req.offers || []).find(o => o.id === req.acceptedOfferId) : null);
  if (!winner) return null;
  return { clientId: client, providerId: winner.providerId };
}

export async function chatIsAuthorized(requestId) {
  const parts = await chatGetParticipants(requestId);
  if (!parts) return false;
  const me = currentUserKey();
  return me === parts.clientId || me === parts.providerId;
}

export async function chatGetMessages(requestId) {
  return await _fetchJSON(`/chats/${requestId}/messages`);
}

export async function chatSendMessage(requestId, text) {
  const parts = await chatGetParticipants(requestId);
  if (!parts) throw new Error('No hay oferta aceptada para esta solicitud.');
  const me = currentUserKey();
  if (me !== parts.clientId && me !== parts.providerId) {
    throw new Error('No autorizado.');
  }
  return await _fetchJSON(`/chats/${requestId}/messages`, { method: 'POST', body: { text } });
}

/* ===================== ASSISTANT (IA LOCAL) ===================== */
export async function assistantChat({ message, history = [] }) {
  if (!String(message || '').trim()) throw new Error('Ingresa un mensaje');
  return await _fetchJSON('/assistant/chat', { method: 'POST', body: { message, history } });
}

const REVIEWS_KEY = "reviews";

function _readReviews(){ try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; } }
function _writeReviews(arr){ localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr || [])); }

export async function lsAddReview({ requestId, toUserId, fromUserId, rating, comment }) {
  // Intento real contra backend
  try {
    const body = { request: requestId, to_user: toUserId, rating: Number(rating), comment: String(comment || '').trim() };
    const res = await _fetchJSON('/reviews', { method: 'POST', body });
    return res;
  } catch (e) {
    // Fallback a localStorage si el backend no estÃ¡ disponible
    const list = _readReviews();
    const item = {
      id: String(Date.now()),
      requestId: String(requestId),
      toUserId: String(toUserId || ""),
      fromUserId: String(fromUserId || ""),
      rating: Math.max(1, Math.min(5, Number(rating) || 0)),
      comment: String(comment || "").trim(),
      createdAt: new Date().toISOString(),
    };
    list.push(item);
    _writeReviews(list);
    return item;
  }
}

export function lsGetReviewsForUser(userId) {
  const id = String(userId || "");
  return _readReviews().filter(r => r.toUserId === id);
}

export async function lsHasReviewFromUserForRequest({ requestId, fromUserId, providerId }) {
  const req = String(requestId);
  // Intento real contra backend si tengo providerId
  if (providerId) {
    try {
      const meId = await fetchMyId();
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const r = await fetch(`${base}/users/${providerId}/reviews`);
      const arr = await r.json();
      if (r.ok && Array.isArray(arr)) {
        return arr.some((x) => String(x.request) === req && String(x.from_user) === String(meId));
      }
    } catch {}
  }
  // Fallback local
  const from = String(fromUserId || "");
  return _readReviews().some((r) => r.requestId === req && r.fromUserId === from);
}

export function lsGetUserRatingStats(userId) {
  const arr = lsGetReviewsForUser(userId);
  const count = arr.length;
  const avg = count ? (arr.reduce((a, r) => a + (r.rating || 0), 0) / count) : 0;
  return { count, avg };
}

// --- AutenticaciÃ³n con backend ---
export async function register({ username, email, password }) {
  const u = String(username || "").trim().toLowerCase();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (!u || !e || !p) throw new Error("Faltan campos");
  await _fetchJSON('/auth/register', { method: 'POST', body: { username: u, email: e, password: p } });
  return { ok: true };
}

export async function login(userOrEmail, password) {
  const id = String(userOrEmail || "").trim().toLowerCase();
  const p = String(password || "");
  if (!id || !p) throw new Error('Faltan credenciales');
  let data;
  try {
    data = await _fetchJSON('/auth/login', { method: 'POST', body: { userOrEmail: id, password: p } });
  } catch (e) {
    const msg = String(e?.message || '').toLowerCase();
    if (msg.includes('no verificado')) {
      // Disparar envÃ­o de verificaciÃ³n en background
      try { await sendVerification({ userOrEmail: id }); } catch {}
    }
    throw e;
  }
  const username = data?.user?.username || id;
  const token = data?.token || '';
  setAuth(username, token);
  // Cachea perfil del backend si está disponible
  try {
    const me = await _fetchJSON('/profile');
    const cache = me?.profile
      ? { id: me.id, ...me.profile, username: me.username, email: me.email }
      : { id: me?.id, username: me?.username, email: me?.email };
    const local = readProfile() || {};
    cache.displayName = cache.displayName || cache.display_name || local.displayName || local.display_name || "";
    cache.photoURL = cache.photoURL || cache.photo_url || local.photoURL || local.photo_url || "";
    const raw = JSON.stringify(cache || {});
    localStorage.setItem(K.PROFILE, raw);
    const u = getAuthUsername();
    if (u) localStorage.setItem(K.PROFILE_NS(u), raw);
    if (cache?.role === 'client' || cache?.role === 'provider') {
      localStorage.setItem(K.DONE, '1');
      if (u) localStorage.setItem(K.DONE_NS(u), '1');
    }
  } catch {}
  return { ok: true };
}

export async function fetchProfileAndCache(){
  const me = await _fetchJSON('/profile');
  const cache = me?.profile
    ? { id: me.id, ...me.profile, username: me.username, email: me.email }
    : { id: me?.id, username: me?.username, email: me?.email };
  const local = readProfile() || {};
  cache.displayName = cache.displayName || cache.display_name || local.displayName || local.display_name || "";
  cache.photoURL = cache.photoURL || cache.photo_url || local.photoURL || local.photo_url || "";
  const raw = JSON.stringify(cache || {});
  localStorage.setItem(K.PROFILE, raw);
  const u = getAuthUsername();
  if (u) localStorage.setItem(K.PROFILE_NS(u), raw);
  return cache;
}

// ===== Password reset =====
export async function requestPasswordReset(email) {
  const body = { email: String(email || '').trim().toLowerCase() };
  return await _fetchJSON('/auth/password-reset', { method: 'POST', body });
}

export async function confirmPasswordReset({ uid, token, password }) {
  const body = {
    uid: String(uid || '').trim(),
    token: String(token || '').trim(),
    password: String(password || ''),
  };
  return await _fetchJSON('/auth/password-reset/confirm', { method: 'POST', body });
}

export async function changePassword({ oldPassword, newPassword }) {
  const body = {
    oldPassword: String(oldPassword || '').trim(),
    newPassword: String(newPassword || '').trim(),
  };
  return await _fetchJSON('/auth/password-change', { method: 'POST', body });
}

// ===== VerificaciÃ³n de email =====
export async function sendVerification({ userOrEmail } = {}) {
  try {
    return await _fetchJSON('/auth/send-verification', { method: 'POST', body: userOrEmail ? { userOrEmail } : {} });
  } catch (e) {
    return { ok: false, error: e?.message || 'No se pudo enviar verificaciÃ³n' };
  }
}

export async function verifyEmail(uid, token) {
  const q = `uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
  return await _fetchJSON(`/auth/verify?${q}`);
}


