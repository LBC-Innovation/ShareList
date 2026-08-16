import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function addToProject(issueNodeId) {
  const query = `
    mutation AddToProject($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `;
  await octokit.graphql(query, {
    projectId: process.env.GITHUB_PROJECT_ID,
    contentId: issueNodeId,
  });
}

export async function createStory({ title, body, labels = ["story"] }) {
  const issue = await octokit.issues.create({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    title,
    body,
    labels,
  });

  await addToProject(issue.data.node_id);

  console.log(`Created: ${issue.data.html_url}`);
  return issue.data;
}