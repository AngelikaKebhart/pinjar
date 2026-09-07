# Security Policy

PinJar stores everything in the browser's local storage and talks to no server of its own, so
the damage a flaw here can do is bounded — but it runs as a browser extension, next to every
page you visit, and that is worth taking seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting instead: the **Security** tab of this repository →
**Report a vulnerability**. It creates a private advisory that only you and I can see, and it
keeps the whole exchange in one place.

If that does not work for you, write to **pinjar@kebhart.net** with `security` in the subject.

What helps most in a report:

- what an attacker can achieve, not only what looks wrong
- the steps to reproduce it, including the browser and version
- the commit or release the finding is based on

## What to expect

This is a personal project maintained in spare time, so no service level is promised. What I do
commit to: an acknowledgement within a week, an assessment of whether I consider it a
vulnerability, and — where it is one — a fix on `main` and a note in the advisory once it ships.
Credit in the advisory if you want it.

There is no bug bounty.

## Scope

In scope is the code in this repository: the extension's own logic, its handling of data read
from visited pages, the export/import path, and the permissions it requests.

Two things are known behaviour rather than findings, both documented in the
[Privacy Policy](docs/privacy-policy.md):

- Preview images are stored as URLs, so the dashboard loads them from the site they came from.
  That is the only network access the extension causes, and it means those sites can see a
  request when you open the dashboard.
- The `tabs` permission lets the extension read the addresses of open tabs, which is what the
  domain badge is built on. Browsers present this at install as "read your browsing history".

Reports about third-party dependencies are welcome, but please check first whether the advisory
is already tracked in [`pnpm-workspace.yaml`](pnpm-workspace.yaml), where accepted ones are
listed with a reason and a condition for removing them again.

## Supported versions

Only the current state of `main` is supported. There is no backporting to older releases.
