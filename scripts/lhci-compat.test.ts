import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const lhciRequire = createRequire(require.resolve('@lhci/utils/package.json'));

describe('LHCI legacy YAML compatibility with argparse 2', () => {
    it('loads an actual LHCI YAML configuration with safeLoad', () => {
        const directory = mkdtempSync(join(tmpdir(), 'bingeki-lhci-'));
        try {
            const config = join(directory, 'lighthouserc.yml');
            writeFileSync(config, 'ci:\n  collect:\n    numberOfRuns: 3\n    url:\n      - http://localhost/fr/privacy\n');
            const { loadRcFile } = lhciRequire('./src/lighthouserc.js');
            expect(loadRcFile(config)).toEqual({
                ci: { collect: { numberOfRuns: 3, url: ['http://localhost/fr/privacy'] } },
            });
            const yamlRequire = createRequire(lhciRequire.resolve('js-yaml/package.json'));
            expect(yamlRequire('argparse/package.json').version).toMatch(/^2\./);
            const cli = yamlRequire.resolve('./bin/js-yaml.js');
            const parsed = spawnSync(process.execPath, [cli, config], { encoding: 'utf8' });
            expect(parsed.status, parsed.stderr).toBe(0);
            expect(JSON.parse(parsed.stdout).ci.collect.numberOfRuns).toBe(3);
            const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
            expect(help.status, help.stderr).toBe(0);
            expect(help.stdout).toContain('--compact');
            const invalid = spawnSync(process.execPath, [cli, '--not-an-option'], { encoding: 'utf8' });
            expect(invalid.status).not.toBe(0);
            expect(invalid.stderr).toContain('unrecognized arguments');
            expect(() => yamlRequire.resolve('sprintf-js')).toThrow();
        } finally {
            rmSync(directory, { recursive: true });
        }
    });
});
