// WGS84 → UTM projection, as the source notebook does before its kernels (02-space-use-analysis.Rmd: EPSG:4326 →
// EPSG:32636, UTM zone 36N, so bandwidths are in metres). Transverse Mercator by the Krüger n-series to 6th order
// (Karney 2011), accurate to well under a millimetre inside a zone. Pure; no location ever leaves the caller.

const A_WGS84 = 6378137, F_WGS84 = 1 / 298.257223563, K0 = 0.9996, FALSE_EASTING = 500000;
const N = F_WGS84 / (2 - F_WGS84), N2 = N * N, N3 = N2 * N, N4 = N3 * N, N5 = N4 * N, N6 = N5 * N;
const E = Math.sqrt(F_WGS84 * (2 - F_WGS84));
const A_RECT = A_WGS84 / (1 + N) * (1 + N2 / 4 + N4 / 64 + N6 / 256);
const ALPHA = [
  N / 2 - 2 / 3 * N2 + 5 / 16 * N3 + 41 / 180 * N4 - 127 / 288 * N5 + 7891 / 37800 * N6,
  13 / 48 * N2 - 3 / 5 * N3 + 557 / 1440 * N4 + 281 / 630 * N5 - 1983433 / 1935360 * N6,
  61 / 240 * N3 - 103 / 140 * N4 + 15061 / 26880 * N5 + 167603 / 181440 * N6,
  49561 / 161280 * N4 - 179 / 168 * N5 + 6601661 / 7257600 * N6,
  34729 / 80640 * N5 - 3418889 / 1995840 * N6,
  212378941 / 319334400 * N6,
];

/** Central meridian (degrees) of a UTM zone. */
export const utmCentralMeridian = (zone: number) => -183 + 6 * zone;

/** Forward UTM (northern-hemisphere convention: northing 0 at the equator, as EPSG:32636). Returns [easting, northing] in metres. */
export function utm(latDeg: number, lonDeg: number, zone = 36): [number, number] {
  const phi = latDeg * Math.PI / 180, lam = (lonDeg - utmCentralMeridian(zone)) * Math.PI / 180;
  const s = Math.sin(phi);
  const t = Math.sinh(Math.atanh(s) - E * Math.atanh(E * s));
  const xiP = Math.atan2(t, Math.cos(lam)), etaP = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  let xi = xiP, eta = etaP;
  for (let j = 1; j <= 6; j++) {
    xi += ALPHA[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += ALPHA[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }
  return [FALSE_EASTING + K0 * A_RECT * eta, K0 * A_RECT * xi];
}
