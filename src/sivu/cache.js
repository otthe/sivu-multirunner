export function pruneCache(map, maxEntries = 500) {
  if (map.size <= maxEntries) return;
  map.clear(); //replace with LRU later if needed
}