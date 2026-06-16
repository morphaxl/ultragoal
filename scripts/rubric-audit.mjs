#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node scripts/rubric-audit.mjs <goal-or-rubric.md> [--json]";

const VAGUE_TERMS = [
  "clean",
  "elegant",
  "fast",
  "intuitive",
  "maintainable",
  "nice",
  "optimized",
  "polished",
  "production-ready",
  "robust",
  "scalable",
  "seamless",
  "smooth",
  "user-friendly",
];

const BEHAVIOR_TERMS = [
  "appears",
  "click",
  "display",
  "displays",
  "render",
  "renders",
  "screen",
  "shows",
  "tap",
  "ui",
  "visible",
];

const RUNTIME_OBSERVATION_TERMS = [
  "boundingbox",
  "browser",
  "canvas",
  "computer use",
  "device",
  "non-zero",
  "onlayout",
  "page.",
  "playwright",
  "pixel",
  "screenshot",
  "simulator",
  "toBeVisible".toLowerCase(),
  "webdriver",
];

const REACHABILITY_TERMS = [
  "destination",
  "entry point",
  "header",
  "menu",
  "nav",
  "navigation",
  "page",
  "route",
  "screen",
  "tab",
];

const REACHABILITY_CHECK_TERMS = [
  "click",
  "entry point",
  "href",
  "lands on",
  "link",
  "menu",
  "nav",
  "reachable",
  "tab",
  "tap",
];

const EXTERNAL_TERMS = [
  "api",
  "auth",
  "database",
  "db",
  "endpoint",
  "gateway",
  "oauth",
  "prisma",
  "r2",
  "s3",
  "stripe",
  "third-party",
  "token",
  "webhook",
];

const LIVE_TERMS = [
  "2xx",
  "200",
  "authenticated",
  "curl",
  "live",
  "persisted",
  "real",
  "request",
  "smoke",
  "staging",
];

const FAILURE_TERMS = [
  "401",
  "403",
  "4xx",
  "500",
  "5xx",
  "degrade",
  "error",
  "failure",
  "fallback",
  "timeout",
];

const STATIC_ONLY_TERMS = [
  "build",
  "eslint",
  "grep",
  "lint",
  "test",
  "tsc",
  "typecheck",
  "vitest",
  "jest",
];

export function main(argv) {
  const json = argv.includes("--json");
  const files = argv.filter((arg) => arg !== "--json" && !arg.startsWith("-"));
  if (files.length !== 1) {
    printUsage(json);
    process.exitCode = 2;
    return;
  }

  let text;
  try {
    text = readFileSync(files[0], "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ file: files[0], status: "FAIL", issues: [{ severity: "BLOCKER", message }] }, json);
    process.exitCode = 1;
    return;
  }

  const result = auditRubric(text, files[0]);
  emit(result, json);
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

export function auditRubric(text, file = "<input>") {
  const issues = [];
  const rubric = section(text, "Rubric");
  const stops = section(text, "Stop conditions");
  const constraints = section(text, "Constraints");
  const items = parseRubricItems(rubric);

  if (!rubric.trim()) {
    issues.push(blocker("No # Rubric section found."));
  }
  if (items.length === 0) {
    issues.push(blocker("No checkbox rubric items found."));
  }
  if (!stops.trim()) {
    issues.push(blocker("No # Stop conditions section found."));
  }

  let hasVerifier = false;
  let hasExternalSeam = false;
  let hasFailureCascade = false;
  let hasUiBehavior = false;
  let hasRuntimeUiObservation = false;
  let hasReachabilityClaim = false;
  let hasReachabilityCheck = false;

  for (const item of items) {
    const lower = item.text.toLowerCase();
    const claim = item.firstLine.replace(/\s+--?\s*check:.*/i, "").replace(/\s+—\s*check:.*/i, "");
    const claimLower = claim.toLowerCase();
    const isVerifier = /\bverifier\b/i.test(item.text);
    hasVerifier ||= isVerifier;

    const checkCommand = extractCheckCommand(item.text);
    if (!isVerifier && !/\bcheck\s*:/i.test(item.text)) {
      issues.push(blocker(`Rubric item ${item.number} has no "check:" command: ${shorten(claim)}`));
    }
    if (!isVerifier && /\bcheck\s*:/i.test(item.text) && checkCommand === null && !hasStructuredObservationCheck(item.text)) {
      issues.push(blocker(`Rubric item ${item.number} has "check:" but no exact backticked command or structured manual/agent-run protocol: ${shorten(claim)}`));
    }
    if (checkCommand !== null && /<[^>]+>|\.\.\.|TODO|TBD/i.test(checkCommand)) {
      issues.push(blocker(`Rubric item ${item.number} uses a placeholder check command: \`${checkCommand}\``));
    }
    if (checkCommand !== null && !looksLikeCommand(checkCommand)) {
      issues.push(blocker(`Rubric item ${item.number} has backticks after "check:" but they do not look like an executable command: \`${checkCommand}\``));
    }

    const vagueHits = termsIn(claimLower, VAGUE_TERMS);
    if (vagueHits.length > 0 && !hasNumber(claimLower)) {
      issues.push(warn(`Rubric item ${item.number} uses vague language without a threshold (${vagueHits.join(", ")}): ${shorten(claim)}`));
    }

    if (/\b(and|or)\b/i.test(claim) && claim.length > 90) {
      issues.push(warn(`Rubric item ${item.number} may be compound; split if one half can pass while the other fails: ${shorten(claim)}`));
    }

    const behaviorClaim = termsIn(claimLower, BEHAVIOR_TERMS).length > 0;
    const runtimeObservation = termsIn(lower, RUNTIME_OBSERVATION_TERMS).length > 0;
    const staticOnly = termsIn(lower, STATIC_ONLY_TERMS).length > 0;
    hasUiBehavior ||= behaviorClaim;
    hasRuntimeUiObservation ||= behaviorClaim && runtimeObservation;
    if (behaviorClaim && staticOnly && !runtimeObservation) {
      issues.push(blocker(`Rubric item ${item.number} makes a UI/runtime claim but only cites static checks: ${shorten(claim)}`));
    }

    const reachabilityClaim = termsIn(claimLower, REACHABILITY_TERMS).length > 0;
    const reachabilityCheck = termsIn(lower, REACHABILITY_CHECK_TERMS).length > 0;
    hasReachabilityClaim ||= reachabilityClaim;
    hasReachabilityCheck ||= reachabilityClaim && reachabilityCheck;
    if (reachabilityClaim && !reachabilityCheck && /new|move|moved|added|route|screen|page|tab|menu|nav/i.test(claim)) {
      issues.push(warn(`Rubric item ${item.number} mentions placement/reachability but does not say how the user reaches it: ${shorten(claim)}`));
    }

    const externalClaim = termsIn(claimLower, EXTERNAL_TERMS).length > 0;
    const liveCheck = termsIn(lower, LIVE_TERMS).length > 0;
    hasExternalSeam ||= externalClaim;
    hasFailureCascade ||= termsIn(lower, FAILURE_TERMS).length > 0;
    if (externalClaim && /\b(mock|mocked|unit)\b/i.test(lower) && !liveCheck) {
      issues.push(blocker(`Rubric item ${item.number} crosses an external boundary but appears mock-only: ${shorten(claim)}`));
    }
    if (externalClaim && !liveCheck && /new|added|changed|external|endpoint|api|auth|database|gateway|webhook/i.test(claimLower)) {
      issues.push(warn(`Rubric item ${item.number} crosses an external boundary but does not require a live/staging smoke: ${shorten(claim)}`));
    }

    if (/\b(won't run until|cannot run until|mocked for now|manual later|device round will confirm)\b/i.test(lower)) {
      issues.push(blocker(`Rubric item ${item.number} contains a runtime gap; make it an unchecked blocking item, not a footnote: ${shorten(claim)}`));
    }
  }

  if (!hasVerifier) {
    issues.push(blocker('Rubric is missing the final "VERIFIER: independent sign-off" item.'));
  }
  if (hasUiBehavior && !hasRuntimeUiObservation) {
    issues.push(warn("The rubric has UI/runtime claims but no item requiring a browser, simulator, screenshot, pixel, or rendered-size observation."));
  }
  if (hasReachabilityClaim && !hasReachabilityCheck) {
    issues.push(warn("The rubric mentions routes/screens/navigation but does not clearly verify the user-visible entry point."));
  }
  if (hasExternalSeam && !hasFailureCascade) {
    issues.push(warn("The rubric touches an external/API/auth/data seam but has no failure-cascade item for 4xx/5xx/timeouts/degraded behavior."));
  }
  if (!constraints.trim()) {
    issues.push(warn("No # Constraints section found or it is empty; state what must not change when scope matters."));
  }

  const status = issues.some((issue) => issue.severity === "BLOCKER") ? "FAIL" : "PASS";
  return { file, status, issues };
}

function printUsage(json) {
  if (json) {
    emit({ file: null, status: "FAIL", issues: [blocker(USAGE)] }, true);
  } else {
    console.error(USAGE);
  }
}

function emit(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const name = result.file === null ? "<input>" : basename(result.file);
  console.log(`Rubric audit: ${result.status} (${name})`);
  if (result.issues.length === 0) {
    console.log("No issues found.");
    return;
  }
  for (const issue of result.issues) {
    console.log(`${issue.severity}: ${issue.message}`);
  }
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const startPattern = new RegExp(`^(#{1,6})\\s+${escapeRegExp(heading)}\\s*$`, "i");
  let start = -1;
  let level = 1;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].trim().match(startPattern);
    if (match) {
      start = index + 1;
      level = match[1].length;
      break;
    }
  }
  if (start === -1) return "";
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^(#{1,6})\s+/);
    if (headingMatch && headingMatch[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function parseRubricItems(rubricText) {
  const lines = rubricText.split(/\r?\n/);
  const items = [];
  let current = null;
  for (const line of lines) {
    if (/^\s*-\s*\[[ xX]\]\s+/.test(line)) {
      if (current !== null) items.push(finishItem(current, items.length + 1));
      current = { lines: [line], firstLine: line.trim() };
      continue;
    }
    if (current !== null) current.lines.push(line);
  }
  if (current !== null) items.push(finishItem(current, items.length + 1));
  return items;
}

function finishItem(item, number) {
  return {
    number,
    firstLine: item.firstLine,
    text: item.lines.join("\n").replace(/\s+/g, " ").trim(),
  };
}

function extractCheckCommand(text) {
  const checkIndex = text.toLowerCase().indexOf("check:");
  if (checkIndex === -1) return null;
  const afterCheck = text.slice(checkIndex);
  const match = afterCheck.match(/`([^`]+)`/);
  return match ? match[1].trim() : null;
}

function hasStructuredObservationCheck(text) {
  const match = text.match(/\bcheck\s*:\s*([^`]+)/i);
  if (!match) return false;
  const checkText = match[1].trim().toLowerCase();
  return /^(agent-run|browser|manual|manual device step|playwright|simulator|user-run)\b/.test(checkText);
}

function looksLikeCommand(command) {
  const first = command.trim().split(/\s+/)[0];
  return /^(?:\.{0,2}\/|adb|bash|bun|bundle|cargo|claude|curl|deno|docker|docker-compose|eas|eslint|expo|fastlane|git|go|gradle|grep|jest|make|node|npm|npx|pnpm|pytest|python|python3|rg|rspec|ruby|sh|swift|test|tsc|tsx|vitest|xcodebuild|xcrun|yarn)$/i.test(first);
}

function termsIn(text, terms) {
  return terms.filter((term) => {
    const escaped = escapeRegExp(term.toLowerCase());
    if (/^[a-z0-9-]+$/i.test(term)) return new RegExp(`\\b${escaped}\\b`, "i").test(text);
    return text.includes(term.toLowerCase());
  });
}

function hasNumber(text) {
  return /\d/.test(text);
}

function blocker(message) {
  return { severity: "BLOCKER", message };
}

function warn(message) {
  return { severity: "WARN", message };
}

function shorten(value) {
  return value.length <= 140 ? value : `${value.slice(0, 137)}...`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
