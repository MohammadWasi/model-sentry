/** Returns true when an address is a local, private, or otherwise non-public IP literal. */
export declare function isNonPublicAddress(address: string): boolean;
/**
 * Reject source URLs that are visibly unsafe before they can be fetched.
 * DNS resolution is deliberately left to the runtime; this guard protects
 * configuration loading and is repeated after redirects in the fetcher.
 */
export declare function assertSafeSourceUrl(value: string): URL;
