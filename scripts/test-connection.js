import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const { data } = await octokit.repos.get({
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
});
console.log("Connected to:", data.full_name);