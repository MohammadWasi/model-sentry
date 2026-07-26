import { isIP } from 'node:net';
function isPrivateIpv4(address) {
    const octets = address.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255))
        return false;
    const [first, second] = octets;
    return first === 0
        || first === 10
        || first === 127
        || (first === 100 && second >= 64 && second <= 127)
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && (second === 0 || second === 168))
        || (first === 198 && (second === 18 || second === 19))
        || first >= 224;
}
function isPrivateIpv6(address) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1')
        return true;
    const firstHextet = Number.parseInt(normalized.split(':')[0] || '0', 16);
    if ((firstHextet & 0xfe00) === 0xfc00)
        return true; // Unique local: fc00::/7
    if ((firstHextet & 0xffc0) === 0xfe80)
        return true; // Link local: fe80::/10
    if ((firstHextet & 0xff00) === 0xff00)
        return true; // Multicast: ff00::/8
    const mapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (!mapped)
        return false;
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return isPrivateIpv4([high >> 8, high & 0xff, low >> 8, low & 0xff].join('.'));
}
/** Returns true when an address is a local, private, or otherwise non-public IP literal. */
export function isNonPublicAddress(address) {
    const normalized = address.replace(/^\[|\]$/g, '');
    if (isIP(normalized) === 4)
        return isPrivateIpv4(normalized);
    if (isIP(normalized) === 6)
        return isPrivateIpv6(normalized);
    return false;
}
/**
 * Reject source URLs that are visibly unsafe before they can be fetched.
 * DNS resolution is deliberately left to the runtime; this guard protects
 * configuration loading and is repeated after redirects in the fetcher.
 */
export function assertSafeSourceUrl(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error('Source URL must be an HTTP(S) URL.');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
        throw new Error('Only HTTP(S) source URLs are supported.');
    if (url.username || url.password)
        throw new Error('Source URLs must not contain credentials.');
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || isNonPublicAddress(hostname)) {
        throw new Error('Private or local source URLs are blocked by default.');
    }
    return url;
}
//# sourceMappingURL=source-url.js.map