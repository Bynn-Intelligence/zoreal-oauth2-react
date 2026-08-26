# @zoreal/oauth2-react

Login with ZOREAL for React: a chip-verified human behind every sign-in.

The API mirrors `@react-oauth/google` one to one, renamed, so a team already
integrated with Google ports by find and replace. The full mapping and every
design decision live in the specification this package is built against:
`zoreal/products/oauth2/05-react-sdk.md` in the specification repo.

## Status

The package is real; the provider it speaks to is being built. This code pins
wire protocol v1 and is not yet published to npm. Nothing below works against
production today, and this section is removed the day that changes.

## Install

Not yet published. When it is: `npm install @zoreal/oauth2-react`.

## Quick start: the button (no backend needed)

```tsx
import { ZorealOAuthProvider, ZorealLogin } from '@zoreal/oauth2-react';

<ZorealOAuthProvider clientId="ast_your_asset_id">
  <ZorealLogin
    onSuccess={({ credential }) => {
      // credential is an ID token: a pairwise pseudonymous `sub` plus
      // assurance claims. Verify it server-side against the JWKS before
      // trusting it. It NEVER contains personal data, by construction.
    }}
    onError={(e) => console.warn(e.type, e.description)}
  />
</ZorealOAuthProvider>
```

On desktop the button shows a QR; the user scans it with their phone and
approves in the ZOREAL ID app. On a phone it opens the app directly. Either
way your page just receives `onSuccess`.

## Quick start: auth-code (personal data, requires your backend)

```tsx
import { useZorealLogin } from '@zoreal/oauth2-react';

const login = useZorealLogin({
  flow: 'auth-code',
  scope: 'openid profile.name',
  onSuccess: async ({ code, code_verifier }) => {
    // Send BOTH to your backend over TLS. Your backend calls POST /token
    // with them plus its client authentication (private_key_jwt, mTLS, or
    // client secret), then reads personal claims from /userinfo.
    await fetch('/api/auth/zoreal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier }),
    });
  },
});
```

`ux_mode: 'redirect'` is not supported in v1: it would put the PKCE verifier
in a URL, which is a credential in every access log on the path.

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
