import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_CATEGORIES,
  DEFAULT_PRODUCT_IMAGE,
  MAX_PRODUCT_IMAGE_FILE_BYTES,
  PRODUCT_LIMITS,
  normalizeImageSource,
  normalizeProduct,
  validateProductForWrite,
} from '../../product-security.mjs';

const validProduct = {
  id: 7,
  name: '  Camisa Segura  ',
  image: 'https://images.example/camisa.webp',
  category: 'colecao-leme',
  badge: ' Novo ',
  price: 89.9,
  stock: 12,
  sizes: ' P, M, G ',
  description: '  Produto de teste  ',
};

test('normalizes a valid product', () => {
  assert.deepEqual(normalizeProduct(validProduct), {
    id: 7,
    name: 'Camisa Segura',
    image: 'https://images.example/camisa.webp',
    category: 'colecao-leme',
    badge: 'Novo',
    price: 89.9,
    stock: 12,
    sizes: 'P, M, G',
    description: 'Produto de teste',
  });
});

test('rejects invalid write fields', () => {
  const result = validateProductForWrite({
    ...validProduct,
    id: 0,
    name: '',
    description: '',
    extra: 'not allowed',
  });

  assert.equal(result.ok, false);
  assert.equal('value' in result, false);
  assert.ok(result.errors.length >= 4);
});

test('bounds remote record strings', () => {
  const normalized = normalizeProduct({
    ...validProduct,
    name: 'n'.repeat(121),
    badge: 'b'.repeat(41),
    sizes: 's'.repeat(101),
    description: 'd'.repeat(1001),
    image: 'i'.repeat(900001),
  });

  assert.equal(normalized.name.length, 120);
  assert.equal(normalized.badge.length, 40);
  assert.equal(normalized.sizes.length, 100);
  assert.equal(normalized.description.length, 1000);
  assert.equal(normalized.image, DEFAULT_PRODUCT_IMAGE);
});

test('rejects non-finite and negative numbers', () => {
  for (const fields of [
    { price: Number.NaN },
    { price: Number.POSITIVE_INFINITY },
    { price: -0.01 },
    { price: PRODUCT_LIMITS.priceMax + 0.01 },
    { stock: -1 },
    { stock: 1.5 },
    { stock: PRODUCT_LIMITS.stockMax + 1 },
  ]) {
    assert.equal(validateProductForWrite({ ...validProduct, ...fields }).ok, false);
  }
});

test('accepts only known categories', () => {
  assert.ok(ALLOWED_CATEGORIES.includes('colecao-leme'));
  assert.equal(validateProductForWrite(validProduct).ok, true);
  assert.equal(validateProductForWrite({ ...validProduct, category: 'admin' }).ok, false);
  assert.equal(normalizeProduct({ ...validProduct, category: 'admin' }).category, 't-shirts-basicas');
});

test('allows only https or approved image data URLs', () => {
  const accepted = [
    'https://images.example/item.png',
    'data:image/png;base64,AA==',
    'data:image/jpeg;base64,AA==',
    'data:image/webp;base64,AA==',
  ];
  const rejected = [
    'http://images.example/item.png',
    'javascript:alert(1)',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'data:text/html,<script>alert(1)</script>',
    '//images.example/item.png',
  ];

  for (const image of accepted) assert.equal(normalizeImageSource(image), image);
  for (const image of rejected) assert.equal(normalizeImageSource(image), DEFAULT_PRODUCT_IMAGE);
});

test('accepts Portuguese text at the configured character limit', () => {
  const result = validateProductForWrite({
    ...validProduct,
    name: 'é'.repeat(PRODUCT_LIMITS.name),
  });

  assert.equal(result.ok, true);
});

test('raw upload limit always fits the persisted data URL limit', () => {
  const longestPrefixLength = 'data:image/jpeg;base64,'.length;
  const encodedLength = 4 * Math.ceil(MAX_PRODUCT_IMAGE_FILE_BYTES / 3);
  assert.ok(longestPrefixLength + encodedLength <= PRODUCT_LIMITS.image);
});
