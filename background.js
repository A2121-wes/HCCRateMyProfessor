// HCCRate - background.js
// Handles all fetch requests to RateMyProfessors from the content script.

const RMP_GRAPHQL = "https://www.ratemyprofessors.com/graphql";

// Houston Community College RMP school node ID.
// Base64 of "School-1356" → "U2Nob29sLTEzNTY="
// If ratings don't load, open RMP, search your school, and update this.
const HCC_SCHOOL_ID = "U2Nob29sLTIxODQ=";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PROFESSOR_RATING") {
    fetchProfessorRating(message.name)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keeps the message channel open for async response
  }
});

async function fetchProfessorRating(fullName) {
  // Check cache first
  const cacheKey = `rmp_${fullName.toLowerCase().replace(/\s+/g, "_")}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const query = `
    query TeacherSearchQuery($text: String!, $schoolID: ID!) {
      newSearch {
        teachers(query: { text: $text, schoolID: $schoolID }) {
          edges {
            node {
              id
              firstName
              lastName
              avgRating
              avgDifficulty
              numRatings
              wouldTakeAgainPercent
              department
              school {
                name
              }
            }
          }
        }
      }
    }
  `;

  const nameParts = fullName.trim().split(/\s+/);
  // Try full name, then last name only for broader matching
  const searchTerms = [fullName];
  if (nameParts.length > 1) searchTerms.push(nameParts[nameParts.length - 1]);

  for (const term of searchTerms) {
    const result = await queryRMP(query, { text: term, schoolID: HCC_SCHOOL_ID });
    const edges = result?.data?.newSearch?.teachers?.edges ?? [];

    if (edges.length === 0) continue;

    // Find best match: prefer exact full-name match, otherwise take first result
    const bestMatch = findBestMatch(edges, fullName) ?? edges[0].node;

    const data = {
      id: bestMatch.id,
      name: `${bestMatch.firstName} ${bestMatch.lastName}`,
      rating: bestMatch.avgRating,
      difficulty: bestMatch.avgDifficulty,
      numRatings: bestMatch.numRatings,
      wouldTakeAgain: bestMatch.wouldTakeAgainPercent,
      department: bestMatch.department,
      rmpUrl: `https://www.ratemyprofessors.com/professor/${atob(bestMatch.id).split("-")[1]}`,
    };

    await setCache(cacheKey, data);
    return data;
  }

  // No match found — cache negative result briefly (5 min)
  const noData = { notFound: true };
  await setCache(cacheKey, noData, 5);
  return noData;
}

function findBestMatch(edges, fullName) {
  const lower = fullName.toLowerCase();
  for (const { node } of edges) {
    const nodeName = `${node.firstName} ${node.lastName}`.toLowerCase();
    if (nodeName === lower) return node;
  }
  // Try last name + first initial
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1].toLowerCase();
  const firstInitial = parts[0]?.[0]?.toLowerCase();
  for (const { node } of edges) {
    if (
      node.lastName.toLowerCase() === lastName &&
      node.firstName[0]?.toLowerCase() === firstInitial
    ) {
      return node;
    }
  }
  return null;
}

async function queryRMP(query, variables) {
  const resp = await fetch(RMP_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic dGVzdDp0ZXN0",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new Error(`RMP HTTP ${resp.status}`);
  return resp.json();
}

// ── Cache helpers using chrome.storage.local ──────────────────────────────────

async function getCached(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      const entry = result[key];
      if (!entry) return resolve(null);
      const ttlMinutes = entry.ttl ?? 60;
      const age = (Date.now() - entry.ts) / 60000;
      if (age > ttlMinutes) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }
      resolve(entry.value);
    });
  });
}

async function setCache(key, value, ttlMinutes = 60) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: { value, ts: Date.now(), ttl: ttlMinutes } }, resolve);
  });
}
