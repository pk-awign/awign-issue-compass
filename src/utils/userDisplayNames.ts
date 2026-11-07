import { supabase } from '@/integrations/supabase/client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Batch-resolve user UUIDs to display names. Unknown IDs are omitted from the map.
 */
export async function fetchUserNameMap(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(isUuid))) as string[];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const chunkSize = 200;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('users').select('id, name').in('id', chunk);
    if (error) {
      console.error('Error fetching user names for display:', error);
      continue;
    }
    (data || []).forEach((row) => {
      if (row.id && row.name?.trim()) {
        map.set(row.id, row.name.trim());
      }
    });
  }

  return map;
}

export function displayUserLabel(
  value: string | null | undefined,
  nameById: Map<string, string>,
  emptyLabel = 'Unassigned'
): string {
  if (!value) return emptyLabel;
  return nameById.get(value) || value;
}
