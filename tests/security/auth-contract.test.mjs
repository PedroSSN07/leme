import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../script.js', import.meta.url), 'utf8');

function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return source.slice(from, to);
}

test('reconciles administrator state from the Firebase custom claim', () => {
  assert.match(source, /onAuthStateChanged/);
  assert.match(source, /getIdTokenResult\(\)/);
  assert.match(source, /claims\.admin === true/);
  assert.match(source, /setAdminUi\(hasAdminClaim\)/);
});

test('stale claim lookups cannot restore administrator UI', () => {
  assert.match(source, /let authStateGeneration\s*=\s*0/);
  assert.match(source, /const generation\s*=\s*\+\+authStateGeneration/);
  assert.match(source, /setAdminUi\(false\)[\s\S]*reconcileAdminState\(user, generation\)/);
  assert.match(source, /generation !== authStateGeneration/);
  assert.match(source, /auth\.currentUser\?\.uid !== user\?\.uid/);
});

test('login never grants administrator state directly', () => {
  const login = between('window.verifyAdmin = async function ()', 'function renderProducts');
  assert.doesNotMatch(login, /isAdmin\s*=\s*true/);
  assert.match(login, /signInWithEmailAndPassword/);
});

test('a successful non-admin login is signed out', () => {
  assert.match(source, /pendingAdminLogin/);
  assert.match(source, /if \(pendingAdminLogin && !hasAdminClaim\)/);
  assert.match(source, /await signOut\(auth\)/);
});

test('empty catalog loading never writes default products anonymously', () => {
  const loader = between('async function loadProducts()', "document.addEventListener('DOMContentLoaded'");
  assert.doesNotMatch(loader, /setDoc\s*\(/);
  assert.match(loader, /defaultProducts\.map\(normalizeProduct\)/);
});
