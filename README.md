# @zoreal/oauth2-react

[![npm](https://img.shields.io/npm/v/@zoreal/oauth2-react)](https://www.npmjs.com/package/@zoreal/oauth2-react) [![npm downloads](https://img.shields.io/npm/dm/@zoreal/oauth2-react)](https://www.npmjs.com/package/@zoreal/oauth2-react) [![types](https://img.shields.io/npm/types/@zoreal/oauth2-react)](https://www.npmjs.com/package/@zoreal/oauth2-react) [![CI](https://img.shields.io/github/actions/workflow/status/Bynn-Intelligence/zoreal-oauth2-react/ci.yml?branch=main&label=CI)](https://github.com/Bynn-Intelligence/zoreal-oauth2-react/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Login with ZOREAL for React: a ZOREAL Verified Proof-of-Human behind every sign-in.

The API mirrors `@react-oauth/google` one to one, renamed, so a team already
integrated with Google ports by find and replace.

## Install

```sh
npm install @zoreal/oauth2-react
```

`react` and `react-dom` (18 or 19) are peer dependencies.

## Getting your credentials

Everything `<ZorealOAuthProvider>` and the hooks need starts from a ZOREAL
**asset**.

1. Create an account at **https://zoreal.com** and open **Assets**.
2. **Create an asset** — a *website* (a domain you own) or an *app bundle* (a
   reverse-DNS bundle id). An asset is the thing users log in to; its token is
   your `clientId` and it looks like `ast_...`. It is public and ships in your
   frontend.
3. On the asset, open the **OAuth2** tab and register:
   - the **JavaScript origins** your pages run on and the **redirect URIs** you
     use — the pairing start and its poll are checked against your authorized
     origins, and requests from anything not registered are rejected (this is
     the core control);
   - the **scopes** the client may request (see the catalogue below) — a
     request for a scope you did not register is refused at `/pair`;
   - **client authentication** for the backend half of the flow: a **client
     secret** for `client_secret_basic`, or a **JWKS** for `private_key_jwt`. A
     public client (the browser button) authenticates with PKCE alone and no
     secret — so it never touches this, and there is no `clientSecret` prop
     here, by design.
4. A website asset must **verify its domain** (a DNS or meta-tag proof shown in
   the dashboard) before it can request personal-data scopes or sign users in;
   the verified domain is what your users' pairwise `sub` is derived against.

The `clientId` is the only credential this package holds, and it is public. The
client secret is your backend's, never the browser's.

### There is no test-identity sandbox — and that is deliberate

ZOREAL **never issues fake or sandbox humans**: a pool of test identities would
be a fraud vector against the exact thing the product proves. So you always
authenticate **real** ZOREAL IDs.

To develop and test, **create a free ZOREAL ID for yourself** (enrol in the
ZOREAL ID app) and sign in with it. Mark your asset's environment **sandbox**
in the dashboard while building — a sandbox asset may register `http://localhost`
origins and redirect URIs that a production asset may not — and flip it to
production when you ship. The identities are real either way; only the allowed
origins differ.

The `issuer` defaults to `https://id.zoreal.com` and rarely changes: it must
match the `iss` inside the tokens exactly (an exact string comparison, not a
normalization), and there is no public sandbox issuer to point at. Override the
`issuer` prop only when you were explicitly given a non-production provider
origin.

## Two flows: pick by whether you need the user's details

- **You have a backend and want the user's email or name** (most apps): use the
  **auth-code flow**. Your backend gets the email, name, and verification
  details from `/userinfo`. Start here.
- **You have no backend and only need to know "this is a verified, unique human,
  and the same one as last time"**: use the **`<ZorealLogin>` button**. It
  returns a stable per-user identifier and proof of verification, but no email
  or name. Email and other personal details are never placed in a browser-side
  token; that is what the auth-code flow and your backend are for.

## Quick start: auth-code (email and name, needs your backend)

```tsx
import { useState } from 'react';
import { useZorealLogin } from '@zoreal/oauth2-react';

function ZorealSignIn() {
  const [pairing, setPairing] = useState(null);

  // `email` (and profile.name, etc.) are returned from /userinfo on your backend.
  const login = useZorealLogin({
    flow: 'auth-code',
    scope: 'openid email profile.name',
    onPairingStateChange: setPairing,
    onSuccess: async ({ code, code_verifier, nonce }) => {
      setPairing(null);
      // Send ALL THREE to your backend over TLS. It calls POST /token with the
      // code and verifier plus its client authentication, verifies the ID
      // token's nonce is this one, then reads the email and name from
      // /userinfo. That is where personal data is delivered.
      await fetch('/api/auth/zoreal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier, nonce }),
      });
    },
  });

  return (
    <div>
      <button onClick={login}>Continue with ZOREAL</button>
      {pairing && !pairing.appLink && ['pending', 'claimed'].includes(pairing.status) && (
        <div>
          <img src={pairing.qrUrl} alt="Log in with ZOREAL" width={200} height={200} />
          <p>
            {pairing.status === 'claimed'
              ? 'Approve the login in your ZOREAL ID app.'
              : 'Scan with your phone camera or the ZOREAL ID app.'}
          </p>
          <button onClick={pairing.cancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}
```

**The hook renders nothing, so in this flow the pairing UI is yours.** On
desktop the login cannot complete unless something shows `pairing.qrUrl` (the
provider-served QR image) for the holder to scan — that is what
`onPairingStateChange` is for, and since 0.1.4 it carries `pairUrl`, `qrUrl`,
`appLink` and `cancel` on every callback, including one fired immediately when
the pairing starts. On a phone (`appLink: true`) the SDK opens the pairing
link itself and no panel is needed. Only the drop-in `<ZorealLogin>` button
below renders its own QR panel, and that component is browser-direct only.

## Quick start: the button (no backend, pseudonymous)

```tsx
import { ZorealOAuthProvider, ZorealLogin } from '@zoreal/oauth2-react';

<ZorealOAuthProvider clientId="ast_your_asset_id">
  <ZorealLogin
    onSuccess={({ credential }) => {
      // `credential` is an ID token carrying a stable per-user identifier (`sub`)
      // and proof the person is a verified, unique human. No email, no name:
      // use the auth-code flow above for those. Verify it on your server against
      // the JWKS before trusting it.
    }}
    onError={(e) => console.warn(e.type, e.description)}
  />
</ZorealOAuthProvider>
```

On desktop the button shows a QR; the user scans it with their phone and
approves in the ZOREAL ID app. On a phone it opens the app directly. Either
way your page just receives `onSuccess`.

### On your backend

There is a sibling library for every major backend — use one instead of
hand-rolling the exchange (the family table at the bottom lists them all).
With the Ruby one, the whole thing is:

```ruby
login = ZOREAL_OAUTH.authenticate(code:, code_verifier:, nonce:)
login.sub    # your stable account key
login.email  # from /userinfo, with the email scope
```

On the wire, what every one of them does:

```
POST https://id.zoreal.com/token
  grant_type=authorization_code
  code=<code>
  code_verifier=<code_verifier>
  client_id=ast_your_asset_id
  <your client authentication>     # HTTP Basic client secret, or a private_key_jwt assertion

-> { "id_token": "...", "access_token": "...", "expires_in": 600 }

GET https://id.zoreal.com/userinfo
  Authorization: Bearer <access_token>

-> { "sub": "...", "email": "...", "email_verified": true, "given_name": "...", ... }
```

Which fields come back depends on the scopes the user consented to.

Things a backend implementer needs to know, learned the concrete way:

- **The `id_token` is ES256, only ever ES256.** Verify against the JWKS at
  `{issuer}/jwks`; a library defaulting to RS256 rejects every real token.
- **Check `iss` by exact string comparison** against your configured issuer,
  `aud` against your client id, `exp`, and **the `nonce` your frontend posted**
  against the token's nonce claim — without that last check you cannot tell a
  substituted token from the real one, which is why `onSuccess` hands the
  nonce over.
- **The ID token carries no personal data, by design.** Email and profile
  claims exist only at `/userinfo`. An integration that only decodes the ID
  token and looks for an email finds none, and that is not a bug.
- **The access token lives 10 minutes.** Call `/userinfo` while handling the
  login; do not store the token.
- **`sub` is pairwise per verified domain.** It is the right account key, and
  changing your asset's domain rotates every `sub` you have stored — treat a
  domain change as a data migration, not a settings edit.
- **The provider publishes no `authorization_endpoint`.** The flow starts at
  `/pair` (this SDK's job) and finishes at `/token` (your backend's); a
  generic OIDC relying-party library that wants to build an authorize URL has
  nothing to point at. Use the family libraries.

`ux_mode: 'redirect'` is not supported in v1: it would put the PKCE verifier
in a URL, which is a credential in every access log on the path.

## Scopes and claims

Request scopes in the `scope` string, space-separated, always starting with
`openid`. They are consented to by the holder and must be pre-authorized on
your asset. What each grants, where it is delivered, and what it needs:

| Scope | Claims | Delivered in | Tier | Requires |
|---|---|---|---|---|
| `openid` | `sub`, `iss`, `aud`, `exp`, `iat`, `nonce`, `auth_time`, `acr`, `amr`, and the assurance block | ID token | A | any client |
| `zoreal.age` | `age_over_13/16/18/21/65` booleans — only the thresholds you registered, never an age or birthdate | ID token | A | any client |
| `zoreal.nationality` | `nationality` (ISO 3166-1 alpha-3) | ID token | A | any client |
| `email` | `email`, `email_verified` | `/userinfo` | B | confidential client + verified domain |
| `profile.name` | `name`, `given_name`, `family_name` | `/userinfo` | B | confidential client + verified domain |
| `profile.birthdate` | `birthdate` (full ISO 8601 date) | `/userinfo` | B | confidential client + verified domain |
| `profile.document` | `document_type`, `document_number`, `issuing_country`, `document_expires_on` | `/userinfo` | B | confidential client + verified domain |
| `profile.portrait` | `portrait` (the chip's facial image; GDPR Article 9 data) | `/userinfo` | C | confidential client + verified domain — *registrable but not served yet* |

- **Tier A** rides in the ID token and is available to every client, so the
  no-backend button can use it. **Tier B** is personal data, served only from
  `/userinfo` to a confidential client on a domain you have verified in the
  dashboard, and never placed in a browser-side token — which is why those
  scopes require `flow: 'auth-code'` and a backend.
- **Tier C** (`profile.portrait`) is registrable but the provider does not serve
  the claim yet; a backend reads it as absent until it does.
- **Age thresholds are a fixed set** — 13, 16, 18, 21, 65 — that you register on
  the asset. Only a registered threshold mints an `age_over_N` claim; an
  unregistered one produces no claim at all, which a backend reads as absent
  (distinct from a `false`). Registering all five would recover an age band, so
  register only the thresholds you actually gate on.

### Identity verification (KYC)

To receive a person's government-document-verified identity, request the
document scopes together and read them from `/userinfo`:

```tsx
const login = useZorealLogin({
  flow: 'auth-code',
  scope: 'openid profile.name profile.birthdate profile.document profile.portrait',
  onSuccess: async ({ code, code_verifier }) => {
    await fetch('/api/auth/zoreal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier }),
    });
  },
});
```

Your backend then holds the name, date of birth, document type and number,
issuing country and expiry, all verified at enrolment against a genuine
government identity document by a live person, plus the portrait if you
requested it. That is the raw material for a KYC check. You remain the controller of that data and responsible for how you
store, use, and justify collecting it; ZOREAL provides the verified attributes,
not a regulatory determination.

## Assurance levels — `acr` and requiring a liveness check

### What `acr` is

`acr` is an OpenID Connect standard claim — *Authentication Context Class
Reference*. It is a string in the ID token that says **how strongly this login
was authenticated**. Every ZOREAL login carries one. `sub` tells you *who* (a
stable, pairwise identifier for this person at your site); `acr` tells you *how
sure ZOREAL is that the person is really there for this login*. A stolen,
unlocked phone can still produce a `sub`; it cannot produce a fresh
`zoreal.live`.

This SDK is the **request** side of `acr`: it is where you ask for a level, which
decides what the holder's ZOREAL ID app makes them do. Whether that level was
actually reached is decided by the signed token and checked on your backend
(below).

### The three levels

Weakest to strongest. `acr` reports what actually happened, never what was asked.

| `acr` | What the holder did | `amr` | Proves | Does **not** prove |
|---|---|---|---|---|
| `zoreal.session` | Nothing — a returning holder resumed silently from an existing ZOREAL session, no phone interaction | `[]` | Continuity | Presence |
| `zoreal.device` | Approved on their enrolled phone: a secure-element key signature released by a local biometric/passcode unlock | `["hwk","user"]` | Possession of the enrolled device **and** a local unlock | That a live face was captured for *this* login |
| `zoreal.live` | The above **plus** a fresh face capture this login — a flash-plus-zoom video scored for presentation attacks and screen replay, matched 1:1 to the government document read at enrolment | `["hwk","face","user"]` | A live, real, unique human, verified to be the enrolled person, **at the moment of this login** | — (strongest) |

`amr` (*Authentication Methods References*) lists the factors: `hwk` a hardware
key, `user` a presence/unlock gesture, `face` a face biometric. `zoreal.live` is
`zoreal.device` with `face` added. The default is `zoreal.device` — a login that
asks for nothing still requires the enrolled phone and a local unlock.

### When to request which

- **`zoreal.device`** (the default): a forum, a community, a normal login. Pass
  no `acr_values` at all.
- **`zoreal.live`**: a bank onboarding, a high-value transaction, an age-gated
  purchase, a first login, a "confirm it is really you" step. Anywhere a fresh,
  unforgeable proof of the live, right human is worth the few seconds a capture
  costs.
- **`zoreal.session`** is never something you *request*; it is the silent
  convenience re-auth (`prompt: 'none'`) a returning holder gets at a site they
  have already consented to.

### Requesting it here

`acr_values` is a request option on `useZorealLogin`, `useZorealAutoLogin` and
`<ZorealLogin>`. Its type is `AcrValue | AcrValue[]` where
`AcrValue = 'zoreal.live' | 'zoreal.device' | 'zoreal.session'`.

```tsx
const login = useZorealLogin({
  flow: 'auth-code',
  acr_values: 'zoreal.live',        // the app now makes the holder pass a face capture
  onSuccess: async ({ code, code_verifier, nonce }) => {
    // Post all three to your backend, which verifies the signed acr claim.
  },
  onNonOAuthError: (e) => {
    // A device that cannot meet the requirement (e.g. no capture on the
    // platform, or the holder declines) arrives here as
    // { type: 'request_denied' }, with the provider's reason in e.description.
  },
});
```

In `browser-direct` mode the resolved level comes back on the credential
response as `response.acr`, parsed from the ID token; the token stays the
authority.

### Requesting is not verifying — the rule that matters

`acr_values` here is **advisory**. It shapes what the holder is asked to do; it
is not a security control, because a browser is attacker-controlled and a value
that only travels through it proves nothing. The proof is the **signed `acr`
claim** in the ID token, minted by ZOREAL, and it must be verified **on your
backend**:

- Auth-code flow: your backend receives the code and, after exchanging it, reads
  the token's `acr`. The ZOREAL backend libraries (`zoreal-oauth2` for Ruby and
  its siblings for Node, Python, PHP, Go, JVM and .NET) take a required-acr
  argument at exchange for exactly this, refusing a token below the level.
- Browser-direct flow: the `credential` is an ID token you still verify
  server-side against the JWKS, `acr` included.

With the Ruby backend library the required-acr argument is `acr:`; every sibling
takes the same argument in its own idiom:

```ruby
login = ZOREAL_OAUTH.authenticate(
  code:, code_verifier:, nonce:,
  acr: 'zoreal.live'   # refuses the login unless the signed token says zoreal.live
)
login.acr    # "zoreal.live" — what actually happened, read from the signed token
```

**A relying party that requests `zoreal.live` but never verifies the claim has
checked nothing.** It has only asked the holder nicely.

### How the check behaves (on your backend)

The requirement you hand a backend library is satisfied **upward**:
`zoreal.session < zoreal.device < zoreal.live`. Requiring `zoreal.device`
therefore accepts a `zoreal.live` token — the holder gave you *more* assurance
than you demanded. A token whose `acr` is below the requirement, missing, or
outside the vocabulary is refused (in Ruby, a `VerificationError`); an unknown
*required* value — a typo like `'zoreal.liveness'` — is a bug in your code rather
than a bad token, so the libraries raise a configuration error instead and fail
loudly rather than rejecting every login in silence.

If you would rather branch than have the exchange refuse, require nothing and
inspect the result — the backend libraries expose a predicate for the same upward
comparison (in Ruby, `login.satisfies_acr?`, with `login.live?` as shorthand):

```ruby
login = ZOREAL_OAUTH.authenticate(code:, code_verifier:, nonce:)
unless login.satisfies_acr?('zoreal.live')
  # step the user up, or refuse the sensitive action
end
```

The frontend's only job is the request; each of these checks happens where
verification means something, which is your server.

### `acr` versus the assurance block

`acr` grades *this login event*. The assurance block in the token (uniqueness
basis, verification month, chip-liveness, trust tier, key protection) describes
the *identity behind it* — how the person was proofed at enrolment. One is about
now; the other about who they are. A high-value flow wants both.

## The assurance block

The ID token carries a `zoreal` claim — the **assurance block** — describing the
strength of the *identity* behind this login, distinct from `acr`, which grades
the *login event*. In browser-direct mode it rides inside the `credential` you
verify server-side; in auth-code mode your backend reads it from the ID token
after the exchange. Its keys and their value sets:

| Key | Values | Meaning |
|---|---|---|
| `uniqueness` | `personal_number` \| `document` \| `none` | The anchor the holder is deduplicated on. `personal_number` (a national number from the chip) is strongest; `none` means no reliable anchor |
| `verified_on` | `"YYYY-MM"` | The month the underlying document was verified. Quantised to a month on purpose — a day-precision date is a cross-site correlator |
| `chip_liveness_proven` | `true` \| `false` | Whether the passport chip's active-authentication challenge was proven (a genuine chip, not a clone) |
| `trust_tier` | `high` \| `standard` | `high` when `chip_liveness_proven`, else `standard` |
| `key_protection` | `secure_enclave` \| `strongbox` \| `tee` \| `software` | How the holder's device key is protected. `software` means no hardware attestation |

A high-value flow usually pairs `acr_values: 'zoreal.live'` (fresh presence,
requested here and verified on your backend) with a check on the assurance block
(identity strength) — for example requiring `uniqueness === 'personal_number'`
and `trust_tier === 'high'`.

## Error reference

This package routes every failure to one of two callbacks, matching
`@react-oauth/google`:

- **`onError(error)`** — an OAuth error the provider returned. `error.error` is
  an `ErrorCode`; `error.description` is the provider's own reason string,
  surfaced verbatim (never rewrite it).
- **`onNonOAuthError(error)`** — the flow never reached a provider OAuth error:
  the holder declined, the window elapsed, or the request could not start.
  `error.type` is a `NonOAuthError['type']`; `error.description` carries the
  provider's reason when there is one.

The drop-in `<ZorealLogin>` button funnels both into its single
`onError(NonOAuthError)`; the hooks give you the two callbacks separately.

### Errors at `/token`

The code exchange can fail with these. In **browser-direct** mode this package
makes the exchange, so they arrive at your `onError`. In **auth-code** mode your
backend makes the exchange, so its library surfaces them there — but the causes
are the same:

| `error` | Cause | Retryable? |
|---|---|---|
| `invalid_grant` | The code is spent — unknown, expired (60s), already used, PKCE mismatch, or the asset's domain verification lapsed mid-flow | No. Start a **new** login; the code cannot be reused |
| `invalid_request` | Client authentication failed — wrong secret, a bad `private_key_jwt` assertion, or `tls_client_auth` (not accepted at `/token` yet) | No. Fix the client configuration |
| `unsupported_grant_type` | Something other than `authorization_code` reached `/token` | No. A bug |

### Errors surfaced in the frontend

These reach your callbacks before any backend is involved — handle them here:

| Where | Reaches | Code / type | Meaning |
|---|---|---|---|
| `/pair` | `onError` | `invalid_scope` | A scope not on the asset's allowed list, or a Tier B scope from a public client |
| `/pair` | `onError` | `invalid_request` | Missing PKCE/nonce, an unverified sector, an unregistered `redirect_uri`, or an unknown `acr_values` |
| `/pair` | `onError` | `login_required` | `prompt: 'none'` with no silent session to resume — the expected quiet outcome, not a failure (`useZorealAutoLogin` turns it into `onUnavailable`) |
| pairing | `onNonOAuthError` | `request_denied` | The holder declined in their ZOREAL ID app — **not an error to alarm on**; offer to try again |
| pairing | `onNonOAuthError` | `request_expired` | The pairing window elapsed, or a required liveness the device could not meet — offer to try again |

### The type unions

`ErrorCode` (what `onError` carries):
`invalid_request`, `access_denied`, `unauthorized_client`,
`unsupported_response_type`, `invalid_scope`, `server_error`,
`temporarily_unavailable`, `login_required`, `consent_required`,
`interaction_required`.

`NonOAuthError['type']` (what `onNonOAuthError` carries):
`popup_failed_to_open`, `popup_closed`, `request_expired`, `request_denied`,
`enrolment_abandoned`, `platform_unsupported`, `unknown`.

**The user-cancel path is not a real error.** `request_denied` (the holder
tapped decline) and `request_expired` (they walked away, or the device could
not meet a required liveness) are human outcomes, not faults: clear the pairing
UI and offer the button again. Do not log them as errors or paint a red banner.
`enrolment_abandoned` (someone started creating a ZOREAL ID and did not finish)
and `platform_unsupported` (a platform the ZOREAL ID app has not shipped to yet)
are the same shape and want the same gentle "try again / not available here"
treatment. Only `unknown` — a network or JavaScript fault — is worth a genuine
error path.

## A complete example

A full sign-in component, end to end — the shape a real auth-code integration
takes. It renders the button, renders its own pairing UI (the hook renders
none), hands `{ code, code_verifier, nonce }` to your backend on success, and
treats the decline/expiry path as the non-events they are.

```tsx
import { useState } from 'react';
import { ZorealOAuthProvider, useZorealLogin } from '@zoreal/oauth2-react';
import type { PairingState } from '@zoreal/oauth2-react';

function ZorealSignIn() {
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const login = useZorealLogin({
    flow: 'auth-code',
    scope: 'openid email profile.name',
    // acr_values: 'zoreal.live',  // request a fresh liveness for a step-up / high-value login
    onPairingStateChange: setPairing,

    onSuccess: async ({ code, code_verifier, nonce }) => {
      setPairing(null);
      // Post ALL THREE to YOUR backend over TLS. Your backend does the /token
      // exchange with its client authentication, verifies the ID token
      // (ES256 against the JWKS, iss/aud/exp, and this nonce), checks the acr
      // floor, then reads email and name from /userinfo. NONE of that can
      // happen here: the browser is attacker-controlled, so the backend is the
      // only place verification means anything. THE BACKEND MUST VERIFY.
      const res = await fetch('/api/auth/zoreal', {
        method: 'POST',
        // Your login route needs its own CSRF / same-origin protection, exactly
        // as any login endpoint does — the ZOREAL nonce protects the token, not
        // your route. Send whatever token your framework expects here.
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code, code_verifier, nonce }),
      });
      if (res.ok) window.location.assign('/');
      else setNote('Sign-in could not be completed. Please try again.');
    },

    // An OAuth error from the provider (e.g. a scope not on your allow list).
    onError: (e) => {
      setPairing(null);
      setNote(e.description ?? e.error); // the provider's words, verbatim
    },

    // The human outcomes: declined, expired, cancelled. Not faults — clear the
    // pairing UI and let them try again. Do not alarm on these.
    onNonOAuthError: (e) => {
      setPairing(null);
      if (e.type === 'request_denied') setNote('Login was declined. Try again when ready.');
      else if (e.type === 'request_expired') setNote('That took too long. Try again.');
      else setNote('Something went wrong. Try again.');
    },
  });

  return (
    <div>
      <button onClick={login}>Continue with ZOREAL</button>

      {/* The hook renders nothing, so the pairing UI is yours. On desktop the
          login cannot complete until something shows pairing.qrUrl to scan. */}
      {pairing && !pairing.appLink && ['pending', 'claimed'].includes(pairing.status) && (
        <div role="dialog" aria-label="Log in with ZOREAL">
          <img src={pairing.qrUrl} alt="Log in with ZOREAL" width={200} height={200} />
          <p>
            {pairing.status === 'claimed'
              ? 'Approve the login in your ZOREAL ID app.'
              : 'Scan with your phone camera or the ZOREAL ID app.'}
          </p>
          <button onClick={pairing.cancel}>Cancel</button>
        </div>
      )}

      {note && <p role="status">{note}</p>}
    </div>
  );
}

export default function App() {
  return (
    <ZorealOAuthProvider clientId="ast_your_asset_id">
      <ZorealSignIn />
    </ZorealOAuthProvider>
  );
}
```

**The backend must verify.** This component only starts the flow and forwards a
code; on its own it proves nothing. The security is your backend exchanging the
code with its client authentication and verifying the signed ID token — use a
family library (below) rather than hand-rolling it.

## Security notes

- **Always pass the `nonce` through — and it is not your CSRF token.** The SDK
  generates the nonce and hands it to `onSuccess`; forwarding it lets your
  backend confirm the ID token was minted for *this* login rather than
  substituted. Two things it does **not** do: it is not your login endpoint's
  CSRF token (protect that route with your framework's normal CSRF /
  same-origin defence, exactly as you would any login endpoint), and it is not
  what binds the code to whoever started the flow.
- **PKCE is what binds the code to the initiator.** The verifier is generated in
  the browser and never leaves it except to your backend; without it the
  exchange cannot complete, which is why `onSuccess` hands over `code_verifier`.
  PKCE is mandatory for every client and there is no plain fallback.
  `ux_mode: 'redirect'` is refused in v1 precisely because it would put the
  verifier in a URL, i.e. in every access log on the path.
- **The `issuer` must match the token's `iss` exactly.** It is compared as a
  string, not normalized. Production is `https://id.zoreal.com`; override the
  `issuer` prop only when pointing at a non-production provider origin you were
  explicitly given. Your backend verifies `iss` the same way.
- **No secret lives in the browser.** The provider takes no `clientSecret` prop
  and never will. The client secret is your backend's; the browser holds only
  the public `clientId`.

## What your page needs to allow

The package loads no third-party script, no stylesheet, no font, and has zero
runtime dependencies. Two things touch the network, both on the ZOREAL origin:

| CSP directive | Value | Why |
|---|---|---|
| `connect-src` | `https://id.zoreal.com` | starting the pairing, polling it, and (button mode) the code exchange |
| `img-src` | `https://id.zoreal.com` | the QR image, served by the provider so it stays correct and current |

## The rules this package follows

- **No secret has a home here.** The provider takes no `clientSecret` prop and
  never will; a pull request adding one is a security bug regardless of its
  documentation.
- **The ID token in browser mode carries no personal data.** Personal claims
  exist only at `/userinfo`, behind an access token browser mode is never
  issued for those scopes. There is no configuration that changes this.
- **Server errors are shown, not rewritten.** Whatever reason the provider
  gives, `description` carries it verbatim.
- **The button copy is neutral.** "Continue with ZOREAL" and variants; there is
  no "verified human" button text and there will not be one. The assertion
  lives in the token, where it is verifiable.

## Verifying this release

Every version is published from GitHub Actions with [npm provenance](https://docs.npmjs.com/generating-provenance-statements): the package page on npmjs.com carries a **Provenance** panel linking the exact commit and workflow run that built the tarball, signed through [Sigstore](https://www.sigstore.dev/) and recorded in its public transparency log. No long-lived npm token stands behind it — the workflow authenticates by OIDC ([trusted publishing](https://docs.npmjs.com/trusted-publishers)), so a leaked CI secret cannot cut a release.

Check the signatures on what you actually installed:

```sh
npm install @zoreal/oauth2-react
npm audit signatures
```

## The ZOREAL OAuth2 library family

| Repository | Package | Role |
|---|---|---|
| zoreal-oauth2-react | @zoreal/oauth2-react (npm) | React frontend: the button, the QR, the polling |
| zoreal-oauth2-js | @zoreal/oauth2-js (npm) | Framework-free browser core |
| zoreal-oauth2-react-native | @zoreal/oauth2-react-native (npm) | React Native frontend |
| zoreal-oauth2-node | @zoreal/oauth2-node (npm) | Node.js backend |
| zoreal-oauth2-ruby | zoreal-oauth2 (RubyGems) | Ruby backend |
| zoreal-oauth2-python | zoreal-oauth2 (PyPI) | Python backend |
| zoreal-oauth2-php | zoreal/oauth2 (Packagist) | PHP backend |
| zoreal-oauth2-go | github.com/Bynn-Intelligence/zoreal-oauth2-go | Go backend |
| zoreal-oauth2-java | com.zoreal:oauth2 (Maven Central) | JVM backend |
| zoreal-oauth2-dotnet | Zoreal.OAuth2 (NuGet) | .NET backend |

Every backend library supports all four registered client authentication
methods: `none` (public client, PKCE alone), `client_secret_basic`,
`private_key_jwt` (a fresh 60-second single-use assertion per exchange), and
`tls_client_auth` (configurable now; the provider itself does not accept it at
`/token` yet and answers 501, which the libraries surface rather than hide).

## License

MIT
