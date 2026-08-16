/**
 * board-check.js
 * Queries the GitHub Project board for issues currently in "In Progress"
 * and outputs JSON for the Claude Code SessionStart hook.
 *
 * Expected env vars (loaded from .env):
 *   GITHUB_TOKEN, GITHUB_PROJECT_ID, GITHUB_OWNER, GITHUB_REPO
 */

import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const { GITHUB_TOKEN, GITHUB_PROJECT_ID, GITHUB_OWNER, GITHUB_REPO } =
  process.env;

if (!GITHUB_TOKEN || !GITHUB_PROJECT_ID) {
  output(
    "⚠️  board-check: GITHUB_TOKEN or GITHUB_PROJECT_ID not set in .env — skipping board check."
  );
  process.exit(0);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const QUERY = `
  query GetProjectItems($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 50) {
          nodes {
            id
            content {
              ... on Issue {
                number
                title
                url
                body
              }
            }
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function getStatus(item) {
  const statusField = item.fieldValues?.nodes?.find(
    (fv) => fv?.field?.name === "Status"
  );
  return statusField?.name ?? null;
}

function formatIssue(item) {
  const { number, title, url } = item.content;
  return `  • #${number}: ${title}\n    ${url}`;
}

function output(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    })
  );
}

async function main() {
  let data;
  try {
    data = await octokit.graphql(QUERY, { projectId: GITHUB_PROJECT_ID });
  } catch (err) {
    output(
      `⚠️  board-check: GitHub API error — ${err.message}. Skipping board check.`
    );
    return;
  }

  const items = data?.node?.items?.nodes ?? [];
  const inProgress = items.filter(
    (item) => item?.content && getStatus(item) === "In Progress"
  );

  const repo =
    GITHUB_OWNER && GITHUB_REPO ? `${GITHUB_OWNER}/${GITHUB_REPO}` : "the repo";

  if (inProgress.length === 0) {
    output(
      `## GitHub Board — Session Start\n\n` +
        `No issues are currently **In Progress** in ${repo}.\n\n` +
        `Per the workflow rules in CLAUDE.md: do not pull work from the Backlog. ` +
        `Wait for the developer to move an issue to In Progress before beginning any work.`
    );
    return;
  }

  const list = inProgress.map(formatIssue).join("\n");
  output(
    `## GitHub Board — Session Start\n\n` +
      `The following issue${inProgress.length > 1 ? "s are" : " is"} currently **In Progress** in ${repo}:\n\n` +
      `${list}\n\n` +
      `Ask the developer which issue to work on first before doing anything else.`
  );
}

main();
