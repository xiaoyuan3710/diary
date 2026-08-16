// db.js —— IndexedDB 封装
// 数据库：diary-db
//   仓库 entries  —— 日记（keyPath: date，如 "2026-08-16"）
//   仓库 capsules —— 时光胶囊（keyPath: id，自增）

const DB_NAME = 'diary-db';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('capsules')) {
        db.createObjectStore('capsules', { keyPath: 'id', autoIncrement: true });
      }
    };
    r.onsuccess = () => { _db = r.result; resolve(_db); };
    r.onerror = () => reject(r.error);
  });
}

// 把 IndexedDB 的 request 包装成 Promise
function asPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===== 日记 entries =====

async function getEntry(date) {
  const db = await openDB();
  const req = db.transaction('entries', 'readonly').objectStore('entries').get(date);
  return asPromise(req);
}

async function putEntry(entry) {
  const db = await openDB();
  const req = db.transaction('entries', 'readwrite').objectStore('entries').put(entry);
  return asPromise(req);
}

async function getAllEntries() {
  const db = await openDB();
  const req = db.transaction('entries', 'readonly').objectStore('entries').getAll();
  const result = await asPromise(req);
  return result || [];
}

async function deleteEntry(date) {
  const db = await openDB();
  const req = db.transaction('entries', 'readwrite').objectStore('entries').delete(date);
  return asPromise(req);
}

// ===== 时光胶囊 capsules =====

async function addCapsule(capsule) {
  const db = await openDB();
  const req = db.transaction('capsules', 'readwrite').objectStore('capsules').add(capsule);
  return asPromise(req); // 返回自增生成的 id
}

async function getAllCapsules() {
  const db = await openDB();
  const req = db.transaction('capsules', 'readonly').objectStore('capsules').getAll();
  const result = await asPromise(req);
  return result || [];
}

async function updateCapsule(capsule) {
  const db = await openDB();
  const req = db.transaction('capsules', 'readwrite').objectStore('capsules').put(capsule);
  return asPromise(req);
}

async function deleteCapsule(id) {
  const db = await openDB();
  const req = db.transaction('capsules', 'readwrite').objectStore('capsules').delete(id);
  return asPromise(req);
}
