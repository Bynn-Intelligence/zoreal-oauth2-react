# @zoreal/oauth2-react

Login with ZOREAL for React: a ZOREAL Verified Proof-of-Human behind every sign-in.

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

## Scopes

Request scopes in the `scope` string, space-separated, always starting with
`openid`. What each returns and where:

| Scope | Returns | Delivered in | Needs |
|---|---|---|---|
| `openid` | `sub` (stable per-user id) and a proof-of-human summary: that this is a live, real, unique person verified by ZOREAL, when they were verified, and how strongly | ID token | nothing |
| `zoreal.age` | `age_over_N` booleans for the thresholds you registered, e.g. `age_over_18`. Never an age or birthdate | ID token | nothing |
| `zoreal.nationality` | `nationality` (ISO 3166-1 alpha-3) | ID token | nothing |
| `email` | `email`, `email_verified` | `/userinfo` | verified domain, confidential client |
| `profile.name` | `name`, `given_name`, `family_name` | `/userinfo` | verified domain, confidential client |
| `profile.birthdate` | `birthdate` (full date) | `/userinfo` | verified domain, confidential client |
| `profile.document` | `document_type`, `document_number`, `issuing_country`, `document_expires_on` | `/userinfo` | verified domain, confidential client |
| `profile.portrait` | `portrait`, the person's verified identity photo. Biometric data: requesting it makes you responsible for it under GDPR Article 9 and similar laws | `/userinfo` | verified domain, confidential client |

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

## Registration and development

The client id is the asset token from the ZOREAL dashboard (the asset's OAuth2
tab). Personal-data scopes need a confidential client on a verified domain;
the pairing start and its poll are checked against the client's authorized
JavaScript origins, so register the exact origins your pages run on. A
sandbox-environment client additionally accepts any `http://localhost` origin,
which is what makes local development work without registering every port.

Point the provider at a non-production issuer with the `issuer` prop; the
value must match the `iss` inside the tokens exactly.

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
