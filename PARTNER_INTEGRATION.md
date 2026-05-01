# SuiVerify Partner Integration Guide

Drop-in KYC for your product. Your users verify their identity once at
`app.suiverify.xyz`, you receive a verifiable on-chain NFT proof, and you grant
them access. Subsequent products in the SuiVerify network can reuse the same
NFT — no re-verification, no friction.

This guide assumes you have already received a `client_id` and `api_key` from
the SuiVerify team. If not, see [Step 1](#1-request-access).

---

## Integration at a glance

```
[Your product]                    [SuiVerify]                    [Sui chain]
       |                                |                              |
   user clicks                          |                              |
   "Verify"  ───────────────────────────►                              |
       |                          login + KYC                          |
       |                                ▼                              |
       |                          mint DID NFT  ───────────────────────►
       |                                │                              |
       |◄───── redirect with nft_id ────┘                              |
       |                                                               |
   sdk.verifyDIDNFT(nft_id)  ─────────────────────────────────────────►
       |                                                          on-chain
       |◄────────────────────── { isValid: true } ─────────────────────┘
       |
   grant access
```

---

## 1. Request access

Email **partners@suiverify.xyz** with:

- Product name
- One or more `redirect_uri` values where you want users to land after
  verification (e.g. `https://yourapp.com/verify/callback`).
  - Must be HTTPS in production. Exact-match allowlisted; no wildcards.
- A short description of how you'll use SuiVerify.

You will receive:

- `client_id` — public, used in browser URLs (e.g. `acme_abc123def`).
- `api_key` — secret, store in your **backend env** only. Never ship to a
  browser. Used for the usage/billing endpoint.

---

## 2. Install the SDK

```bash
npm install suiverify-sdk
# or
pnpm add suiverify-sdk
```

---

## 3. Add the "Verify with SuiVerify" button

On your frontend, generate a random `state` per session and build the link:

```ts
// pages/verify-start.tsx (or any partner-side page)
import crypto from 'crypto';

const SUIVERIFY_BASE = 'https://app.suiverify.xyz';
const CLIENT_ID = process.env.NEXT_PUBLIC_SUIVERIFY_CLIENT_ID!;
const REDIRECT_URI = 'https://yourapp.com/verify/callback';

export function VerifyButton() {
  const state = crypto.randomBytes(16).toString('hex');
  // Persist `state` in your session — you will compare it on the callback.
  setSessionState(state);

  const url = new URL(`${SUIVERIFY_BASE}/connect`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('did_type', '1'); // 1 = age verification

  return <a href={url.toString()}>Verify with SuiVerify</a>;
}
```

### Query parameters

| Param          | Required | Notes                                                                  |
| -------------- | :------: | ---------------------------------------------------------------------- |
| `client_id`    |    yes   | Issued by SuiVerify team.                                              |
| `redirect_uri` |    yes   | Must exactly match an allowlisted URI. Sent back the user after verify. |
| `state`        |    yes   | Random per-session string. CSRF defense. You will validate on callback.|
| `did_type`     |    yes   | Verification kind. `1` = age. More kinds coming.                       |

---

## 4. Handle the callback on your backend

After verification the user lands on your `redirect_uri` with these query params:

| Param      | When         | Notes                                                   |
| ---------- | ------------ | ------------------------------------------------------- |
| `status`   | always       | `success` or `error`.                                   |
| `state`    | always       | Echo of the `state` you sent. Validate against session. |
| `nft_id`   | on `success` | Sui object id of the user's DID NFT.                    |
| `owner`    | on `success` | Sui address that owns the NFT.                          |
| `is_new`   | on `success` | `"true"` if NFT was just minted, `"false"` if reused.  |
| `reason`   | on `error`   | Short error code (e.g. `user_cancelled`).               |

There are two verification paths depending on `is_new`:

### Path A — New mint (`is_new=true`)

The user just completed KYC and the NFT was minted during this session.
SuiVerify's backend confirmed the mint; your callback only needs to confirm
the object exists on-chain and is the right type:

```ts
// pages/api/verify/callback.ts
import { SuiClient } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });

export default async function handler(req, res) {
  const { status, state, nft_id, owner, is_new, reason } = req.query;

  if (status !== 'success') return res.redirect(`/verify-failed?reason=${reason}`);

  // 1. CSRF check
  if (state !== session(req).suiverifyState) return res.status(400).send('invalid state');

  if (is_new === 'true') {
    // Confirm NFT object exists and is a DIDSoulBoundNFT (read-only, no gas)
    const obj = await suiClient.getObject({ id: nft_id, options: { showType: true } });
    if (!obj.data?.type?.includes('DIDSoulBoundNFT')) {
      return res.status(403).send('invalid nft');
    }

    await markUserVerified(session(req).userId, { nftId: nft_id, walletAddress: owner });
    return res.redirect('/dashboard');
  }
}
```

No private key or gas required. The trust anchor is SuiVerify's KYC flow
plus the NFT's existence on-chain.

### Path B — Reuse (`is_new=false`)

The user already held a valid DID NFT (minted in a previous session, possibly
for a different partner). Verify the enclave signature on-chain to
cryptographically confirm the NFT was issued by SuiVerify's enclave:

```ts
// pages/api/verify/callback.ts (continued)
import { SuiVerifySDK } from 'suiverify-sdk';

const sdk = new SuiVerifySDK({
  rpcUrl: 'https://fullnode.mainnet.sui.io',
  packageId: process.env.SUIVERIFY_PACKAGE_ID!,
  privateKey: process.env.SUIVERIFY_VERIFIER_PRIVATE_KEY!, // funded Sui wallet for gas
  network: 'mainnet',
});

  // ...inside handler, after CSRF check:
  if (is_new === 'false') {
    // On-chain enclave signature check — cryptographic proof, no trust in SuiVerify API
    const result = await sdk.verifyDIDNFT(nft_id as string);
    if (!result.isValid) return res.status(403).send(`NFT invalid: ${result.message}`);

    await markUserVerified(session(req).userId, { nftId: nft_id, walletAddress: owner });
    return res.redirect('/dashboard');
  }
```

This requires your backend to hold a Sui wallet (`SUIVERIFY_VERIFIER_PRIVATE_KEY`)
funded with SUI for gas. Set it up once — costs are minimal (a few MIST per call).

---

## 5. Verification path summary

| Scenario | `is_new` | What partner does | Gas needed |
| -------- | -------- | ----------------- | ---------- |
| First-time KYC, NFT just minted | `true` | `getObject` type check (read-only) | No |
| Returning user, NFT already existed | `false` | `sdk.verifyDIDNFT` (on-chain sig check) | Yes (tiny) |

---

## 6. Usage & billing endpoint

Your backend can query your verification counts at any time:

```bash
curl -H "Authorization: Bearer $SUIVERIFY_API_KEY" \
  "https://api.suiverify.xyz/api/partners/$CLIENT_ID/usage?from=2026-04-01T00:00:00Z&to=2026-05-01T00:00:00Z"
```

Returns:

```json
{
  "client_id": "acme_abc123def",
  "total": 412,
  "new_mints": 248,
  "reused": 164,
  "from_ts": "2026-04-01T00:00:00Z",
  "to_ts": "2026-05-01T00:00:00Z"
}
```

`new_mints` are full KYC verifications, `reused` are instant cross-product
reuses (typically billed at a lower rate — see your contract).

---

## 7. Security checklist

- [ ] `state` is generated server-side (or browser crypto), tied to the user's
      session, and compared exactly on callback. **This is the CSRF defense.**
- [ ] `redirect_uri` is HTTPS in production.
- [ ] `api_key` lives only in backend env vars. Never in source control,
      browser bundles, or mobile binaries.
- [ ] Always call `sdk.verifyDIDNFT(nft_id)` server-side. Don't trust the
      redirect contents alone.
- [ ] **Bind the wallet to your user before redirecting.** The redirect tells
      you "this NFT exists and is valid" — it does not by itself prove that
      the human currently on your site controls the wallet that owns the NFT.
      Two common ways:
      1. The user is already authenticated in your app (cookie session) when
         they click the verify button. The `state` ties the redirect back to
         that session — sufficient for most B2C flows.
      2. For higher-stakes flows, additionally have the user sign a
         partner-issued nonce with their wallet after the redirect.
- [ ] Optionally check NFT expiry (`expiry_epoch` field on the NFT) before
      granting long-lived access.

---

## 8. Errors

| `reason` value     | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `user_cancelled`   | User clicked Cancel on the SuiVerify consent page.     |
| `invalid_partner`  | `client_id` or `redirect_uri` not allowlisted.         |
| `kyc_failed`       | DigiLocker / document verification failed.             |
| `enclave_error`    | Internal verification error. Safe to retry.            |

Show a friendly error page and offer a "Try again" button that re-launches
the verify URL with a fresh `state`.

---

## 9. Going to production

- Switch `network: 'testnet'` to `'mainnet'` in the SDK config when SuiVerify
  ships mainnet (currently testnet).
- Update the SDK's `packageId` if/when SuiVerify rotates contracts — stay on
  the latest minor of `suiverify-sdk` and read `RELEASE_NOTES.md`.
- Rotate your `api_key` if you suspect leakage (email
  `partners@suiverify.xyz`).

---

## 10. Need help?

- Email: `partners@suiverify.xyz`
- SDK source: https://github.com/SuiVerify/suiverify-sdk
- Issues: https://github.com/SuiVerify/suiverify-sdk/issues
