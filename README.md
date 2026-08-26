# @zoreal/oauth2-react

Login with ZOREAL for React: a chip-verified human behind every sign-in.

The API mirrors `@react-oauth/google` one to one, renamed, so a team already
integrated with Google ports by find and replace.

## Status

Early release. The package implements wire protocol v1. The hosted ZOREAL
login service is still rolling out, so treat this as a preview: the API is
stable, but end-to-end sign-in against production is not available everywhere
yet. This note is removed once the service is generally available.

## Install

```sh
npm install @zoreal/oauth2-react
```

`react` and `react-dom` (18 or 19) are peer dependencies.

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
import { useZorealLogin } from '@zoreal/oauth2-react';

// `email` (and profile.name, etc.) are returned from /userinfo on your backend.
const login = useZorealLogin({
  flow: 'auth-code',
  scope: 'openid email profile.name',
  onSuccess: async ({ code, code_verifier }) => {
    // Send BOTH to your backend over TLS. Your backend calls POST /token with
    // them plus its client authentication, then reads the email and name from
    // /userinfo. That is where personal data is delivered.
    const session = await fetch('/api/auth/zoreal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier }),
    });
  },
});
```

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

Exchange the `code` and `code_verifier` your `onSuccess` posted, then read the
user's details:

```
POST https://id.zoreal.com/token
  grant_type=authorization_code
  code=<code>
  code_verifier=<code_verifier>
  client_id=ast_your_asset_id
  <your client authentication>     # client secret, or a private_key_jwt assertion

-> { "id_token": "...", "access_token": "...", "expires_in": 600 }

GET https://id.zoreal.com/userinfo
  Authorization: Bearer <access_token>

-> { "sub": "...", "email": "...", "email_verified": true, "given_name": "...", ... }
```

Which fields come back depends on the scopes the user consented to. The
`id_token` is a JWT you verify against the JWKS at
`https://id.zoreal.com/jwks`.

`ux_mode: 'redirect'` is not supported in v1: it would put the PKCE verifier
in a URL, which is a credential in every access log on the path.

## Scopes

Request scopes in the `scope` string, space-separated, always starting with
`openid`. What each returns and where:

| Scope | Returns | Delivered in | Needs |
|---|---|---|---|
| `openid` | `sub` (stable per-user id) and a verification summary: uniqueness, month verified, whether a chip was read live | ID token | nothing |
| `zoreal.age` | `age_over_N` booleans for the thresholds you registered, e.g. `age_over_18`. Never an age or birthdate | ID token | nothing |
| `zoreal.nationality` | `nationality` (ISO 3166-1 alpha-3) | ID token | nothing |
| `email` | `email`, `email_verified` | `/userinfo` | verified domain, confidential client |
| `profile.name` | `name`, `given_name`, `family_name` | `/userinfo` | verified domain, confidential client |
| `profile.birthdate` | `birthdate` (full date) | `/userinfo` | verified domain, confidential client |
| `profile.document` | `document_type`, `document_number`, `issuing_country`, `document_expires_on` | `/userinfo` | verified domain, confidential client |
| `profile.portrait` | `portrait`, the photo from the document chip. Biometric data: requesting it makes you responsible for it under GDPR Article 9 and similar laws | `/userinfo` | verified domain, confidential client |

The first three are available to any client and ride in the ID token, so the
no-backend button can use them. Everything else is personal data: it is served
only from `/userinfo` to a confidential client whose domain you have verified in
the dashboard, and never placed in a browser-side token.

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
issuing country and expiry, all read from a chip and verified at enrolment,
plus the portrait if you requested it. That is the raw material for a KYC
check. You remain the controller of that data and responsible for how you
store, use, and justify collecting it; ZOREAL provides the verified attributes,
not a regulatory determination.

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

## License

MIT
