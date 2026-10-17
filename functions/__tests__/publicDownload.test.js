import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createPublicDownloader, isPublicAddress } from '../social/generators/publicDownload.js';

function transport(replies, addresses = [{ address: '93.184.216.34', family: 4 }]) {
    const lookup = vi.fn((_host, _options, callback) => callback(null, addresses));
    const request = vi.fn((_url, options, callback) => {
        const req = new EventEmitter();
        req.end = () => queueMicrotask(() => {
            options.lookup('example.com', { all: true }, (error, resolved) => {
                expect(error).toBeNull();
                expect(resolved).toEqual(addresses);
            });
            const reply = replies.shift();
            const res = new PassThrough();
            res.statusCode = reply.status ?? 200;
            res.headers = reply.headers ?? {};
            callback(res);
            for (const chunk of reply.chunks ?? ['ok']) res.write(Buffer.from(chunk));
            res.end();
        });
        return req;
    });
    return { lookup, request, download: createPublicDownloader({ lookup, request }) };
}

describe('public download address policy', () => {
    it.each([
        '0.0.0.0', '10.1.2.3', '100.100.100.200', '127.0.0.1', '169.254.169.254',
        '172.31.255.255', '192.168.1.1', '192.0.0.1', '192.0.2.1', '198.18.0.1',
        '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255', '::', '::1',
        '::ffff:127.0.0.1', 'fd00::1', 'fe80::1', 'ff02::1', '64:ff9b::a00:1',
        '2001::1', '2001:db8::1', '2002:7f00:1::', '3fff::1', 'invalid',
    ])('rejects non-public address %s', (address) => {
        expect(isPublicAddress(address)).toBe(false);
    });

    it.each(['8.8.8.8', '93.184.216.34', '1.1.1.1', '2606:4700:4700::1111'])(
        'accepts global address %s', (address) => expect(isPublicAddress(address)).toBe(true),
    );

    it.each([
        'file:///etc/passwd', 'ftp://example.com/image', 'http://user:pass@example.com',
        'http://example.com:8080', 'http://127.1', 'http://2130706433',
        'http://0x7f000001', 'http://[::ffff:127.0.0.1]',
    ])('rejects unsafe URL %s without connecting', async (url) => {
        const { download, request } = transport([]);
        await expect(download(url)).rejects.toThrow();
        expect(request).not.toHaveBeenCalled();
    });
});

describe('bounded downloader', () => {
    it('pins the checked DNS addresses and preserves the response', async () => {
        const { download, lookup, request } = transport([{ chunks: ['he', 'llo'] }]);
        const result = await download('https://example.com/page');
        expect(result.buffer.toString()).toBe('hello');
        expect(result.url).toBe('https://example.com/page');
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][1].agent).toBe(false);
        expect(request.mock.calls[0][1].headers['Accept-Encoding']).toBe('identity');
    });

    it('rejects mixed public/private DNS answers before transport', async () => {
        const { download, request } = transport([], [
            { address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 },
        ]);
        await expect(download('https://example.com')).rejects.toThrow('Non-public');
        expect(request).not.toHaveBeenCalled();
    });

    it('rejects an empty DNS result before transport', async () => {
        const { download, request } = transport([], []);
        await expect(download('https://example.com')).rejects.toThrow('Non-public');
        expect(request).not.toHaveBeenCalled();
    });

    it('rejects DNS failure without transport', async () => {
        const request = vi.fn();
        const download = createPublicDownloader({
            lookup: (_host, _options, callback) => callback(new Error('DNS unavailable')),
            request,
        });
        await expect(download('https://example.com')).rejects.toThrow('DNS unavailable');
        expect(request).not.toHaveBeenCalled();
    });

    it('checks redirected addresses and does not connect to private destinations', async () => {
        const { download, request } = transport([
            { status: 302, headers: { location: 'http://169.254.169.254/metadata' } },
        ]);
        await expect(download('https://example.com')).rejects.toThrow('Non-public');
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('resolves relative redirects and revalidates DNS at every hop', async () => {
        const { download, lookup } = transport([
            { status: 301, headers: { location: '/next' } }, { chunks: ['done'] },
        ]);
        const result = await download('https://example.com/start');
        expect(result.url).toBe('https://example.com/next');
        expect(result.buffer.toString()).toBe('done');
        expect(lookup).toHaveBeenCalledTimes(2);
    });

    it('rejects DNS rebinding on a later redirect', async () => {
        const fixture = transport([{ status: 302, headers: { location: '/next' } }]);
        fixture.lookup.mockImplementationOnce((_host, _options, callback) =>
            callback(null, [{ address: '8.8.8.8', family: 4 }]));
        fixture.lookup.mockImplementationOnce((_host, _options, callback) =>
            callback(null, [{ address: '127.0.0.1', family: 4 }]));
        // The first socket still receives the original checked address, not a second DNS lookup.
        const request = vi.fn((_url, options, callback) => {
            const req = new EventEmitter();
            req.end = () => queueMicrotask(() => {
                options.lookup('example.com', {}, (error, address) => {
                    expect(error).toBeNull();
                    expect(address).toBe('8.8.8.8');
                });
                const res = new PassThrough();
                res.statusCode = 302;
                res.headers = { location: '/next' };
                callback(res);
            });
            return req;
        });
        const download = createPublicDownloader({ lookup: fixture.lookup, request });
        await expect(download('https://example.com')).rejects.toThrow('Non-public');
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('bounds redirect chains', async () => {
        const { download, request } = transport([
            { status: 302, headers: { location: '/again' } },
            { status: 302, headers: { location: '/again' } },
        ]);
        await expect(download('https://example.com', { maxRedirects: 1 }))
            .rejects.toThrow('Too many');
        expect(request).toHaveBeenCalledTimes(2);
    });

    it('rejects a redirect without a Location header', async () => {
        const { download } = transport([{ status: 302 }]);
        await expect(download('https://example.com')).rejects.toThrow('no destination');
    });

    it('accepts the exact byte limit', async () => {
        const { download } = transport([{ chunks: ['123', '45'] }]);
        expect((await download('https://example.com', { maxBytes: 5 })).buffer.length).toBe(5);
    });

    it('rejects streamed content above the limit without Content-Length', async () => {
        const { download } = transport([{ chunks: ['123', '456'] }]);
        await expect(download('https://example.com', { maxBytes: 5 }))
            .rejects.toThrow('size limit');
    });

    it('rejects an oversized declared length', async () => {
        const { download } = transport([{ headers: { 'content-length': '6' } }]);
        await expect(download('https://example.com', { maxBytes: 5 }))
            .rejects.toThrow('size limit');
    });

    it('rejects unsolicited compression', async () => {
        const { download } = transport([{ headers: { 'content-encoding': 'gzip' } }]);
        await expect(download('https://example.com')).rejects.toThrow('compressed');
    });

    it('reports HTTP failure', async () => {
        const { download } = transport([{ status: 503 }]);
        await expect(download('https://example.com')).rejects.toThrow('HTTP 503');
    });

    it('bounds DNS lookup duration', async () => {
        const request = vi.fn();
        const download = createPublicDownloader({ lookup: () => {}, request });
        await expect(download('https://example.com', { timeoutMs: 5 })).rejects.toThrow('timed out');
        expect(request).not.toHaveBeenCalled();
    });

    it('aborts a socket that never receives response headers', async () => {
        const lookup = (_host, _options, callback) =>
            callback(null, [{ address: '8.8.8.8', family: 4 }]);
        const request = vi.fn((_url, options) => {
            const req = new EventEmitter();
            options.signal.addEventListener('abort', () => req.emit('error', options.signal.reason));
            req.end = vi.fn();
            return req;
        });
        const download = createPublicDownloader({ lookup, request });
        await expect(download('https://example.com', { timeoutMs: 5 })).rejects.toThrow('timed out');
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('rejects an interrupted response instead of returning partial content', async () => {
        const lookup = (_host, _options, callback) =>
            callback(null, [{ address: '8.8.8.8', family: 4 }]);
        const request = (_url, _options, callback) => {
            const req = new EventEmitter();
            req.end = () => queueMicrotask(() => {
                const res = new PassThrough();
                res.statusCode = 200;
                res.headers = {};
                callback(res);
                res.write(Buffer.from('partial'));
                res.emit('aborted');
                res.destroy();
            });
            return req;
        };
        const download = createPublicDownloader({ lookup, request });
        await expect(download('https://example.com')).rejects.toThrow('interrupted');
    });
});
