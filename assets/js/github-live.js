/* GitHub Live Metrics — fetches repo data from the public API
   and updates the portfolio metrics + project cards.
   sessionStorage cache with 15-min TTL to stay well under the
   60 req/hr unauthenticated rate limit.                         */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────
  var USERNAME = "SinProp";
  var CACHE_KEY = "gh_live_cache";
  var TTL_MS = 15 * 60 * 1000; // 15 minutes

  // Map GitHub repo names → project card heading IDs
  var REPO_MAP = {
    Manifest: "proj-manifest-title",
    "Value-Chain-Manifest": "proj-valuechain-title",
    "island-estimator": "proj-estimator-title",
    "Island-Platform": "proj-platform-title",
    "Production-Scheduling": "proj-current-title",
    SwiftSail: "proj-swiftsail-title",
    ValorTrack: "proj-valortrac-title",
    govpulsepro: "proj-govpulse-title",
    TimeTrackerApp: "proj-islandtime-title",
  };

  // ── Cache layer ─────────────────────────────────────────────
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > TTL_MS) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: data }),
      );
    } catch (_) {
      /* quota exceeded — no-op */
    }
  }

  // ── Relative time formatter ─────────────────────────────────
  var RTF =
    typeof Intl !== "undefined" && Intl.RelativeTimeFormat
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
      : null;

  function relativeTime(isoDate) {
    var diff = Date.now() - new Date(isoDate).getTime();
    var secs = Math.round(diff / 1000);
    if (secs < 60) return "just now";

    var mins = Math.round(secs / 60);
    if (mins < 60) return RTF ? RTF.format(-mins, "minute") : mins + "m ago";

    var hrs = Math.round(mins / 60);
    if (hrs < 24) return RTF ? RTF.format(-hrs, "hour") : hrs + "h ago";

    var days = Math.round(hrs / 24);
    if (days < 30) return RTF ? RTF.format(-days, "day") : days + "d ago";

    var months = Math.round(days / 30);
    if (months < 12)
      return RTF ? RTF.format(-months, "month") : months + "mo ago";

    var years = Math.round(months / 12);
    return RTF ? RTF.format(-years, "year") : years + "y ago";
  }

  // ── DOM helpers ─────────────────────────────────────────────
  function showLoading() {
    var el = document.getElementById("metrics-loading");
    if (el) el.hidden = false;
  }
  function hideLoading() {
    var el = document.getElementById("metrics-loading");
    if (el) el.hidden = true;
  }
  function showError() {
    var el = document.getElementById("metrics-error");
    if (el) el.hidden = false;
  }

  // ── Update metrics grid ─────────────────────────────────────
  function updateMetrics(stats) {
    var map = {
      "public-repos": stats.publicRepos,
      "active-repos": stats.activeRepos,
      languages: stats.languages,
    };
    Object.keys(map).forEach(function (key) {
      var el = document.querySelector('[data-metric="' + key + '"]');
      if (el) el.textContent = map[key];
    });
  }

  // ── Update project cards ────────────────────────────────────
  function updateCards(repos) {
    var repoByName = {};
    repos.forEach(function (r) {
      repoByName[r.name] = r;
    });

    Object.keys(REPO_MAP).forEach(function (repoName) {
      var headingId = REPO_MAP[repoName];
      var heading = document.getElementById(headingId);
      if (!heading) return;

      var card = heading.closest(".project-card");
      if (!card) return;

      var repo = repoByName[repoName];
      if (!repo) return;

      var badge = card.querySelector(".repo-update-badge");
      if (!badge) return;

      var pushed = repo.pushed_at;
      var daysSince =
        (Date.now() - new Date(pushed).getTime()) / (1000 * 60 * 60 * 24);

      badge.textContent = "Updated " + relativeTime(pushed);
      badge.classList.add("visible");
      if (daysSince <= 7) badge.classList.add("fresh");
    });
  }

  // ── Transform raw API data ─────────────────────────────────
  function transform(user, repos) {
    var thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    var activeRepos = repos.filter(function (r) {
      return new Date(r.pushed_at).getTime() > thirtyDaysAgo;
    });
    var langs = {};
    repos.forEach(function (r) {
      if (r.language) langs[r.language] = true;
    });

    return {
      publicRepos: user.public_repos,
      activeRepos: activeRepos.length,
      languages: Object.keys(langs).length,
      repos: repos,
    };
  }

  // ── Fetch layer ─────────────────────────────────────────────
  function fetchFromGitHub() {
    var base = "https://api.github.com";
    return Promise.all([
      fetch(base + "/users/" + USERNAME),
      fetch(base + "/users/" + USERNAME + "/repos?per_page=100&sort=pushed"),
    ]).then(function (responses) {
      if (!responses[0].ok || !responses[1].ok)
        throw new Error("GitHub API error");
      return Promise.all([responses[0].json(), responses[1].json()]);
    });
  }

  // ── Main ────────────────────────────────────────────────────
  function init() {
    var cached = readCache();

    if (cached) {
      hideLoading();
      updateMetrics(cached);
      updateCards(cached.repos);
      return;
    }

    showLoading();

    fetchFromGitHub()
      .then(function (results) {
        var stats = transform(results[0], results[1]);
        writeCache(stats);
        hideLoading();
        updateMetrics(stats);
        updateCards(stats.repos);
      })
      .catch(function () {
        hideLoading();
        showError();
      });
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
