import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv as loadViteEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'public', 'firebase-messaging-sw.template.js');
const outputPath = path.join(rootDir, 'public', 'firebase-messaging-sw.js');

console.log('🔄 Generating public/firebase-messaging-sw.js from template...');

const modeIndex = process.argv.indexOf('--mode');
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : 'production';
if (!mode) throw new Error('--mode requires a value');
const dotEnvVars = loadViteEnv(mode, rootDir, 'VITE_');
const allEnv = { ...dotEnvVars, ...process.env }; // Merge

// 2. Read template
if (!fs.existsSync(templatePath)) {
    console.error(`❌ Error: Template not found at ${templatePath}`);
    process.exit(1);
}
let template = fs.readFileSync(templatePath, 'utf-8');

// 3. Replace placeholders
const keysToReplace = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID'
];

const missingKeys: string[] = [];

keysToReplace.forEach(key => {
    const value = allEnv[key];
    if (!value && key !== 'VITE_FIREBASE_MEASUREMENT_ID') {
        missingKeys.push(key);
    }
    // Replace {{KEY}} with value
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, value || '');
});

if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
}

// 4. Write output
fs.writeFileSync(outputPath, template);
console.log('✅ public/firebase-messaging-sw.js generated successfully!');
