# LEME Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalog writes admin-only at the Firestore boundary and prevent persisted catalog data from executing in shoppers' browsers.

**Architecture:** Firestore Rules enforce the authoritative `admin: true` custom-claim boundary, while Firebase Auth state drives only the browser UI. A small pure validation module normalizes product records for both persistence and display; `script.js` renders attacker-influenced data exclusively through DOM properties and event listeners.

**Tech Stack:** Plain browser ES modules, Firebase Web SDK 10.11.0, Firestore Rules v2, Node.js built-in `node:test` and `assert`.

**Spec:** `docs/superpowers/specs/2026-11-08-security-hardening-design.md`

## Global Constraints

- Do not add third-party packages or a build system.
- Do not contact or modify the live Firebase project during tests.
- Public reads of `produtos` remain available; writes require `request.auth.token.admin == true`.
- The browser must never assign custom claims or treat ordinary authentication as administration.
- Remote images accept only `https:`; inline images accept only PNG, JPEG, or WebP data URLs.
- Target-controlled product fields must not enter `innerHTML`, inline event handlers, or executable URL schemes.
- Firestore persistence succeeds before local mutation state is presented as successful.

## Review Focus

- A valid Firebase user without the admin claim must remain non-admin and be signed out after a login attempt; covered in Task 3.
- A stale admin token or logout must immediately remove admin controls through `onAuthStateChanged`; covered in Task 3.
- Remote records with missing, extra, oversized, non-finite, negative, or wrong-type fields must normalize or reject deterministically; covered in Task 1.
- Product-controlled quotes, tags, and event-handler text must remain inert in cards, modals, and carts; covered in Task 4.
- Failed Firestore create/update/delete operations must leave the visible local catalog unchanged; covered in Task 4.

---

### Task 1: Product security boundary

**Files:**
- Create: `product-security.mjs`
- Create: `tests/security/product-security.test.mjs`

**Interfaces:**
- Consumes: raw product-shaped values from forms, Firestore, and defaults.
- Produces: `PRODUCT_LIMITS`, `ALLOWED_CATEGORIES`, `DEFAULT_PRODUCT_IMAGE`, `normalizeProduct(raw, options?)`, `validateProductForWrite(raw)`, and `normalizeImageSource(value)`.

- [ ] **Step 1: Write failing validation tests**

Create tests named `normalizes a valid product`, `rejects invalid write fields`, `bounds remote record strings`, `rejects non-finite and negative numbers`, `accepts only known categories`, and `allows only https or approved image data URLs`. Assert exact limits: name 120, badge 40, category 40, sizes 100, description 1000, image 900000 characters, stock integer from 0 through 100000, and price from 0 through 1000000.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `node --test tests/security/product-security.test.mjs`

Expected: FAIL because `product-security.mjs` does not exist.

- [ ] **Step 3: Implement the pure validation API**

Implement the exported interfaces in `product-security.mjs`. `normalizeProduct` returns a new safe record with a positive safe-integer ID (or the supplied fallback ID), trimmed/bounded strings, known category fallback, finite bounded numeric values, comma-separated bounded sizes, and safe image fallback. `validateProductForWrite` returns `{ ok: boolean, value?: Product, errors: string[] }` and rejects rather than silently repairing administrator input.

- [ ] **Step 4: Run the validation tests**

Run: `node --test tests/security/product-security.test.mjs`

Expected: all tests PASS with zero warnings.

- [ ] **Step 5: Commit**

```bash
git add product-security.mjs tests/security/product-security.test.mjs
git commit -m "feat: validate catalog product data"
```

### Task 2: Authoritative Firestore rules

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`
- Create: `tests/security/firestore-rules.test.mjs`

**Interfaces:**
- Consumes: Firebase ID tokens with optional `admin` custom claim and product documents matching Task 1's limits.
- Produces: public catalog reads and claim-gated, schema-validated create/update/delete rules.

- [ ] **Step 1: Write failing structural rule tests**

Test that `firebase.json` points Firestore rules to `firestore.rules`; `produtos/{productId}` allows read; every write path requires `request.auth != null && request.auth.token.admin == true`; create/update require exactly `id`, `name`, `image`, `category`, `badge`, `price`, `stock`, `sizes`, and `description`; numeric and string bounds match Task 1; and all unmatched documents deny reads and writes.

- [ ] **Step 2: Verify the rule tests fail**

Run: `node --test tests/security/firestore-rules.test.mjs`

Expected: FAIL because the rules and Firebase configuration are absent.

- [ ] **Step 3: Implement Firestore Rules v2 and configuration**

Add helper functions `isAdmin()` and `validProduct(data)` in `firestore.rules`. Permit public reads only under `/produtos/{productId}`. Permit create/update only when both helpers pass; permit delete only for `isAdmin()`. End with a recursive catch-all deny. Add a minimal `firebase.json` containing the Firestore rules path only.

- [ ] **Step 4: Run validation and rule tests**

Run: `node --test tests/security/product-security.test.mjs tests/security/firestore-rules.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firebase.json tests/security/firestore-rules.test.mjs
git commit -m "feat: enforce admin-only catalog writes"
```

### Task 3: Claim-driven authentication state

**Files:**
- Modify: `script.js:1-182`
- Create: `tests/security/auth-contract.test.mjs`

**Interfaces:**
- Consumes: `onAuthStateChanged(auth, callback)` users and `user.getIdTokenResult()` claims.
- Produces: one reconciled `isAdmin` boolean and `setAdminUi(enabled)` behavior; `verifyAdmin()` initiates sign-in but never grants privilege directly.

- [ ] **Step 1: Write failing authentication contract tests**

Read `script.js` as source and assert that it imports `onAuthStateChanged`, calls `getIdTokenResult`, checks `claims.admin === true`, has no `isAdmin = true` assignment inside `verifyAdmin`, signs out a successfully authenticated non-admin login attempt, and does not call `setDoc` from `loadProducts` when Firestore is empty.

- [ ] **Step 2: Verify the authentication tests fail for the current code**

Run: `node --test tests/security/auth-contract.test.mjs`

Expected: FAIL on the missing claim check and anonymous default seeding.

- [ ] **Step 3: Implement auth-state reconciliation**

Import `onAuthStateChanged`; add `setAdminUi(enabled)`; let the auth observer fetch token results and set `isAdmin` only for exact `admin: true`. Track whether a login was initiated so a non-admin success is signed out with a generic denial. Make logout await `signOut`. In `loadProducts`, use normalized defaults locally when the collection is empty and remove every anonymous seeding write.

- [ ] **Step 4: Run authentication and validation tests**

Run: `node --test tests/security/product-security.test.mjs tests/security/auth-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add script.js tests/security/auth-contract.test.mjs
git commit -m "feat: derive admin access from Firebase claims"
```

### Task 4: Safe rendering, persistence order, and navigation

**Files:**
- Modify: `script.js:119-547`
- Modify: `index.html:39-317`
- Create: `tests/security/rendering-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 validation functions and Task 3's reconciled `isAdmin` state.
- Produces: DOM-safe cards, quick-view content, cart rows, validated mutations, and opener-isolated external navigation.

- [ ] **Step 1: Write failing rendering and persistence contract tests**

Assert that `script.js` imports Task 1 helpers; contains no `.innerHTML`; contains no template-generated `onclick=`; uses `textContent`, `createElement`, and `addEventListener` for product/modal/cart content; calls `validateProductForWrite` before create/update writes; awaits `setDoc` or `deleteDoc` before mutating `products`; and opens WhatsApp with `noopener`. Parse every `index.html` anchor with `target="_blank"` and assert `rel` contains both `noopener` and `noreferrer`.

- [ ] **Step 2: Verify the rendering tests fail for the current code**

Run: `node --test tests/security/rendering-contract.test.mjs`

Expected: FAIL on dynamic `innerHTML`, inline handlers, optimistic mutation order, and missing link isolation.

- [ ] **Step 3: Replace dynamic HTML strings with DOM construction**

Add small focused helpers in `script.js`: `element(tag, options)`, `appendProductCard`, `buildQuickView`, and `appendCartItem`. Set text with `textContent`, URLs through normalized `img.src`, and callbacks through `addEventListener`. Preserve the current visible classes, text, filtering, modal, size, quantity, cart, and admin-control behavior.

- [ ] **Step 4: Validate form mutations and persist before local success**

Use `validateProductForWrite` for add/edit. Await Firestore create/update/delete first; only then change `products`, close dialogs, rerender, and show success. On denial, leave local state intact and show a generic failure message.

- [ ] **Step 5: Isolate external navigation**

Add `rel="noopener noreferrer"` to every external blank-target anchor. Call `window.open(url, '_blank', 'noopener')` for WhatsApp and set the returned window's `opener` to `null` when a handle is returned.

- [ ] **Step 6: Run the complete security test suite**

Run: `node --test tests/security/*.test.mjs`

Expected: all tests PASS with zero failures and zero warnings.

- [ ] **Step 7: Commit**

```bash
git add script.js index.html tests/security/rendering-contract.test.mjs
git commit -m "fix: render catalog data without executable HTML"
```

### Task 5: Final review and deployment handoff

**Files:**
- Create: `SECURITY-DEPLOYMENT.md`
- Verify: all files changed by Tasks 1-4

**Interfaces:**
- Consumes: completed implementation and passing test suite.
- Produces: owner instructions for claim assignment, token refresh, rule deployment, and rollback verification.

- [ ] **Step 1: Write the deployment handoff**

Document that an owner must set `admin: true` from a trusted Firebase Admin SDK environment, force reauthentication/token refresh, run `firebase deploy --only firestore:rules`, verify an anonymous read, verify a non-admin denied write, and verify an admin allowed write using dummy catalog data. Include rollback guidance and warn never to place Admin SDK credentials in this repository or browser code.

- [ ] **Step 2: Run static secret and dangerous-sink checks**

Run: `rg -n "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|javascript:|request\.auth\.token\.admin|target=\"_blank\"" script.js index.html firestore.rules product-security.mjs SECURITY-DEPLOYMENT.md`

Expected: no executable DOM sinks; the admin rule appears only in `firestore.rules`; each blank-target link is manually confirmed to include opener isolation.

- [ ] **Step 3: Run the full offline suite**

Run: `node --test tests/security/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 4: Inspect the complete diff**

Run: `git diff --check` and `git diff -- index.html script.js product-security.mjs firestore.rules firebase.json tests/security SECURITY-DEPLOYMENT.md`

Expected: no whitespace errors; changes match the approved spec and contain no credentials.

- [ ] **Step 5: Commit**

```bash
git add SECURITY-DEPLOYMENT.md
git commit -m "docs: add Firebase security deployment guide"
```
