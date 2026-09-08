'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

export interface MapPoint {
  id: string
  name: string
  lat: number | null
  lng: number | null
  websiteHealth: string
}

const HEALTH_COLORS: Record<string, string> = {
  no_website: '#64748b',
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#10b981',
  unknown: '#94a3b8',
}

export function SweepMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const valid = points.filter((p) => p.lat != null && p.lng != null)
    const center: [number, number] = valid.length
      ? [valid[0].lng!, valid[0].lat!]
      : [29.0, 41.0]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap katkıda bulunanlar',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center,
      zoom: 11,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: valid.map((p) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng!, p.lat!] },
          properties: {
            name: p.name,
            color: HEALTH_COLORS[p.websiteHealth] ?? HEALTH_COLORS.unknown,
          },
        })),
      }

      map.addSource('leads', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'leads',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#6366f1',
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 30],
          'circle-opacity': 0.85,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'leads',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'leads',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.on('click', 'points', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const coords = (feature.geometry as any).coordinates.slice()
        new maplibregl.Popup()
          .setLngLat(coords)
          .setHTML(`<strong>${feature.properties?.name ?? ''}</strong>`)
          .addTo(map)
      })
      map.on('click', 'clusters', async (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const clusterId = feature.properties?.cluster_id
        const source = map.getSource('leads') as maplibregl.GeoJSONSource
        const zoom = await source.getClusterExpansionZoom(clusterId)
        map.easeTo({ center: (feature.geometry as any).coordinates, zoom })
      })
      map.on('mouseenter', 'points', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'points', () => (map.getCanvas().style.cursor = ''))

      if (valid.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        for (const p of valid) bounds.extend([p.lng!, p.lat!])
        map.fitBounds(bounds, { padding: 48, maxZoom: 14 })
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => p.id))])

  return <div ref={containerRef} className="h-96 w-full rounded-md border" />
}
