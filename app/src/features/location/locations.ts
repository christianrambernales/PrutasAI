import type { SavedLocation } from '../../state/appState';

/**
 * Bundled place list — the offline path for choosing a location, and the
 * fallback when location permission is refused (design spec §11).
 *
 * Coordinates are rounded to two decimals (~1.1 km) on purpose: the app never
 * stores a precise fix, and climate normals are area averages anyway.
 */
export interface PlaceOption extends SavedLocation {
  region: string;
}

export const PLACES: PlaceOption[] = [
  { label: 'Los Baños, Laguna', region: 'CALABARZON', latitude: 14.17, longitude: 121.24 },
  { label: 'Lipa, Batangas', region: 'CALABARZON', latitude: 13.94, longitude: 121.16 },
  { label: 'Lucena, Quezon', region: 'CALABARZON', latitude: 13.93, longitude: 121.62 },
  { label: 'Cabanatuan, Nueva Ecija', region: 'Central Luzon', latitude: 15.49, longitude: 120.97 },
  { label: 'San Fernando, Pampanga', region: 'Central Luzon', latitude: 15.03, longitude: 120.69 },
  { label: 'Baguio, Benguet', region: 'Cordillera', latitude: 16.41, longitude: 120.6 },
  { label: 'Laoag, Ilocos Norte', region: 'Ilocos', latitude: 18.2, longitude: 120.59 },
  { label: 'Legazpi, Albay', region: 'Bicol', latitude: 13.14, longitude: 123.74 },
  { label: 'Iloilo City, Iloilo', region: 'Western Visayas', latitude: 10.72, longitude: 122.56 },
  { label: 'Bacolod, Negros Occidental', region: 'Western Visayas', latitude: 10.68, longitude: 122.95 },
  { label: 'Cebu City, Cebu', region: 'Central Visayas', latitude: 10.32, longitude: 123.89 },
  { label: 'Tacloban, Leyte', region: 'Eastern Visayas', latitude: 11.24, longitude: 125.0 },
  { label: 'Cagayan de Oro, Misamis Oriental', region: 'Northern Mindanao', latitude: 8.48, longitude: 124.65 },
  { label: 'Davao City, Davao del Sur', region: 'Davao', latitude: 7.07, longitude: 125.61 },
  { label: 'General Santos, South Cotabato', region: 'SOCCSKSARGEN', latitude: 6.11, longitude: 125.17 },
  { label: 'Zamboanga City, Zamboanga del Sur', region: 'Zamboanga Peninsula', latitude: 6.92, longitude: 122.08 },
];

export function searchPlaces(query: string): PlaceOption[] {
  const q = query.trim().toLowerCase();
  if (q === '') return PLACES;
  return PLACES.filter(p => `${p.label} ${p.region}`.toLowerCase().includes(q));
}
