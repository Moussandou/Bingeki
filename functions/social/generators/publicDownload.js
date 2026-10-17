const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns');
const { BlockList, isIP } = require('node:net');

const blockedIPv4 = new BlockList();
for (const [address, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
    ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
    ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 3],
]) blockedIPv4.addSubnet(address, prefix, 'ipv4');

const globalIPv6 = new BlockList();
globalIPv6.addSubnet('2000::', 3, 'ipv6');
const blockedIPv6 = new BlockList();
for (const [address, prefix] of [
    ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
]) blockedIPv6.addSubnet(address, prefix, 'ipv6');

function isPublicAddress(address) {
    const family = isIP(address);
    if (family === 4) return !blockedIPv4.check(address, 'ipv4');
    return family === 6 && globalIPv6.check(address, 'ipv6')
        && !blockedIPv6.check(address, 'ipv6');
}

function publicUrl(value) {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
        || (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) {
        throw new Error('Only public HTTP(S) URLs on standard ports are allowed');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!host || (isIP(host) && !isPublicAddress(host))) {
        throw new Error('Non-public download destination');
    }
    return url;
}

function resolveAddresses(host, lookup, signal) {
    if (isIP(host)) return Promise.resolve([{ address: host, family: isIP(host) }]);
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) {
            signal.removeEventListener('abort', abort);
            reject(signal.reason);
            return;
        }
        lookup(host, { all: true, verbatim: true }, (error, addresses) => {
            signal.removeEventListener('abort', abort);
            if (error) reject(error);
            else resolve(addresses);
        });
    });
}

function createPublicDownloader({
    lookup = dns.lookup,
    request = (url, options, callback) =>
        (url.protocol === 'https:' ? https : http).request(url, options, callback),
} = {}) {
    return async function download(value, {
        headers = {}, maxBytes = 2 * 1024 * 1024, timeoutMs = 15_000, maxRedirects = 5,
    } = {}) {
        let url = publicUrl(value);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('Download timed out')), timeoutMs);
        try {
            for (let hop = 0; hop <= maxRedirects; hop++) {
                const host = url.hostname.replace(/^\[|\]$/g, '');
                const addresses = await resolveAddresses(host, lookup, controller.signal);
                if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
                    throw new Error('Non-public download destination');
                }
                // Pin the checked resolution; the socket must not resolve the hostname again.
                const response = await new Promise((resolve, reject) => {
                    const req = request(url, {
                        method: 'GET',
                        headers: { ...headers, 'Accept-Encoding': 'identity' },
                        signal: controller.signal,
                        agent: false,
                        lookup: (_host, options, callback) => {
                            if (options.all) callback(null, addresses);
                            else callback(null, addresses[0].address, addresses[0].family);
                        },
                    }, (res) => {
                        const status = res.statusCode;
                        if ([301, 302, 303, 307, 308].includes(status)) {
                            resolve({ status, headers: res.headers });
                            res.destroy();
                            return;
                        }
                        const length = Number(res.headers['content-length']);
                        if (length > maxBytes) {
                            reject(new Error('Download exceeds size limit'));
                            res.destroy();
                            return;
                        }
                        if (res.headers['content-encoding']
                            && res.headers['content-encoding'].toLowerCase() !== 'identity') {
                            reject(new Error('Unexpected compressed download'));
                            res.destroy();
                            return;
                        }
                        const chunks = [];
                        let bytes = 0;
                        res.on('data', (chunk) => {
                            bytes += chunk.length;
                            if (bytes > maxBytes) {
                                reject(new Error('Download exceeds size limit'));
                                res.destroy();
                            } else chunks.push(chunk);
                        });
                        res.on('error', reject);
                        res.on('aborted', () => reject(new Error('Download interrupted')));
                        res.on('end', () => resolve({
                            status, headers: res.headers, buffer: Buffer.concat(chunks),
                        }));
                    });
                    req.on('error', reject);
                    req.end();
                });
                if ([301, 302, 303, 307, 308].includes(response.status)) {
                    if (hop === maxRedirects) throw new Error('Too many download redirects');
                    if (!response.headers.location) throw new Error('Redirect has no destination');
                    url = publicUrl(new URL(response.headers.location, url).href);
                    continue;
                }
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`Download failed: HTTP ${response.status}`);
                }
                return { ...response, url: url.href };
            }
        } finally {
            clearTimeout(timer);
        }
    };
}

module.exports = { isPublicAddress, createPublicDownloader, downloadPublic: createPublicDownloader() };
