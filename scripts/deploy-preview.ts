
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey) {
    console.error('❌ Missing Firebase config. Check your .env file.');
    process.exit(1);
}

// Load environment variables
dotenv.config();

const deploymentsFile = path.join(__dirname, '../src/data/deployments.json');

async function deployPreview() {
    try {
        console.log('🚀 Starting Preview Deployment...');



        // Generate a channel ID
        const hash = Math.random().toString(36).substring(7);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const channelId = `preview-${timestamp}-${hash}`;

        console.log(`📡 Deploying to channel: ${channelId}`);

        // Build the project first
        console.log('🛠 Building project...');
        execSync('npm run build', { stdio: 'inherit' });

        // Deploy to channel
        console.log('📤 Uploading to Firebase Hosting...');
        // We use --json to parse the result, but also pipe stderr to see progress if possible.
        // Actually execSync returns the buffer.
        const output = execSync(`npx firebase hosting:channel:deploy ${channelId} --expires 7d --json`, { encoding: 'utf-8' });

        const result = JSON.parse(output);
        const deployKeys = Object.keys(result.result || {});
        if (deployKeys.length === 0) {
            console.error('❌ Unexpected JSON structure. keys:', deployKeys);
            throw new Error('Could not find channel info in output');
        }

        const deployInfo = result.result[deployKeys[0]];
        const previewUrl = deployInfo.url;
        const expireTime = deployInfo.expireTime;

        console.log(`✅ Deployed successfully!`);
        console.log(`🔗 Preview URL: ${previewUrl}`);
        console.log(`⏳ Expires: ${expireTime}`);

        // Save to local JSON file
        console.log('💾 Saving deployment record to src/data/deployments.json...');

        let deployments = [];
        if (fs.existsSync(deploymentsFile)) {
            try {
                const fileContent = fs.readFileSync(deploymentsFile, 'utf-8');
                deployments = JSON.parse(fileContent);
            } catch (e) {
                console.warn('⚠️ Could not read existing deployments file, starting fresh.');
            }
        }

        const newDeployment = {
            id: channelId,
            channelId,
            url: previewUrl,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(expireTime).toISOString(),
            type: 'preview',
            status: 'active'
        };

        // Prepend new deployment
        deployments.unshift(newDeployment);

        // Keep only last 20
        if (deployments.length > 20) {
            deployments = deployments.slice(0, 20);
        }

        fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 4));
        console.log('📝 Deployment recorded locally.');
        process.exit(0);

    } catch (error: any) {
        console.error('❌ Deployment failed:', error.message);
        if (error.stdout) console.error(error.stdout.toString());
        if (error.stderr) console.error(error.stderr.toString());
        process.exit(1);
    }
}

deployPreview();
