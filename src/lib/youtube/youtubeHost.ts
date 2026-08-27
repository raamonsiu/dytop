/** True for `base` itself or any of its subdomains, never a lookalike like `evil-youtube.com`. */
export function isHostOrSubdomain(hostname: string, base: string): boolean {
  return hostname === base || hostname.endsWith(`.${base}`);
}
