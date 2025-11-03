export const ranchCenter = { lat: 27.520797, lon: -82.080431 };

export const ranchBounds = {
  minLon: ranchCenter.lon - 0.006,
  maxLon: ranchCenter.lon + 0.006,
  minLat: ranchCenter.lat - 0.0045,
  maxLat: ranchCenter.lat + 0.0045,
};

export const defaultRanchAddress = "7715 231st St E, Myakka City, FL";

export const defaultRanchBoundary = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "3 Strands Cattle Co.",
        description: "Saved ranch parcel boundary",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [ranchBounds.minLon + 0.0003, ranchBounds.maxLat - 0.0004],
            [ranchBounds.maxLon - 0.0006, ranchBounds.maxLat - 0.0006],
            [ranchBounds.maxLon - 0.0004, ranchBounds.minLat + 0.0008],
            [ranchBounds.minLon + 0.0005, ranchBounds.minLat + 0.0004],
            [ranchBounds.minLon + 0.0003, ranchBounds.maxLat - 0.0004],
          ],
        ],
      },
    },
  ],
};

export const paddocks = [
  {
    name: "North Paddock",
    coords: [
      [ranchBounds.minLon, ranchBounds.maxLat - 0.0015],
      [ranchBounds.minLon + 0.004, ranchBounds.maxLat - 0.0015],
      [ranchBounds.minLon + 0.004, ranchBounds.maxLat - 0.0035],
      [ranchBounds.minLon, ranchBounds.maxLat - 0.0035],
      [ranchBounds.minLon, ranchBounds.maxLat - 0.0015],
    ],
  },
  {
    name: "Central",
    coords: [
      [ranchBounds.minLon + 0.0042, ranchBounds.maxLat - 0.0017],
      [ranchBounds.maxLon - 0.001, ranchBounds.maxLat - 0.0017],
      [ranchBounds.maxLon - 0.001, ranchBounds.maxLat - 0.0037],
      [ranchBounds.minLon + 0.0042, ranchBounds.maxLat - 0.0037],
      [ranchBounds.minLon + 0.0042, ranchBounds.maxLat - 0.0017],
    ],
  },
  {
    name: "South Paddock",
    coords: [
      [ranchBounds.minLon, ranchBounds.minLat + 0.002],
      [ranchBounds.maxLon - 0.002, ranchBounds.minLat + 0.002],
      [ranchBounds.maxLon - 0.002, ranchBounds.minLat],
      [ranchBounds.minLon, ranchBounds.minLat],
      [ranchBounds.minLon, ranchBounds.minLat + 0.002],
    ],
  },
];
