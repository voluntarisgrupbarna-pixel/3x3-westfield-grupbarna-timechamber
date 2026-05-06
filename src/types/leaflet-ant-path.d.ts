/**
 * Tipus mínims per a `leaflet-ant-path` (no proporciona tipus oficials).
 * Només exposem el que fem servir al CircuitMap.
 */
declare module "leaflet-ant-path" {
  import * as L from "leaflet";

  export interface AntPathOptions extends L.PolylineOptions {
    delay?: number;
    dashArray?: [number, number] | string;
    weight?: number;
    color?: string;
    pulseColor?: string;
    paused?: boolean;
    reverse?: boolean;
    hardwareAccelerated?: boolean;
    opacity?: number;
  }

  export class AntPath extends L.Polyline {
    constructor(latlngs: L.LatLngExpression[], options?: AntPathOptions);
    pause?: () => void;
    resume?: () => void;
  }
}
