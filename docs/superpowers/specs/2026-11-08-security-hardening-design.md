# LEME Security Hardening Design

## Intent

Protect the catalog and shopper browser sessions without changing the store's visible workflow. Firebase remains the backend, public visitors keep read-only access to products, and only explicitly designated administrators may create, edit, or delete catalog records.

## Goals

- Make Firestore, not the browser UI, the final authorization boundary.
- Require the Firebase Auth custom claim `admin: true` for catalog writes.
- Keep public catalog reads working.
- Prevent persisted product fields from becoming executable HTML or inline JavaScript.
- Validate product records, numeric ranges, sizes, and image URLs before display or persistence.
- Remove reverse-tabnabbing exposure from external links and new windows.
- Add automated source-level tests for the security invariants that can run without contacting Firebase.

## Non-goals

- Creating an administrator-management backend or assigning custom claims from the browser.
- Deploying rules or changing the live Firebase project automatically.
- Adding payment processing, customer accounts, or a server-side order system.
- Replacing Firebase or redesigning the storefront.

## Constraints

- The application is plain HTML/CSS/browser JavaScript with Firebase modules loaded from a CDN.
- There is currently no build system or test framework.
- Tests must remain offline and use only locally available Node functionality.
- The Firebase Admin SDK or Firebase Console must assign the `admin` custom claim outside this client application.

## Approaches considered

1. **Custom Claim plus Firestore Rules — selected.** Firestore accepts mutations only when `request.auth.token.admin == true`; the UI reads the same claim for display and convenience. This preserves a real server-enforced boundary.
2. **Email allowlist in Firestore Rules.** Simpler initially, but couples authorization to mutable personal identifiers and requires rule changes for administrator turnover.
3. **Any authenticated user is an administrator.** Matches the current client behavior but provides authentication without meaningful authorization and was rejected.

## Design

### Authorization

Add `firestore.rules` with public reads for `produtos` and create/update/delete restricted to authenticated users whose token contains `admin: true`. Validate the product document schema and bounded field values in rules. Add `firebase.json` so the rules file is versioned and deployable.

In `script.js`, subscribe to `onAuthStateChanged`. For a signed-in user, call `getIdTokenResult()` and set `isAdmin` only when the custom claim is exactly `true`. A successful email/password sign-in without the claim must be signed out and shown a generic access-denied message. Mutation functions keep client guards, but those guards are explicitly convenience controls; Firestore rules remain authoritative.

Remove anonymous startup writes. If Firestore is empty, show the built-in default products locally without calling `setDoc`.

### Safe rendering and input validation

Replace product-, modal-, and cart-related `innerHTML` interpolation with DOM construction using `createElement`, `textContent`, property assignment, and `addEventListener`. Static empty-state markup may also be created through DOM APIs for a consistent no-HTML-string rule.

Centralize normalization for product IDs, names, descriptions, badges, categories, prices, stock, sizes, and images. Accept only finite non-negative price/stock values, known categories, bounded strings, and safe image sources. Image URLs may use `https:`; uploaded image data may use only `data:image/png`, `data:image/jpeg`, or `data:image/webp`. Invalid remote data is replaced with safe defaults and cannot create event handlers or executable URLs.

Use conservative explicit limits shared in intent between browser validation and Firestore Rules: exact product keys; short bounded name, badge, category, and sizes fields; a bounded description; integer non-negative stock; finite non-negative price; and an image string bounded well below Firestore's document limit. Persist create/update/delete operations first and update local UI state only after Firestore succeeds, avoiding a misleading local success when the authoritative write is denied.

### Browser navigation

Add `rel="noopener noreferrer"` to every external `target="_blank"` link. Open WhatsApp with the `noopener` window feature and clear the opener defensively when supported.

### Tests

Add Node's built-in test runner with a source-level security contract suite and no third-party test dependency. Pure validation helpers live in an importable `.mjs` module. Tests first assert that:

- Firestore rules require the `admin` custom claim for every write and permit public reads.
- Anonymous default seeding is absent.
- Authentication checks the admin claim and reconciles auth state.
- catalog rendering no longer interpolates product data through `innerHTML` or inline `onclick` handlers.
- external links include `noopener noreferrer`.
- the validation module rejects unsafe image schemes and invalid numeric/catalog values.

The no-inline-handler requirement applies to attacker-influenced dynamic product, modal, and cart rendering. Existing static handlers may be migrated as cleanup but are not required to close the persisted-content path. Configuration-only rules will be checked structurally because the Firebase emulator is not installed. `onAuthStateChanged` exclusively owns admin-state and UI reconciliation; `verifyAdmin` only initiates sign-in and reports a generic denial to avoid racing privilege state.

## Rollout and owner action

After code verification, an owner must assign `admin: true` to the intended Firebase user using a trusted Admin SDK environment or supported Firebase administration workflow, force that user to refresh/re-authenticate, and deploy `firestore.rules`. Until rules are deployed, the repository changes do not alter the live Firestore policy.

