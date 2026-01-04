export function normalizeBasePath(input: string | undefined): string {
    const raw = (input ?? '').trim();
    if (!raw || raw === '/') return '';

    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
    const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
    return withoutTrailingSlash === '/' ? '' : withoutTrailingSlash;
}

export function joinWithBasePath(basePath: string, path: string): string {
    const normalizedBase = normalizeBasePath(basePath);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

