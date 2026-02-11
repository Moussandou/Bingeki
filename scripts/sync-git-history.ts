
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const deploymentsFile = path.join(__dirname, '../src/data/deployments.json');

// Get git log: hash, date, message
// format: %H|%aI|%s
// %H: commit hash
// %aI: author date (ISO 8601)
// %s: subject
const gitLog = execSync('git log --pretty=format:"%H|%aI|%s" -n 50').toString().trim();

let deployments = [];
if (fs.existsSync(deploymentsFile)) {
    try {
        deployments = JSON.parse(fs.readFileSync(deploymentsFile, 'utf-8'));
    } catch (e) {
        console.error('Error reading deployments file');
    }
}

const lines = gitLog.split('\n');
let addedCount = 0;

lines.forEach(line => {
    const [hash, date, message] = line.split('|');

    // Check if this commit is already linked to a deployment (rough check by ID or if we want to treat commits as separate entries)
    // For now, we'll treat them as "Historical" entries if they don't exist.

    // We use the hash as the ID for git commits
    const existing = deployments.find((d: any) => d.id === hash || d.channelId === hash);

    if (!existing) {
        deployments.push({
            id: hash,
            channelId: hash.substring(0, 7), // Short hash as "channel"
            url: '', // No preview URL for old commits
            createdAt: date,
            expiresAt: '', // Doesn't expire
            type: 'commit',
            status: 'archived',
            message: message // Save commit message
        });
        addedCount++;
    }
});

// Sort by date new to old
deployments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 4));

console.log(`✅ Synced ${addedCount} commits from git history to deployments.json`);
