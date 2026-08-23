"""Geometry helpers for SiteVerdict.

All measurements use Shapely with a local equirectangular projection
around the portfolio centroid — accurate to <1 m over a 14 km² AOI,
well below the 60 m tile size, and dependency-free (no pyproj).
"""

from __future__ import annotations

import math

from shapely.geometry import Polygon, mapping, shape
from shapely.ops import unary_union

M_PER_DEG_LAT = 111_132.0


def _to_metres(lon: float, lat: float, origin_lon: float = 0.0, origin_lat: float = 0.0) -> tuple[float, float]:
    """Convert [lon, lat] to local metres relative to an origin point."""
    cos_lat = math.cos(math.radians(origin_lat))
    x = (lon - origin_lon) * M_PER_DEG_LAT * cos_lat
    y = (lat - origin_lat) * M_PER_DEG_LAT
    return (x, y)


def _to_wgs84(x: float, y: float, origin_lon: float, origin_lat: float) -> tuple[float, float]:
    """Convert local metres back to [lon, lat] relative to an origin point."""
    cos_lat = math.cos(math.radians(origin_lat))
    lon = origin_lon + x / (M_PER_DEG_LAT * cos_lat)
    lat = origin_lat + y / M_PER_DEG_LAT
    return (lon, lat)


def measure_parcel(geometry: dict) -> tuple[float, float]:
    """Return (area_m2, perimeter_m) for a GeoJSON Polygon geometry."""
    poly = shape(geometry)
    coords = list(poly.exterior.coords)
    cx = sum(c[0] for c in coords) / len(coords)
    cy = sum(c[1] for c in coords) / len(coords)
    projected = Polygon([_to_metres(c[0], c[1], cx, cy) for c in coords])
    return (projected.area, projected.length)


def build_aoi(parcels: list[dict], buffer_m: int = 400) -> tuple[dict, float, tuple[float, float]]:
    """Build one AOI = convex hull of all parcels + buffer ring.

    Returns (aoi_geojson_geometry, aoi_km2, centroid_lon_lat).
    """
    polys = [shape(p["geometry"]) for p in parcels]
    hull = unary_union(polys).convex_hull

    hull_coords = list(hull.exterior.coords)
    cx = sum(c[0] for c in hull_coords) / len(hull_coords)
    cy = sum(c[1] for c in hull_coords) / len(hull_coords)

    # Project to local metres around centroid, buffer, project back
    hull_m = Polygon([_to_metres(c[0], c[1], cx, cy) for c in hull_coords])
    buffered_m = hull_m.buffer(buffer_m, join_style=2)

    aoi_coords = [_to_wgs84(x, y, cx, cy) for x, y in buffered_m.exterior.coords]
    aoi_poly = Polygon(aoi_coords)

    aoi_km2 = aoi_poly.area * (M_PER_DEG_LAT / 1000) ** 2 * math.cos(math.radians(cy))

    return (mapping(aoi_poly), aoi_km2, (cx, cy))


def area_weighted_mean(
    tile_values: list[tuple[Polygon, float]],
    parcel_geometry: dict,
) -> float | None:
    """Compute area-weighted mean of tile values overlapping a parcel.

    tile_values: list of (shapely Polygon for tile, value) pairs.
    parcel_geometry: GeoJSON Polygon geometry of the parcel.

    Returns None if no overlap.
    """
    parcel = shape(parcel_geometry)
    total_area = 0.0
    total_weighted = 0.0

    for tile_poly, value in tile_values:
        if not tile_poly.intersects(parcel):
            continue
        overlap = tile_poly.intersection(parcel)
        area = overlap.area
        total_area += area
        total_weighted += area * value

    if total_area == 0:
        return None
    return total_weighted / total_area


def tile_polygons_from_heatmap(map_data: dict) -> list[tuple[Polygon, dict]]:
    """Extract (shapely Polygon, properties) from a heatmap GeoJSON FeatureCollection."""
    result = []
    for feature in map_data.get("features", []):
        geom = shape(feature["geometry"])
        props = feature.get("properties", {})
        result.append((geom, props))
    return result
