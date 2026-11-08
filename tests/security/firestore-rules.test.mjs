import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readRules = () => readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

test('firebase configuration deploys the repository rules file', () => {
  const config = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
  assert.equal(config.firestore.rules, 'firestore.rules');
});

test('catalog reads are public and writes require the admin claim', () => {
  const rules = readRules();
  assert.match(rules, /match \/produtos\/\{productId\}/);
  assert.match(rules, /allow read:\s*if true;/);
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /request\.auth\.token\.admin == true/);
  assert.match(rules, /allow create, update:\s*if isAdmin\(\) && validProduct\(request\.resource\.data, productId\);/);
  assert.match(rules, /allow delete:\s*if isAdmin\(\);/);
});

test('product writes enforce exact fields and bounded values', () => {
  const rules = readRules();
  for (const field of ['id', 'name', 'image', 'category', 'badge', 'price', 'stock', 'sizes', 'description']) {
    assert.match(rules, new RegExp(`'${field}'`));
  }
  assert.match(rules, /data\.keys\(\)\.hasOnly\(productFields\(\)\)/);
  assert.match(rules, /data\.name\.size\(\) <= 120/);
  assert.match(rules, /data\.badge\.size\(\) <= 40/);
  assert.match(rules, /data\.category\.size\(\) <= 40/);
  assert.match(rules, /data\.sizes\.size\(\) <= 100/);
  assert.match(rules, /data\.description\.size\(\) <= 1000/);
  assert.match(rules, /data\.image\.size\(\) <= 900000/);
  assert.match(rules, /data\.price <= 1000000/);
  assert.match(rules, /data\.stock <= 100000/);
  assert.match(rules, /data\.stock is int/);
  assert.match(rules, /data\.id <= 9007199254740991/);
  assert.match(rules, /productId == string\(data\.id\)/);
});

test('all unmatched Firestore documents are denied', () => {
  const rules = readRules();
  assert.match(rules, /match \/\{document=\*\*\}/);
  assert.match(rules, /allow read, write:\s*if false;/);
});
