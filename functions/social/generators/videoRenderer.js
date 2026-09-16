/**
 * generators/videoRenderer.js — assemble a portrait slideshow video
 * from the story-format slide PNGs.
 *
 * Output: 1080×1920 H.264 MP4, ~3s per slide, silent audio track
 * (TikTok requires an audio track even if empty), uploaded to
 * Firebase Storage.
 *
 * Used by publishers/tiktok.js when bot_config.platforms.tiktok.mode
 * is 'video'. Photo carousel remains the default; video is opt-in
 * because it adds ~30s of compute per post and pulls ffmpeg-static
 * (~50MB) as a Cloud Functions dependency.
 */

const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const admin = require('firebase-admin');

let ffmpegPath = null;
let ffmpegLoaded = false;
function getFfmpegPath() {
    if (ffmpegLoaded) return ffmpegPath;
    try {
        // ffmpeg-static returns an absolute path to the binary shipped with
        // the module, works out of the box on Cloud Functions v2 Linux.
        ffmpegPath = require('ffmpeg-static');
    } catch (err) {
        console.error('[videoRenderer] ffmpeg-static not installed:', err.message);
    }
    ffmpegLoaded = true;
    return ffmpegPath;
}

async function downloadToTemp(url, destPath) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buf);
}

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const bin = getFfmpegPath();
        if (!bin) return reject(new Error('ffmpeg-static not available'));
        const { spawn } = require('child_process');
        const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        p.stderr.on('data', (d) => { stderr += d.toString(); });
        p.on('error', reject);
        p.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-800)}`));
        });
    });
}

async function uploadVideo(localPath, storagePath) {
    const bucket = admin.storage().bucket();
    await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
            contentType: 'video/mp4',
            cacheControl: 'public, max-age=31536000',
        },
    });
    const file = bucket.file(storagePath);
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * @param {Array<{url: string, index: number}>} storySlides — PNG URLs, 1080×1920
 * @param {object} opts
 * @param {number} [opts.perSlideSeconds=3]
 * @param {string} [opts.storagePathPrefix='social/videos']
 * @returns {Promise<{url: string, durationSec: number, localPath: string}>}
 */
async function renderSlideshowVideo(storySlides, opts = {}) {
    if (!Array.isArray(storySlides) || storySlides.length === 0) {
        throw new Error('renderSlideshowVideo: no slides provided');
    }
    const per = opts.perSlideSeconds ?? 3;
    const prefix = opts.storagePathPrefix ?? 'social/videos';

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bingeki-vid-'));
    try {
        // Download every slide to tmp
        const localFiles = [];
        for (let i = 0; i < storySlides.length; i++) {
            const local = path.join(tmp, `slide-${String(i).padStart(3, '0')}.png`);
            await downloadToTemp(storySlides[i].url, local);
            localFiles.push(local);
        }

        // Write the concat manifest — each file listed with a duration line,
        // and the last file listed again with no duration so ffmpeg keeps
        // the final frame for its own `duration` line.
        const concatPath = path.join(tmp, 'concat.txt');
        const lines = [];
        for (const file of localFiles) {
            lines.push(`file '${file.replace(/'/g, "'\\''")}'`);
            lines.push(`duration ${per}`);
        }
        lines.push(`file '${localFiles[localFiles.length - 1].replace(/'/g, "'\\''")}'`);
        await fs.writeFile(concatPath, lines.join('\n'));

        const outPath = path.join(tmp, 'out.mp4');
        const totalDur = per * localFiles.length;

        await runFfmpeg([
            '-y',
            '-f', 'concat', '-safe', '0', '-i', concatPath,
            '-f', 'lavfi', '-t', String(totalDur), '-i', 'anullsrc=r=44100:cl=stereo',
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=cover,crop=1080:1920,fps=24,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-shortest',
            outPath,
        ]);

        const today = new Date().toISOString().slice(0, 10);
        const suffix = Math.random().toString(36).slice(2, 8);
        const storagePath = `${prefix}/${today}/slideshow-${suffix}.mp4`;
        const url = await uploadVideo(outPath, storagePath);

        return { url, durationSec: totalDur, localPath: outPath };
    } finally {
        // Best-effort cleanup
        fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
}

module.exports = { renderSlideshowVideo };
