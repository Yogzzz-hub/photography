import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useVaultStore } from '../../stores/useVaultStore';
import type { Photo } from '../../types';
import {
  MapPin,
  Navigation,
  Calendar,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
} from 'lucide-react';

interface MemoryMapProps {
  onOpenPhotoDetail: (photoId: string) => void;
  onSelectLocation?: (coords: { latitude: number; longitude: number; label: string }) => void;
  isPickingLocation?: boolean;
}

// Fastly Edge-cached CartoDB styles for ultra-fast, sub-50ms raster tile loading
const CARTO_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const CARTO_VOYAGER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// Strict Tamil Nadu & Chennai Coordinates
const CHENNAI_CENTER: [number, number] = [80.2707, 13.0827]; // Longitude, Latitude
const TAMIL_NADU_BOUNDS: [[number, number], [number, number]] = [
  [74.0, 7.5], // Southwest (Kanyakumari / South Kerala)
  [83.5, 15.5], // Northeast (North Chennai / Andhra Coastal)
];

const QUICK_PRESETS = [
  { label: '📍 Chennai City (Default)', center: [80.2707, 13.0827] as [number, number], zoom: 11.2 },
  { label: '🌊 Marina & Mylapore', center: [80.2760, 13.0400] as [number, number], zoom: 12.8 },
  { label: '🏛️ Mahabalipuram Coast', center: [80.1929, 12.6169] as [number, number], zoom: 12.2 },
  { label: '🌴 Tamil Nadu Overview', center: [78.6569, 11.1271] as [number, number], zoom: 6.8 },
];

export function MemoryMap({
  onOpenPhotoDetail,
  onSelectLocation,
  isPickingLocation = false,
}: MemoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickingMarkerRef = useRef<maplibregl.Marker | null>(null);

  const { photos, setSelectedPhotoId, theme } = useVaultStore();
  const [selectedPinPhotos, setSelectedPinPhotos] = useState<Photo[] | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mapStyle, setMapStyle] = useState<'dark' | 'liberty'>(() => (theme === 'light' ? 'liberty' : 'dark'));
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(11.2);

  useEffect(() => {
    setMapStyle(theme === 'light' ? 'liberty' : 'dark');
  }, [theme]);

  // Filter only photos with valid GPS coordinates
  const geotaggedPhotos = useMemo(() => {
    return photos.filter(
      (p) => !p.inTrash && p.metadata.location?.latitude && p.metadata.location?.longitude
    );
  }, [photos]);

  // Group photos by coordinate proximity
  const locationGroups = useMemo(() => {
    const groups: Record<string, { lat: number; lng: number; label: string; photos: Photo[] }> = {};

    geotaggedPhotos.forEach((photo) => {
      const loc = photo.metadata.location!;
      const key = `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}`;
      if (!groups[key]) {
        groups[key] = {
          lat: loc.latitude,
          lng: loc.longitude,
          label: loc.label,
          photos: [],
        };
      }
      groups[key].photos.push(photo);
    });

    return Object.values(groups);
  }, [geotaggedPhotos]);

  // Initialize MapLibre with Chennai as default center
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle === 'dark' ? CARTO_DARK_STYLE : CARTO_VOYAGER_STYLE,
      center: CHENNAI_CENTER,
      zoom: 11.2,
      maxZoom: 14.5, // Strict maximum zoom so user stays at local neighborhood level
      minZoom: 4.5, // Allows zooming out to view Tamil Nadu & South India
      maxBounds: TAMIL_NADU_BOUNDS, // Restrict navigation boundary to Tamil Nadu and surrounds
      fadeDuration: 0, // Instant zero-delay tile rendering
      maxTileCacheSize: 200, // In-memory tile cache for butter-smooth panning
    });

    mapRef.current = map;

    map.on('zoom', () => {
      setCurrentZoom(Number(map.getZoom().toFixed(1)));
    });

    map.on('click', (e) => {
      if (isPickingLocation) {
        const { lng, lat } = e.lngLat;
        setPickedCoords({ lat, lng });

        if (pickingMarkerRef.current) {
          pickingMarkerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'w-7 h-7 rounded-full bg-vault-gold border-2 border-black shadow-lg flex items-center justify-center text-black font-bold text-xs';
          el.innerHTML = '📍';
          pickingMarkerRef.current = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);

          pickingMarkerRef.current.on('dragend', () => {
            const newPos = pickingMarkerRef.current!.getLngLat();
            setPickedCoords({ lat: newPos.lat, lng: newPos.lng });
            if (onSelectLocation) {
              onSelectLocation({
                latitude: Number(newPos.lat.toFixed(6)),
                longitude: Number(newPos.lng.toFixed(6)),
                label: `Pinned Location (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`,
              });
            }
          });
        }

        if (onSelectLocation) {
          onSelectLocation({
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            label: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          });
        }
      }
    });

    return () => {
      map.remove();
    };
  }, [mapStyle, isPickingLocation]);

  // Render Marker Clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locationGroups.forEach((group) => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';

      const thumbUrl = group.photos[0]?.decryptedThumbUrl || group.photos[0]?.thumbStoragePath;
      const count = group.photos.length;

      el.innerHTML = `
        <div class="relative w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-tr from-vault-gold via-purple-500 to-cyan-400 shadow-xl transition-all transform hover:scale-110 border border-white/20">
          <div class="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 border border-black/40">
            <img src="${thumbUrl}" class="w-full h-full object-cover" alt="${group.label}" />
          </div>
          ${
            count > 1
              ? `<div class="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-vault-gold text-slate-950 font-mono text-[9px] font-black border border-white shadow">
                  ${count}
                </div>`
              : ''
          }
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([group.lng, group.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPinPhotos(group.photos);
        setActivePhotoIndex(0);

        map.flyTo({
          center: [group.lng, group.lat],
          zoom: Math.min(map.getZoom() + 1.2, 14.5),
          essential: true,
          duration: 900,
        });
      });

      markersRef.current.push(marker);
    });
  }, [locationGroups]);

  const handleFlyTo = (center: [number, number], zoom: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center,
        zoom,
        essential: true,
        duration: 1000,
      });
    }
  };

  const handleZoom = (delta: number) => {
    if (mapRef.current) {
      const target = Math.max(4.5, Math.min(14.5, mapRef.current.getZoom() + delta));
      mapRef.current.zoomTo(target, { duration: 400 });
    }
  };

  const currentPreviewPhoto = selectedPinPhotos ? selectedPinPhotos[activePhotoIndex] : null;

  return (
    <div className="relative w-full h-full min-h-[400px] sm:min-h-[580px] bg-[#F6F5F0] dark:bg-[#040508] rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 select-none shadow-2xl transition-colors duration-300">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] sm:min-h-[580px]" />

      {/* Top Map Status Badge */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="glass-panel px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80">
          <MapPin className="w-3.5 h-3.5 text-vault-gold" />
          <span>{geotaggedPhotos.length} Tamil Nadu Memories</span>
        </div>

        <div className="glass-panel px-3 py-1.5 rounded-full text-xs text-slate-700 dark:text-slate-300 font-mono hidden sm:inline-flex border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80">
          Zoom: {currentZoom}x
        </div>

        {isPickingLocation && (
          <div className="glass-panel px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-vault-gold border border-vault-gold/40 animate-pulse bg-white/90 dark:bg-black/80">
            Click map to pin memory
          </div>
        )}
      </div>

      {/* Top Quick Focus Region Pills */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-1/2 sm:-translate-x-1/2 z-10 flex items-center gap-1 sm:gap-1.5 p-1 bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-full shadow-xl max-w-[calc(100vw-110px)] sm:max-w-none overflow-x-auto no-scrollbar">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleFlyTo(preset.center, preset.zoom)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all whitespace-nowrap cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Top-Right Quick Map Tools & Style Toggles */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-1.5 sm:gap-2">
        {/* Reset to Chennai Default */}
        <button
          onClick={() => handleFlyTo(CHENNAI_CENTER, 11.2)}
          title="Reset to Chennai, Tamil Nadu"
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-vault-gold hover:text-black dark:hover:text-white bg-white/90 dark:glass-panel-interactive border border-black/10 dark:border-white/10 shadow-md cursor-pointer"
        >
          <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Toggle Dark / Satellite Vector Style */}
        <button
          onClick={() => setMapStyle(mapStyle === 'dark' ? 'liberty' : 'dark')}
          title="Toggle Map Cartography Style"
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-purple-600 dark:text-purple-300 hover:text-black dark:hover:text-white bg-white/90 dark:glass-panel-interactive border border-black/10 dark:border-white/10 shadow-md cursor-pointer"
        >
          <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>
      </div>

      {/* Dedicated Zoom Controls (Zoom In / Zoom Out) */}
      <div className="absolute right-3 sm:right-4 bottom-24 sm:bottom-24 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => handleZoom(1.0)}
          title="Zoom In"
          disabled={currentZoom >= 14.5}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white bg-white/90 dark:glass-panel-interactive border border-black/10 dark:border-white/10 shadow-md disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-1.0)}
          title="Zoom Out (Explore Tamil Nadu)"
          disabled={currentZoom <= 4.5}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white bg-white/90 dark:glass-panel-interactive border border-black/10 dark:border-white/10 shadow-md disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Selected Pin Photo Carousel Modal */}
      {currentPreviewPhoto && (
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white/95 dark:bg-[#0A0D15]/95 backdrop-blur-2xl p-3.5 sm:p-4 rounded-3xl border border-vault-gold/40 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-start gap-3 sm:gap-4">
              {(() => {
                const isPortrait = currentPreviewPhoto.height > currentPreviewPhoto.width || currentPreviewPhoto.orientation === 'portrait';
                return (
                  <div className={`rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-black/10 dark:border-white/10 flex-shrink-0 shadow-inner ${
                    isPortrait ? 'w-14 h-24 aspect-[9/16]' : 'w-24 h-14 sm:w-28 sm:h-16 aspect-[16/9]'
                  }`}>
                    <img
                      src={currentPreviewPhoto.decryptedThumbUrl || currentPreviewPhoto.thumbStoragePath}
                      alt={currentPreviewPhoto.metadata.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })()}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif italic text-base font-semibold text-slate-900 dark:text-white truncate">
                    {currentPreviewPhoto.metadata.title}
                  </h4>
                  <button
                    onClick={() => setSelectedPinPhotos(null)}
                    className="text-slate-400 hover:text-black dark:hover:text-white text-xs ml-2 p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-vault-gold flex items-center gap-1.5 mt-0.5 truncate font-medium">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{currentPreviewPhoto.metadata.location?.label}</span>
                </p>

                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>{currentPreviewPhoto.metadata.captureDate}</span>
                </p>

                {/* Multiple Photos at this location pagination */}
                {selectedPinPhotos && selectedPinPhotos.length > 1 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-400">
                      {activePhotoIndex + 1} of {selectedPinPhotos.length} memories
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev > 0 ? prev - 1 : selectedPinPhotos.length - 1
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-white/10 text-xs text-slate-200 hover:bg-white/20"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev < selectedPinPhotos.length - 1 ? prev + 1 : 0
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-white/10 text-xs text-slate-200 hover:bg-white/20"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setSelectedPhotoId(currentPreviewPhoto.id);
                  onOpenPhotoDetail(currentPreviewPhoto.id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold tracking-wide shadow-glow transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Memory Story</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
