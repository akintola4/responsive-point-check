# Security Policy

## Supported versions

RPC is shipped from `main`. Only the latest published commit on `main`
receives security updates. There are no maintained backports.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security findings.

Email **akintope830@gmail.com** with:

- A short summary of the issue.
- Steps to reproduce, ideally with a minimal proof-of-concept (e.g. a
  URL or HTML snippet) that demonstrates the impact when loaded in a
  panel iframe.
- Your assessment of the severity (Low / Medium / High / Critical).
- Whether you'd like public credit when the fix lands.

You should expect:

- An acknowledgement within **72 hours**.
- A first triage update within **7 days**.
- A patch on `main` within **30 days** for High/Critical reports, or a
  reasoned timeline if the underlying fix is larger.

## Scope

Things that are in scope:

- Anything that lets a previewed page break out of the iframe sandbox
  and act on the panel page or other tabs.
- Anything that lets a non-extension origin send messages the
  frame-bridge content script will act on.
- Mis-scoped `declarativeNetRequest` rules that strip security headers
  outside the panel context.
- Permission escalation via the action click → panel-tab handoff.
- Local persistence (`chrome.storage.local`) leaking sensitive data
  beyond what the user typed in.

Things that are **out of scope**:

- Sites that block iframe embedding via JavaScript framebusting (e.g.
  `if (window.top !== window) location.replace(...)`). RPC strips
  `X-Frame-Options` and CSP `frame-ancestors`, but it cannot defeat
  client-side detection.
- Cross-origin cookie behaviour governed by Chrome's `SameSite` rules.
  Sites with `SameSite=Strict` won't authenticate inside iframes — this
  is a Chrome restriction, not an RPC issue.
- Reports against the panel UI from the user's own perspective (the
  panel is a `chrome-extension://` origin, so the user is implicitly
  trusted).

## Safe-harbor

Good-faith research that follows this policy will not result in legal
action from this project. Avoid privacy violations, destruction of
data, or interruption of services to others while testing. Use accounts
you own.

## Disclosure

After a fix lands on `main`, the report can be disclosed publicly. If
you'd like coordinated disclosure on a specific date, mention it in
your report and we'll align.
