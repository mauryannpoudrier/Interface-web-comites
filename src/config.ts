const getEnv = (name: string): string => (import.meta.env[name] ?? '').toString().trim();

export const googleMapsApiKey = getEnv('VITE_GOOGLE_MAPS_API_KEY');

export const googleMapsLibraries = ['places'] as const;

export const isGoogleMapsConfigured = googleMapsApiKey.length > 0;
