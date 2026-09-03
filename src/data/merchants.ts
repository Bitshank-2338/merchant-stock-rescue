import type { Merchant } from "../types";

export const merchants: Merchant[] = [
  { id: "m-ace", name: "Ace Hardware Koramangala", area: "Koramangala", distanceKm: 2.4, pickupMinutes: 20, reliability: 96 },
  { id: "m-bosch", name: "Bosch Tools Indiranagar", area: "Indiranagar", distanceKm: 4.1, pickupMinutes: 35, reliability: 99 },
  { id: "m-build", name: "BuildRight HSR", area: "HSR Layout", distanceKm: 5.8, pickupMinutes: 45, reliability: 92 },
  { id: "m-city", name: "CityFix Whitefield", area: "Whitefield", distanceKm: 11.2, pickupMinutes: 70, reliability: 88 },
  { id: "m-diy", name: "DIY Depot Jayanagar", area: "Jayanagar", distanceKm: 7.3, pickupMinutes: 55, reliability: 94 },
  { id: "m-euro", name: "EuroTrade MG Road", area: "MG Road", distanceKm: 6.6, pickupMinutes: 40, reliability: 91 },
  { id: "m-fix", name: "FixIt Malleshwaram", area: "Malleshwaram", distanceKm: 9.4, pickupMinutes: 65, reliability: 90 },
  { id: "m-green", name: "GreenBuild Hebbal", area: "Hebbal", distanceKm: 12.5, pickupMinutes: 80, reliability: 86 },
];
