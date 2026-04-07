import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { Map, Marker, Popup, LngLatObject } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Package, Zap } from "lucide-react";
import { toast } from "sonner";

// Set your Mapbox token here - get from https://account.mapbox.com/tokens/
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export interface WarehouseLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  currentStock: number;
  capacity: number;
  managerName: string;
  phone: string;
  city: string;
  state: string;
}

interface WarehouseMapProps {
  warehouses: WarehouseLocation[];
  onWarehouseSelect?: (warehouse: WarehouseLocation) => void;
  height?: string;
  showHeatmap?: boolean;
}

export default function WarehouseMap({
  warehouses,
  onWarehouseSelect,
  height = "h-96",
  showHeatmap = false,
}: WarehouseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<{ marker: Marker; popup: Popup }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if token is set
    if (!MAPBOX_TOKEN) {
      console.warn("Mapbox token not set. Set VITE_MAPBOX_TOKEN environment variable.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate bounds from warehouses
    let mapCenter: LngLatObject = { lng: -95.7129, lat: 37.0902 }; // Default US center
    let zoom = 3;

    if (warehouses.length > 0) {
      // Create bounds
      const lngs = warehouses.map((w) => w.longitude);
      const lats = warehouses.map((w) => w.latitude);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      mapCenter = {
        lng: (minLng + maxLng) / 2,
        lat: (minLat + maxLat) / 2,
      };

      // Estimate zoom based on bounds
      const deltaLng = maxLng - minLng;
      const deltaLat = maxLat - minLat;
      const maxDelta = Math.max(deltaLng, deltaLat);
      zoom = maxDelta > 0 ? Math.round(11 - Math.log2(maxDelta * 111)) : 10;
    }

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: mapCenter,
      zoom: Math.max(1, Math.min(zoom, 18)),
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add markers for each warehouse
    markersRef.current.forEach((item) => {
      item.marker.remove();
    });
    markersRef.current = [];

    warehouses.forEach((warehouse) => {
      const utilization = (warehouse.currentStock / warehouse.capacity) * 100;
      const color = utilization > 90 ? "#ff3333" : utilization > 70 ? "#ffaa00" : "#00cc00";

      const el = document.createElement("div");
      el.className = "marker-pin";
      el.style.backgroundColor = color;
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      el.style.fontSize = "10px";
      el.style.color = "white";
      el.style.fontWeight = "bold";
      el.textContent = Math.round(utilization).toString();

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-2 max-w-xs">
            <h3 class="font-bold text-sm">${warehouse.name}</h3>
            <p class="text-xs text-gray-600">${warehouse.city}, ${warehouse.state}</p>
            <p class="text-xs mt-1">
              <strong>Stock:</strong> ${warehouse.currentStock.toLocaleString()} / ${warehouse.capacity.toLocaleString()} units
            </p>
            <p class="text-xs">
              <strong>Utilization:</strong> ${Math.round(utilization)}%
            </p>
            <p class="text-xs">
              <strong>Manager:</strong> ${warehouse.managerName || "N/A"}
            </p>
            <p class="text-xs">
              <strong>Phone:</strong> ${warehouse.phone || "N/A"}
            </p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([warehouse.longitude, warehouse.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", () => {
        setSelectedWarehouse(warehouse.id);
        onWarehouseSelect?.(warehouse);
      });

      markersRef.current.push({ marker, popup });
    });

    return () => {
      map.current?.remove();
    };
  }, [warehouses, onWarehouseSelect]);

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Warehouse Network
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className={`${height} rounded-lg overflow-hidden border border-border`} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Normal (&lt;70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>Warning (70-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>Critical (&gt;90%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
