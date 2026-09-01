# Privacy Policy for PinJar

[Diese Erklärung auf Deutsch](privacy-policy.de.md)

**Last updated:** 1 September 2026

PinJar is a browser extension for saving links and finding them again. All data this produces
remains in your browser's local storage, on your device.

There is no user account, no server, no synchronisation, no tracking and no analytics. No data is
transmitted to me as the provider or to any third party, and there is no technical provision for
doing so.

This policy sets that out in detail, including the only network access the extension causes.

## Controller

Angelika Kebhart
Email: pinjar@kebhart.net

## What PinJar stores

All data is written to the extension's local storage (`storage.local`). It resides in your browser
profile on your device. It is not part of your browser account's synchronisation and is therefore
not transferred to your other devices.

For each saved link:

| Data                        | Origin                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Page address (URL)          | the page you were on when saving                                  |
| Domain                      | derived from that address, as the basis for the badge             |
| Page title                  | the page's `og:title` or its `<title>`, editable by you           |
| Preview image address (URL) | the page's `og:image` or `twitter:image`, where present           |
| Category, tags, status      | your own input                                                    |
| Note                        | your own input                                                    |
| Date created and modified   | set by the extension                                              |

Separately from the links, PinJar stores the categories, tags and status labels you have already
used, in order to offer them again, along with your two interface settings: language and light or
dark appearance. Only your selection is stored — no detected locale, no resolved appearance and no
timestamps.

## What PinJar does not collect

- No account, no registration, no email address, no name.
- No analytics, telemetry, crash reports or usage statistics.
- No cookies, no advertising identifiers, no device fingerprint.
- No browsing history. Only pages you have actively clicked save on are stored.
- No content of the pages you visit beyond the title and preview image address named above.

Your data is not sold, not disclosed to third parties and not used for advertising purposes.

## Network access

Preview images are stored as an address rather than as image data. When you open the dashboard, your
browser therefore loads these images from the websites they originate from, as with any other web
page.

Those websites thereby learn your IP address and the time of the request. The access is restricted
as far as possible:

- No data stored by PinJar is transmitted. The request is an ordinary image request and contains
  none of your data.
- Requests are made only to websites you deliberately saved a link from.
- They are sent without a referrer, so the website is not told the context they originate from.
- They are made only for images scrolled into view, or close to it.

This is the only network access PinJar causes. The extension loads no code from the internet,
contacts no translation service and has no backend of its own.

## Permissions and their purpose

| Permission  | Purpose                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `storage`   | keeping your saved links on this device                                     |
| `activeTab` | reading a page's title and preview image — only when you click save on it   |
| `scripting` | running that single, read-only extraction in the page being saved           |
| `tabs`      | reading the address of open tabs, to count what you saved on the site       |

PinJar requests **no host permission** and therefore has no standing access to the content of the
websites you visit.

`tabs` is the permission with the most visible implications: browsers present it at installation as
_"read your browsing history"_, since it allows the extension to read the addresses of your open
tabs. It is a prerequisite for the domain badge. Those addresses are compared in memory against the
domains you have saved links for, in order to determine the number displayed. They are not stored,
not logged and not transmitted.

The reading of a page when saving it is a single, read-only operation: it evaluates the page's meta
tags and its document title, and nothing else.

## Legal basis

The data arises solely on your device and is processed nowhere else. Insofar as the GDPR applies to
it, the legal basis is Art. 6(1)(b) GDPR: saving a link is precisely the service you installed the
extension for and clicked save to obtain. Without it the extension would serve no purpose.

There is no automated decision-making and no profiling.

## Retention and deletion

PinJar does not delete data on its own. Your data remains stored until you remove it, by any of the
following means:

- **Delete a single link** — from the popup or the dashboard.
- **Delete all data at once** — dashboard, _Manage_ → data dialog → delete all data.
- **Uninstall the extension** — the browser removes its local storage along with it.

You can also **export all data as a JSON file** at any time and import it into another browser.
That file is unencrypted plain text and contains your notes verbatim. Keep it accordingly and share
it only deliberately.

## Your rights

Under the GDPR you have the right of access to your data, together with the rights to
rectification, erasure, restriction of processing, data portability and objection.

You exercise these rights in the extension itself, because I have no access to your data and could
hand nothing over in response to a request: access and portability through the export, rectification
by editing a link, erasure by removing a single link or all data at once. The paths are described
under _Retention and deletion_ above.

If you have questions beyond that about the processing of your data, you are welcome to contact the
address given above at any time.

Independently of this, you have the right to lodge a complaint with a supervisory authority at any
time. The authority competent is the Austrian Data Protection Authority (Österreichische
Datenschutzbehörde, Barichgasse 40-42, 1030 Vienna, dsb@dsb.gv.at).

## Changes to this policy

If what PinJar stores or processes changes, this policy is amended in the same change; the date at
the top gives the version. Its history is public in the project repository, where every change can
be traced.
