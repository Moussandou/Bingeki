const assert = require('node:assert/strict');
const renderer = require('../functions/social/generators/renderer');

async function main() {
    const exports = require('../functions/index.js');
    assert.ok(Object.keys(exports).length >= 66, 'Functions exports regressed');
    try {
        const image = await renderer.renderHtmlToJpeg(
            '<!doctype html><html><body><h1>Offline renderer smoke</h1></body></html>',
            { width: 300, height: 200 }
        );
        assert.equal(image[0], 0xff);
        assert.equal(image[1], 0xd8);
        assert.ok(image.length > 500, 'Empty JPEG');
        console.log(`Functions loaded; offline JPEG rendered (${image.length} bytes)`);
    } finally {
        await renderer.closeBrowser();
    }
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
