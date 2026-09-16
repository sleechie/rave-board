# Security

Report vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/sleechie/rave-board/security/advisories/new). Include the affected commit, reproduction steps and likely impact. Do not publish credentials or personal data in an issue.

This is a small personal project with no guaranteed response time. The supported development version is `main`.

The server intentionally exposes three HTML pages and public assets. It has no login, database, upload endpoint or cloud Bluetooth control. Bluetooth access is requested in the user's browser and requires an explicit device selection. Browser settings stay in local storage.

Treat claims about control latency or successful clearing carefully: browser and operating-system callbacks do not prove that physical LEDs have changed.
