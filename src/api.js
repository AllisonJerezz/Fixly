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
export function isAuthed() { return !!localStorage.getItem(K.ACCESS); }
export function getAuthUsername() { return localStorage.getItem(K.USERNAME) || ""; }
export function setAuth(username) {
  localStorage.setItem(K.ACCESS, "dummy-token");
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
export function saveProfile(profile) {
  const u = getAuthUsername();
  const raw = JSON.stringify(profile || {});
  localStorage.setItem(K.PROFILE, raw);
  if (u) localStorage.setItem(K.PROFILE_NS(u), raw);
}
export function hasOnboardingDone() {
  const u = getAuthUsername();
  return localStorage.getItem(K.DONE) === "1" || (u && localStorage.getItem(K.DONE_NS(u)) === "1");
}
export function setOnboardingDone() {
  const u = getAuthUsername();
  localStorage.setItem(K.DONE, "1");
  if (u) localStorage.setItem(K.DONE_NS(u), "1");
}

/* -------- Auth endpoints (ahora con validación real) -------- */
export async function register({ username, email, password }) {
  const u = String(username || "").trim().toLowerCase();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!u || !e || !p) throw new Error("Faltan campos");
  const users = _getUsers();

  if (users[u]) throw new Error("El usuario ya existe");
  if (Object.values(users).some((x) => x.emailLower === e)) {
    throw new Error("El email ya está registrado");
  }

  users[u] = { username: username.trim(), emailLower: e, password: p };
  _setUsers(users);

  // No autenticamos aquí; el usuario va al Login
  return { ok: true };
}

/** Login admite usuario o email */
export async function login(userOrEmail, password) {
  const id = String(userOrEmail || "").trim().toLowerCase();
  const p = String(password || "");

  const users = _getUsers();
  const byUser = users[id];
  const byEmail = Object.values(users).find((x) => x.emailLower === id);
  const account = byUser || byEmail;

  if (!account || account.password !== p) {
    throw new Error("Credenciales inválidas");
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

/* -------- Requests (localStorage) -------- */
const REQ_KEY = "requests";
function _readArray(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function _writeArray(key, arr) { localStorage.setItem(key, JSON.stringify(arr || [])); }
function _uid() { return String(Date.now()) + Math.random().toString(36).slice(2,6); }

export function lsGetRequests() { return _readArray(REQ_KEY); }
export function lsGetRequestById(id) {
  return lsGetRequests().find(x => String(x.id) === String(id)) || null;
}
export function lsCreateRequest(payload) {
  const id = String(Date.now());
  const ownerId = (localStorage.getItem(K.USERNAME) || "").trim().toLowerCase() || "guest";
  const item = {
    id, ownerId,
    title: payload.title?.trim() || "Solicitud",
    category: payload.category || "General",
    location: payload.location || "",
    urgency: payload.urgency || "normal",
    description: payload.description || "",
    createdAt: new Date().toISOString(),
    status: "pendiente",
    // Ofertas
    offers: [],               // [{ id, providerId, message, price, createdAt, status }]
    acceptedOfferId: null,    // id oferta aceptada
  };
  const list = lsGetRequests();
  list.unshift(item);
  _writeArray(REQ_KEY, list);
  return item;
}
export function lsUpdateRequest(id, patch) {
  const list = lsGetRequests();
  const i = list.findIndex(x => String(x.id) === String(id));
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  _writeArray(REQ_KEY, list);
  return list[i];
}
export function lsDeleteRequest(id) {
  const next = lsGetRequests().filter(x => String(x.id) !== String(id));
  _writeArray(REQ_KEY, next);
  return true;
}

/* -------- Perfil utils -------- */
export function currentUserKey() {
  return (localStorage.getItem(K.USERNAME) || "").trim().toLowerCase() || "guest";
}
export function isOwner(req) {
  const u = currentUserKey();
  return req?.ownerId === u;   // estricta
}
// === debajo de Requests ===
const SVCS_KEY = "services";
function _readArr(key){ try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}}
function _writeArr(key, arr){ localStorage.setItem(key, JSON.stringify(arr||[])) }

export function lsGetServices(){ return _readArr(SVCS_KEY); }
export function lsGetMyServices(){
  const me = currentUserKey();
  return lsGetServices().filter(s => s.ownerId === me);
}
export function lsCreateService(payload){
  const id = String(Date.now());
  const ownerId = currentUserKey();
  const item = {
    id, ownerId,
    title: (payload.title||"").trim() || "Servicio",
    category: payload.category || "General",
    priceFrom: Number(payload.priceFrom)||0, // precio base
    location: payload.location || "",
    description: payload.description || "",
    createdAt: new Date().toISOString(),
    status: "activo" // activo | pausado
  };
  const list = lsGetServices();
  list.unshift(item);
  _writeArr(SVCS_KEY, list);
  return item;
}
export function lsUpdateService(id, patch){
  const list = lsGetServices();
  const i = list.findIndex(s => String(s.id)===String(id));
  if(i===-1) return null;
  list[i] = { ...list[i], ...patch };
  _writeArr(SVCS_KEY, list);
  return list[i];
}
export function lsDeleteService(id){
  _writeArr(SVCS_KEY, lsGetServices().filter(s => String(s.id)!==String(id)));
  return true;
}
export const createService = lsCreateService;
export const getMyServices = lsGetMyServices;

/* ===================== OFERTAS ===================== */
export function lsGetOffers(requestId) {
  const r = lsGetRequestById(requestId);
  return r?.offers || [];
}
export function lsMyOffer(requestId) {
  const me = currentUserKey();
  return lsGetOffers(requestId).find(o => o.providerId === me) || null;
}
export function lsUpsertMyOffer(requestId, { message, price }) {
  const me = currentUserKey();
  const req = lsGetRequestById(requestId);
  if (!req) return null;

  const offers = Array.isArray(req.offers) ? [...req.offers] : [];
  const existing = offers.find(o => o.providerId === me);
  if (existing) {
    existing.message = String(message || "");
    existing.price = Number(price) || 0;
    existing.status = existing.status === "accepted" ? "accepted" : "pending";
  } else {
    offers.push({
      id: _uid(),
      providerId: me,
      message: String(message || ""),
      price: Number(price) || 0,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }
  const updated = lsUpdateRequest(requestId, { offers });
  return updated ? (existing || offers[offers.length - 1]) : null;
}
export function lsAcceptOffer(requestId, offerId) {
  const req = lsGetRequestById(requestId);
  if (!req) return null;
  const offers = (req.offers || []).map(o => ({ ...o, status: o.id === offerId ? "accepted" : "rejected" }));
  const patch = {
    offers,
    acceptedOfferId: offerId,
    status: req.status === "pendiente" ? "en progreso" : req.status,
  };
  return lsUpdateRequest(requestId, patch);
}
export function lsRejectOffer(requestId, offerId) {
  const req = lsGetRequestById(requestId);
  if (!req) return null;
  const offers = (req.offers || []).map(o => o.id === offerId ? { ...o, status: "rejected" } : o);
  return lsUpdateRequest(requestId, { offers });
}

/* Alias útil usado en otros archivos */
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
    contact: String(contact || ""), // opcional: email/teléfono
    createdAt: new Date().toISOString(),
    status: "nuevo", // nuevo | visto | respondido
  };
  const list = _readLeads();
  list.unshift(item);
  _writeLeads(list);
  return item;
}

/** Leads recibidos por el proveedor autenticado (para futuro “bandeja de entrada”) */
export function lsGetMyLeads() {
  const me = currentUserKey();
  return _readLeads().filter(x => x.providerId === me);
}
/* ===================== CHAT POR SOLICITUD ===================== */
const CHATS_KEY = "chats";
/*
Estructura en localStorage:
{
  [requestId]: [
    { id, requestId, from, to, text, ts }
  ],
  ...
}
*/
function _readChatsMap() { try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "{}"); } catch { return {}; } }
function _writeChatsMap(map) { localStorage.setItem(CHATS_KEY, JSON.stringify(map || {})); }

/** Devuelve participantes del chat para una solicitud (cliente y proveedor ganador), o null si aún no hay ganador. */
export function chatGetParticipants(requestId) {
  const req = lsGetRequestById(requestId);
  if (!req) return null;
  const client = req.ownerId;
  const winnerId = req.acceptedOfferId
    ? (req.offers || []).find(o => o.id === req.acceptedOfferId)?.providerId
    : null;
  if (!winnerId) return null;
  return { clientId: client, providerId: winnerId };
}

/** Verifica si el usuario actual está autorizado a chatear en esa solicitud */
export function chatIsAuthorized(requestId) {
  const parts = chatGetParticipants(requestId);
  if (!parts) return false;
  const me = currentUserKey();
  return me === parts.clientId || me === parts.providerId;
}

/** Obtiene mensajes (ordenados por ts asc) */
export function chatGetMessages(requestId) {
  const all = _readChatsMap();
  const list = all[requestId] || [];
  return list.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

/** Envía un mensaje. Deduce el `to` como el otro participante. */
export function chatSendMessage(requestId, text) {
  const parts = chatGetParticipants(requestId);
  if (!parts) throw new Error("No hay oferta aceptada para esta solicitud.");

  const me = currentUserKey();
  if (me !== parts.clientId && me !== parts.providerId) {
    throw new Error("No autorizado.");
  }
  const to = me === parts.clientId ? parts.providerId : parts.clientId;

  const map = _readChatsMap();
  const list = map[requestId] || [];
  const msg = {
    id: String(Date.now()) + Math.random().toString(36).slice(2,6),
    requestId: String(requestId),
    from: me,
    to,
    text: String(text || "").trim(),
    ts: new Date().toISOString(),
  };
  if (!msg.text) return null;
  list.push(msg);
  map[requestId] = list;
  _writeChatsMap(map);
  return msg;
}
const REVIEWS_KEY = "reviews";

function _readReviews(){ try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; } }
function _writeReviews(arr){ localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr || [])); }

export function lsAddReview({ requestId, toUserId, fromUserId, rating, comment }) {
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

export function lsGetReviewsForUser(userId) {
  const id = String(userId || "");
  return _readReviews().filter(r => r.toUserId === id);
}

export function lsHasReviewFromUserForRequest({ requestId, fromUserId }) {
  const req = String(requestId);
  const from = String(fromUserId || "");
  return _readReviews().some(r => r.requestId === req && r.fromUserId === from);
}

export function lsGetUserRatingStats(userId) {
  const arr = lsGetReviewsForUser(userId);
  const count = arr.length;
  const avg = count ? (arr.reduce((a, r) => a + (r.rating || 0), 0) / count) : 0;
  return { count, avg };
}