/**
 * The matching of an RSS auto-download rule, ported from qBittorrent 5.3.0
 * (src/base/rss/rss_autodownloadrule.cpp: matchesExpression, matchesMustContainExpression,
 * matchesMustNotContainExpression, matchesEpisodeFilterExpression), so the rule editor can show
 * a live preview with reasons. After saving, rss/matchingArticles gives qBittorrent's own answer.
 *
 * - Without regex, "|" separates alternatives; inside one, every space-separated wildcard
 *   (* and ?) must occur, in any order, case-insensitive.
 * - With regex, the whole field is one expression (case-insensitive).
 * - The episode filter is "1x2;8-15;20-;" style: season x episodes and ranges.
 * The smart episode filter needs the history of matched episodes; it is not part of the preview.
 */

export interface RuleExpression {
  mustContain: string;
  mustNotContain: string;
  useRegex: boolean;
  episodeFilter: string;
}

export type MatchResult =
  | { ok: true; highlights: string[] }
  | { ok: false; reason: "missing"; detail: string }
  | { ok: false; reason: "excluded"; detail: string }
  | { ok: false; reason: "episode" }
  | { ok: false; reason: "invalid" };

/** QRegularExpression::wildcardToRegularExpression, unanchored. */
export function wildcardToRegex(wildcard: string): string {
  return wildcard
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
}

function split(tokens: string, useRegex: boolean): string[] {
  const list = useRegex ? [tokens] : tokens.split("|");
  return list.length === 1 && list[0] === "" ? [] : list;
}

function regexOf(expression: string, isRegex: boolean): RegExp {
  return new RegExp(isRegex ? expression : wildcardToRegex(expression), "i");
}

/** Every wildcard of one alternative must occur; returns the first missing one, or the hits. */
function checkExpression(
  title: string,
  expression: string,
  useRegex: boolean,
): { ok: boolean; missing?: string; hits: string[] } {
  if (expression === "") return { ok: true, hits: [] };
  if (useRegex) {
    const m = regexOf(expression, true).exec(title);
    return m ? { ok: true, hits: [m[0]] } : { ok: false, missing: expression, hits: [] };
  }
  const hits: string[] = [];
  for (const wildcard of expression.split(/\s+/).filter(Boolean)) {
    const m = regexOf(wildcard, false).exec(title);
    if (!m) return { ok: false, missing: wildcard, hits };
    if (m[0]) hits.push(m[0]);
  }
  return { ok: true, hits };
}

export function matchesEpisodeFilter(title: string, filter: string): boolean {
  if (!filter) return true;
  const m = /^(\d{1,4})x(.*;$)/i.exec(filter);
  if (!m) return false;
  const seasonOurs = Number(m[1]);
  for (let episode of m[2]!.split(";")) {
    if (!episode) continue;
    while (episode.length > 1 && episode.startsWith("0")) episode = episode.slice(1);
    if (episode.includes("-")) {
      const found =
        /\bs0?(\d{1,4})[ -_.]?e(0?\d{1,4})(?:\D|\b)/i.exec(title) ?? /\b(\d{1,4})x(0?\d{1,4})(?:\D|\b)/i.exec(title);
      if (!found) continue;
      const seasonTheirs = Number(found[1]);
      const episodeTheirs = Number(found[2]);
      if (episode.endsWith("-")) {
        const from = Number(episode.slice(0, -1));
        if ((seasonTheirs === seasonOurs && episodeTheirs >= from) || seasonTheirs > seasonOurs) return true;
      } else {
        const [first, last] = episode.split("-").map(Number) as [number, number];
        if (first > last) continue;
        if (seasonTheirs === seasonOurs && first <= episodeTheirs && last >= episodeTheirs) return true;
      }
    } else {
      const season = m[1]!;
      if (new RegExp(`\\b(?:s0?${season}[ -_.]?e0?${episode}|${season}x0?${episode})(?:\\D|\\b)`, "i").test(title)) {
        return true;
      }
    }
  }
  return false;
}

export function matchRule(title: string, rule: RuleExpression): MatchResult {
  try {
    const must = split(rule.mustContain, rule.useRegex);
    let highlights: string[] = [];
    if (must.length) {
      const results = must.map((e) => checkExpression(title, e, rule.useRegex));
      const hit = results.find((r) => r.ok);
      if (!hit) return { ok: false, reason: "missing", detail: results[0]?.missing ?? "" };
      highlights = hit.hits;
    }
    for (const e of split(rule.mustNotContain, rule.useRegex)) {
      if (e === "") return { ok: false, reason: "excluded", detail: "" };
      const r = checkExpression(title, e, rule.useRegex);
      if (r.ok) return { ok: false, reason: "excluded", detail: r.hits.join(" ") || e };
    }
    if (!matchesEpisodeFilter(title, rule.episodeFilter)) return { ok: false, reason: "episode" };
    return { ok: true, highlights };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
