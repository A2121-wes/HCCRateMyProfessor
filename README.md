# HCCRate

> RateMyProfessors ratings injected directly into the HCC schedule builder — no tab switching, no searching, just pick the best professor.

![HCC](https://img.shields.io/badge/Houston%20Community%20College-0035ac?style=flat-square)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Overview

HCCRate is a Chrome extension that enhances the HCC class search experience by pulling **RateMyProfessors** data and displaying it inline — right next to each instructor's name while you browse sections. No need to open a second tab or search manually.

![HCCRate Screenshot](hccrate_screenshot_1280x800.png)

---

## Features

- **Inline ratings** — Quality rating, difficulty score, and "would take again" percentage displayed next to every instructor
- **Best Instructors panel** — A floating, draggable panel ranks all instructors on the page so you can instantly spot the best option
- **Multiple sort modes** — Sort by highest rating, lowest difficulty, or room/building
- **Collapsible panel** — Minimize the panel when you don't need it so it stays out of your way
- **Smart caching** — Results are cached locally so repeat searches are instant
- **No page interruptions** — Clicking RMP links opens in a new tab without triggering PeopleSoft's row navigation

---

## Installation

### Chrome Web Store *(Recommended)*
Coming soon.

### Developer Mode (Manual)

1. Download the latest ZIP from the [Releases](../../releases) page
2. Unzip the file
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** in the top-right corner
5. Click **Load unpacked** and select the unzipped `HCCRate` folder
6. Navigate to the [HCC Class Search](https://hccsaweb.hccs.edu/psc/csprd_31/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_CRSEINFO_FL.GBL) and search for any class

---

## How It Works

1. Detects instructor names in the HCC PeopleSoft schedule builder
2. Queries the RateMyProfessors GraphQL API for matching professors at Houston Community College
3. Injects rating data inline next to each instructor name
4. Builds a ranked panel of all instructors on the page, sortable by rating, difficulty, or room

---

## Data Sources

| Source | Data |
|--------|------|
| [RateMyProfessors](https://www.ratemyprofessors.com/school/2184) | Quality rating, difficulty, would take again %, rating count |

---

## Privacy

HCCRate is designed with privacy in mind:

- Runs **only** on `hccsaweb.hccs.edu`
- Makes outbound requests **only** to `ratemyprofessors.com` to fetch public professor data
- **Does not** collect, transmit, or store any personal user data
- Caches professor ratings locally on your device to reduce repeat requests

---

## Troubleshooting

**Ratings aren't showing up?**

PeopleSoft's DOM structure can vary. Open DevTools (`F12` → Elements), find the HTML element containing an instructor name, and note its `id`. Add that pattern to the `INSTRUCTOR_SELECTORS` array in `content.js`.

**Seeing professors from the wrong school?**

The extension targets HCC school ID `2184` on RateMyProfessors (Houston Community College — all campuses). If something looks off, verify at `ratemyprofessors.com/school/2184`.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## Disclaimer

This extension is not affiliated with or endorsed by Houston Community College or RateMyProfessors.

---

## License

[MIT](LICENSE)
