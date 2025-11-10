// utils/distanceCalculation.js

// Calculate distance in meters between two coordinates
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // radius of Earth in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // distance in meters
  return distance;
};

// Convert meters to kilometers
export const metersToKilometers = (meters) => meters / 1000;
