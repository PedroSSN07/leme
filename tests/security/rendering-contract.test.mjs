import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../../script.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function functionBody(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `missing function marker: ${start}`);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return script.slice(from, to);
}

test('dynamic catalog rendering uses inert DOM APIs', () => {
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.doesNotMatch(script, /onclick\s*=/i);
  assert.match(script, /document\.createElement/);
  assert.match(script, /\.textContent\s*=/);
  assert.match(script, /\.addEventListener\(/);
});

test('product-controlled markup remains data rather than executable HTML', () => {
  for (const field of ['product.name', 'product.badge', 'product.description', 'item.name', 'item.size']) {
    assert.match(script, new RegExp(`textContent\\s*=\\s*${field.replace('.', '\\.')}|textContent:\\s*${field.replace('.', '\\.')}`));
  }
});

test('catalog mutations validate and persist before changing local state', () => {
  const add = functionBody('window.saveNewProduct = async function ()', 'window.openEditModal');
  const edit = functionBody('window.saveProductEdits = async function ()', 'window.deleteProduct');
  const remove = functionBody('window.deleteProduct = async function', 'window.filterCategory');

  assert.match(add, /validateProductForWrite\(newProd\)/);
  assert.ok(add.indexOf('await setDoc') < add.indexOf('products.push'));
  assert.match(edit, /validateProductForWrite\(updatedProd\)/);
  assert.ok(edit.indexOf('await setDoc') < edit.indexOf('products[index]'));
  assert.ok(remove.indexOf('await deleteDoc') < remove.indexOf('products = products.filter'));
  assert.match(add, /validation\.errors/);
  assert.match(edit, /validation\.errors/);
});

test('uploaded images are bounded after base64 expansion', () => {
  assert.match(script, /MAX_PRODUCT_IMAGE_FILE_BYTES/);
  assert.match(script, /file\.size > MAX_PRODUCT_IMAGE_FILE_BYTES/);
  assert.doesNotMatch(script, /file\.size > 800000/);
});

test('local defaults are replaced immediately by the first persisted product', () => {
  assert.match(script, /let catalogUsesLocalDefaults\s*=\s*false/);
  assert.match(script, /querySnapshot\.empty[\s\S]*catalogUsesLocalDefaults\s*=\s*true/);
  const add = functionBody('window.saveNewProduct = async function ()', 'window.openEditModal');
  assert.match(add, /if \(catalogUsesLocalDefaults\)[\s\S]*products\s*=\s*\[\]/);
});

test('local placeholder products cannot be edited or deleted as persisted records', () => {
  assert.match(script, /if \(isAdmin && !catalogUsesLocalDefaults\)/);
  const editOpen = functionBody('window.openEditModal = function', 'window.saveProductEdits');
  const remove = functionBody('window.deleteProduct = async function', 'window.filterCategory');
  assert.match(editOpen, /if \(catalogUsesLocalDefaults\) return/);
  assert.match(remove, /if \(catalogUsesLocalDefaults\) return/);
});

test('external blank-target links isolate their opener', () => {
  const anchors = html.match(/<a\b[^>]*target="_blank"[^>]*>/gi) ?? [];
  assert.ok(anchors.length > 0);
  for (const anchor of anchors) {
    assert.match(anchor, /rel="[^"]*noopener[^"]*"/i);
    assert.match(anchor, /rel="[^"]*noreferrer[^"]*"/i);
  }
  assert.match(script, /window\.open\([^;]+['"]noopener['"]\)/);
  assert.match(script, /\.opener\s*=\s*null/);
});
