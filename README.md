# HCCRate

A Chrome extension that injects **RateMyProfessors** ratings directly into the **HCC MyEagle Schedule Builder**, so you can compare instructors without leaving the page.

![HCCRate badge example](https://img.shields.io/badge/RMP-⭐%204.2-green)

## Features

- ⭐ Inline RMP quality rating and difficulty score
- 📊 "Would take again" percentage
- 🔢 Total number of ratings
- 🔗 Direct link to the professor's RMP profile
- 💾 Local caching to keep things fast

## Install (Developer Mode)

1. Download or clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `HCCRate` folder
5. Navigate to [MyEagle Class Search](https://myeagle.hccs.edu/psc/sag_1/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_SP_FL.GBL?Action=U&MD=Y&GMenu=SSR_STUDENT_FL&GComp=SSR_START_PAGE_FL&GPage=SSR_START_PAGE_FL&scname=ADMN_HCC_SAG_CLSSRCH_NAV) and search for classes

## Troubleshooting

**No ratings are showing up?**

PeopleSoft pages vary between institutions. Open the browser DevTools (F12 → Elements) and find the HTML element containing an instructor's name. Note its `id` or class, then update the `INSTRUCTOR_SELECTORS` array at the top of `content.js` to match.

**Wrong school / professors from another HCC?**

The RMP school ID is hardcoded in `background.js` as `HCC_SCHOOL_ID`. The current value targets **Houston Community College (College Station)**. If ratings seem mismatched, verify the school ID by:
1. Going to `https://www.ratemyprofessors.com/search/schools?q=Houston+Community+College`
2. Finding your campus, clicking it
3. The URL will end with `/school/XXXX` — that number is the school ID
4. Convert it: `btoa("School-XXXX")` in the browser console, then paste the result into `background.js`

## Data Sources

- [RateMyProfessors](https://www.ratemyprofessors.com) — professor ratings, difficulty, would-take-again

## Privacy

HCCRate only runs on `myeagle.hccs.edu` and sends requests to RateMyProfessors to fetch professor data. It does not collect, transmit, or store any personal user data.

## Disclaimer

This extension is not affiliated with or endorsed by Houston Community College.
