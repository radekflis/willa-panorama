export type ActiveLayerType = 'none' | 'weather' | 'terrain' | 'air';
export type WeatherLayerCode = 'temp_new' | 'clouds_new' | 'precipitation_new' | 'wind_new' | 'pressure_new';
export type WeatherLayerSelection = WeatherLayerCode | 'radar';

const transparentTile = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function openWeatherTileUrl(
  layer: WeatherLayerCode,
  coord: { x: number; y: number },
  zoom: number,
  apiKey: string,
): string {
  const tileCount = 2 ** zoom;
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 22 || coord.y < 0 || coord.y >= tileCount) return '';
  const x = ((coord.x % tileCount) + tileCount) % tileCount;
  return `https://tile.openweathermap.org/map/${layer}/${zoom}/${x}/${coord.y}.png?appid=${encodeURIComponent(apiKey)}`;
}

export interface WeatherHour {
  time: string;
  timestamp: number;
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  cloudCover: number | null;
}

export async function fetchWeatherForecast(point: { lat: number; lng: number }, signal: AbortSignal): Promise<WeatherHour[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(point.lat));
  url.searchParams.set('longitude', String(point.lng));
  url.searchParams.set('hourly', 'temperature_2m,precipitation,wind_speed_10m,cloud_cover');
  url.searchParams.set('past_days', '7');
  url.searchParams.set('forecast_days', '8');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo: HTTP ${response.status}`);
  const data = await response.json() as {
    hourly?: {
      time?: string[];
      temperature_2m?: Array<number | null>;
      precipitation?: Array<number | null>;
      wind_speed_10m?: Array<number | null>;
      cloud_cover?: Array<number | null>;
    };
    utc_offset_seconds?: number;
  };
  if (!Array.isArray(data.hourly?.time)) throw new Error('Open-Meteo: brak godzinowych danych pogodowych.');

  return data.hourly.time.map((time, index) => ({
    time,
    timestamp: Date.parse(`${time}Z`) - (data.utc_offset_seconds ?? 0) * 1000,
    temperature: data.hourly?.temperature_2m?.[index] ?? null,
    precipitation: data.hourly?.precipitation?.[index] ?? null,
    windSpeed: data.hourly?.wind_speed_10m?.[index] ?? null,
    cloudCover: data.hourly?.cloud_cover?.[index] ?? null,
  }));
}

export class FuturisticMapLayers {
  private map: google.maps.Map;
  private animationInterval: ReturnType<typeof setInterval> | null = null;
  private currentLayer: ActiveLayerType = 'none';
  private requestId = 0;
  private weatherRequest: AbortController | null = null;
  private overlay: google.maps.ImageMapType | null = null;
  private readonly ownedOverlays = new Set<google.maps.ImageMapType>();
  private readonly overlayRemovalTimers = new Map<google.maps.ImageMapType, ReturnType<typeof setTimeout>>();
  private previousTilt: number | null = null;

  constructor(map: google.maps.Map) {
    this.map = map;
  }

  public async toggleLayer(
    type: ActiveLayerType,
    onTimestampChange?: (timeLabel: string) => void,
  ): Promise<ActiveLayerType> {
    const shouldDeactivate = this.currentLayer === type || type === 'none';
    if (shouldDeactivate) {
      this.clearAll();
      onTimestampChange?.('');
      return 'none';
    }

    this.stopActivity();
    this.restoreTilt();
    const requestId = ++this.requestId;
    this.currentLayer = type;
    onTimestampChange?.('');

    try {
      if (type === 'weather') {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        if (apiKey) {
          this.setOpenWeatherLayer('temp_new', apiKey);
        } else {
          await this.activateLiveWeather(requestId, onTimestampChange);
        }
      } else if (type === 'terrain') {
        this.activateElevationContours();
      } else if (type === 'air') {
        this.activateAirQuality();
      }
    } catch (error) {
      if (requestId !== this.requestId) return this.currentLayer;
      this.clearAll();
      throw error;
    }

    return this.currentLayer;
  }

  public async setWeatherLayer(
    layer: WeatherLayerSelection,
    onTimestampChange?: (timeLabel: string) => void,
  ): Promise<void> {
    if (this.currentLayer !== 'weather') return;

    this.stopActivity();
    const requestId = ++this.requestId;
    onTimestampChange?.('');
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (layer !== 'radar' && apiKey) {
      this.setOpenWeatherLayer(layer, apiKey);
      return;
    }
    await this.activateLiveWeather(requestId, onTimestampChange);
  }

  private setOpenWeatherLayer(layer: WeatherLayerCode, apiKey: string) {
    const weatherLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (!coord) return transparentTile;
        return openWeatherTileUrl(layer, coord, zoom, apiKey) || transparentTile;
      },
      tileSize: new google.maps.Size(256, 256),
      minZoom: 0,
      maxZoom: 22,
      opacity: 0.65,
      name: `OpenWeather_${layer}`,
    });
    this.setOverlay(weatherLayer);
  }

  private async activateLiveWeather(requestId: number, onTimestampChange?: (timeLabel: string) => void) {
    const zoom = this.map.getZoom();
    if (zoom !== undefined && zoom > 7) this.map.setZoom(6);
    const controller = new AbortController();
    this.weatherRequest = controller;
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal });
    if (!response.ok) throw new Error(`RainViewer: HTTP ${response.status}`);
    const data: {
      host?: string;
      radar?: { past?: { time: number; path: string }[] };
    } = await response.json();
    if (requestId !== this.requestId) return;
    this.weatherRequest = null;
    const pastFrames = data.radar?.past ?? [];

    if (!data.host || pastFrames.length === 0) throw new Error('Brak klatek radaru RainViewer.');

    const tileLayers = pastFrames.map((frame) => new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (!coord || zoom > 7) return transparentTile;
        return `${data.host}${frame.path}/256/${zoom}/${coord.x}/${coord.y}/2/1_1.png`;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 7,
      opacity: 0.65,
      name: `Weather_${frame.time}`,
    }));

    let frameIndex = 0;
    const renderFrame = (index: number) => {
      this.setOverlay(tileLayers[index]);
      if (onTimestampChange) {
        const date = new Date(pastFrames[index].time * 1000);
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        onTimestampChange(`${timeStr} (Na żywo)`);
      }
    };

    renderFrame(frameIndex);
    this.animationInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % tileLayers.length;
      renderFrame(frameIndex);
    }, 650);
  }

  private setOverlay(layer: google.maps.ImageMapType) {
    const previousLayer = this.overlay;
    this.overlay = layer;
    this.ownedOverlays.add(layer);
    this.map.overlayMapTypes.push(layer);

    if (previousLayer) {
      const existingTimer = this.overlayRemovalTimers.get(previousLayer);
      if (existingTimer) clearTimeout(existingTimer);
      this.overlayRemovalTimers.set(previousLayer, setTimeout(() => {
        this.removeOverlay(previousLayer);
      }, 400));
    }
  }

  private removeOverlay(layer: google.maps.ImageMapType) {
    const timer = this.overlayRemovalTimers.get(layer);
    if (timer) clearTimeout(timer);
    this.overlayRemovalTimers.delete(layer);
    const index = this.map.overlayMapTypes.getArray().indexOf(layer);
    if (index !== -1) this.map.overlayMapTypes.removeAt(index);
    this.ownedOverlays.delete(layer);
    if (this.overlay === layer) this.overlay = null;
  }

  private activateElevationContours() {
    const topoLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (!coord) return null;
        const subdomains = ['a', 'b', 'c'];
        const s = subdomains[(coord.x + coord.y) % subdomains.length];
        return `https://${s}.tile.opentopomap.org/${zoom}/${coord.x}/${coord.y}.png`;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 17,
      opacity: 0.58,
      name: 'ElevationContours',
    });

    this.setOverlay(topoLayer);
    this.previousTilt = this.map.getTilt() ?? null;
    this.map.setTilt(45);
  }

  private activateAirQuality() {
    const yesterday = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
    const nasaLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (!coord || zoom > 9) return transparentTile;
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${yesterday}/GoogleMapsCompatible_Level9/${zoom}/${coord.y}/${coord.x}.jpg`;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 9,
      opacity: 0.55,
      name: 'AirQualityNASA',
    });

    this.setOverlay(nasaLayer);
  }

  private stopActivity() {
    this.weatherRequest?.abort();
    this.weatherRequest = null;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  private restoreTilt() {
    if (this.previousTilt !== null) {
      this.map.setTilt(this.previousTilt);
      this.previousTilt = null;
    }
  }

  public clearAll() {
    this.requestId += 1;
    this.stopActivity();
    for (const timer of this.overlayRemovalTimers.values()) clearTimeout(timer);
    this.overlayRemovalTimers.clear();
    for (const layer of this.ownedOverlays) {
      const index = this.map.overlayMapTypes.getArray().indexOf(layer);
      if (index !== -1) this.map.overlayMapTypes.removeAt(index);
    }
    this.ownedOverlays.clear();
    this.overlay = null;
    this.restoreTilt();
    this.currentLayer = 'none';
  }
}
