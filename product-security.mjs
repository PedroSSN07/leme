export const PRODUCT_LIMITS = Object.freeze({
  name: 120,
  badge: 40,
  category: 40,
  sizes: 100,
  description: 1000,
  image: 900000,
  stockMax: 100000,
  priceMax: 1000000,
});

export const ALLOWED_CATEGORIES = Object.freeze([
  't-shirts-basicas',
  'basicas-femininas',
  'basicas-masculinas',
  'colecao-leme',
  'religiosas',
  'personalizadas',
  'camisas-masculinas',
  'oversized',
]);

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800';

const PRODUCT_KEYS = Object.freeze([
  'badge',
  'category',
  'description',
  'id',
  'image',
  'name',
  'price',
  'sizes',
  'stock',
]);

function boundedString(value, limit, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, limit);
}

function boundedNumber(value, maximum, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum
    ? number
    : fallback;
}

export function normalizeImageSource(value) {
  if (typeof value !== 'string') return DEFAULT_PRODUCT_IMAGE;
  const source = value.trim();
  if (!source || source.length > PRODUCT_LIMITS.image) return DEFAULT_PRODUCT_IMAGE;

  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(source)) {
    return source;
  }

  try {
    const url = new URL(source);
    return url.protocol === 'https:' ? source : DEFAULT_PRODUCT_IMAGE;
  } catch {
    return DEFAULT_PRODUCT_IMAGE;
  }
}

export function normalizeProduct(raw, options = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fallbackId = Number.isSafeInteger(options.fallbackId) && options.fallbackId > 0
    ? options.fallbackId
    : 1;
  const id = Number.isSafeInteger(source.id) && source.id > 0 ? source.id : fallbackId;
  const category = typeof source.category === 'string' && ALLOWED_CATEGORIES.includes(source.category.trim())
    ? source.category.trim()
    : ALLOWED_CATEGORIES[0];
  const stock = boundedNumber(source.stock, PRODUCT_LIMITS.stockMax);

  return {
    id,
    name: boundedString(source.name, PRODUCT_LIMITS.name, 'Produto'),
    image: normalizeImageSource(source.image),
    category,
    badge: boundedString(source.badge, PRODUCT_LIMITS.badge, 'Novo'),
    price: boundedNumber(source.price, PRODUCT_LIMITS.priceMax),
    stock: Number.isInteger(stock) ? stock : 0,
    sizes: boundedString(source.sizes, PRODUCT_LIMITS.sizes, 'Único'),
    description: boundedString(source.description, PRODUCT_LIMITS.description, 'Descrição do produto'),
  };
}

function validRequiredString(value, limit) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= limit;
}

export function validateProductForWrite(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['product'] };
  }

  const keys = Object.keys(raw).sort();
  if (keys.length !== PRODUCT_KEYS.length || keys.some((key, index) => key !== PRODUCT_KEYS[index])) {
    errors.push('keys');
  }
  if (!Number.isSafeInteger(raw.id) || raw.id <= 0) errors.push('id');
  if (!validRequiredString(raw.name, PRODUCT_LIMITS.name)) errors.push('name');
  if (!validRequiredString(raw.badge, PRODUCT_LIMITS.badge)) errors.push('badge');
  if (!validRequiredString(raw.category, PRODUCT_LIMITS.category) || !ALLOWED_CATEGORIES.includes(raw.category.trim())) {
    errors.push('category');
  }
  if (!validRequiredString(raw.sizes, PRODUCT_LIMITS.sizes)) errors.push('sizes');
  if (!validRequiredString(raw.description, PRODUCT_LIMITS.description)) errors.push('description');
  if (
    typeof raw.image !== 'string' ||
    raw.image.trim().length === 0 ||
    raw.image.trim().length > PRODUCT_LIMITS.image ||
    normalizeImageSource(raw.image) !== raw.image.trim()
  ) {
    errors.push('image');
  }
  if (typeof raw.price !== 'number' || !Number.isFinite(raw.price) || raw.price < 0 || raw.price > PRODUCT_LIMITS.priceMax) {
    errors.push('price');
  }
  if (!Number.isInteger(raw.stock) || raw.stock < 0 || raw.stock > PRODUCT_LIMITS.stockMax) {
    errors.push('stock');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: normalizeProduct(raw), errors: [] };
}
