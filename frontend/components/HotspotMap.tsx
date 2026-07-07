"use client";

// Leaflet needs `window` — this component is ONLY loaded via
// dynamic(() => ..., { ssr: false }). Never import it in a server component.
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { Hotspot } from "@/lib/types";
import { CATEGORIES, CATEGORY_META, categoryMeta } from "@/lib/ui";

const INDORE: [number, number] = [22.72, 75.86];

// complaint_count -> radius, clamped 8–28px.
function radiusFor(count: number): number {
  return Math.max(8, Math.min(28, 6 + count * 2));
}

export default function HotspotMap({
  hotspots,
  onSelect,
}: {
  hotspots: Hotspot[];
  onSelect: (clusterId: string) => void;
}) {
  return (
    <div>
      <div className="h-[520px] w-full overflow-hidden rounded border border-slate-200">
        <MapContainer
          center={INDORE}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hotspots.map((h) => {
            const color = categoryMeta(h.category).marker;
            return (
              <CircleMarker
                key={h.cluster_id}
                center={[h.lat, h.lng]}
                radius={radiusFor(h.complaint_count)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onSelect(h.cluster_id) }}
              >
                <Tooltip direction="top">
                  <div className="text-xs">
                    <div className="font-semibold">{h.label}</div>
                    <div className="text-gray-500">
                      {h.complaint_count} complaints · {h.severity} severity
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-slate-200 bg-white px-4 py-2.5 text-xs">
        {CATEGORIES.map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_META[cat].marker }}
            />
            {CATEGORY_META[cat].label}
          </span>
        ))}
        <span className="ml-auto font-medium text-ink-muted">Circle size = complaint volume</span>
      </div>
    </div>
  );
}
