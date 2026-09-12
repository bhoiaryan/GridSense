export const SITE_ALIASES: Record<string, string> = {
  "solar-01": "SITE_001",
  "SITE_001": "SITE_001",
  "SITE_002": "SITE_002",
  "SITE_003": "SITE_003",
};

export function resolveSiteId(id: string): string
{
  if (!id) return "SITE_001";
  return SITE_ALIASES[id] || id;
}

