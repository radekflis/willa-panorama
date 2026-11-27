export type ActiveLayerType = 'none' | 'weather' | 'terrain' | 'air';

export class FuturisticMapLayers {
  private map: google.maps.Map;
  private animationInterval: ReturnType<typeof setInterval> | null = null;
  private currentLayer: ActiveLayerType = 'none';
  private requestId = 0;
  private weatherRequest: AbortController | null = null;
  private overlay: google.maps.ImageMapType | null = null;
  private previousTilt: number | null = null;

  constructor(map: google.maps.Map) {
    this.map = map;
  }

  public async toggleLayer(
    type: ActiveLayerType,
    onTimestampChange?: (timeLabel: string) => void
  ): Promise<ActiveLayerType> {
    const shouldDeactivate = this.currentLayer === type || type === 'none';
    this.clearAll();
    onTimestampChange?.('');

    if (shouldDeactivate) {
      return 'none';
    }

    this.currentLayer = type;
    const requestId = this.requestId;

    try {
      if (type === 'weather') {
        await this.activateLiveWeather(requestId, onTimestampChange);
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

  private async activateLiveWeather(requestId: number, onTimestampChange?: (timeLabel: string) => void) {
    const controller = new AbortController();
    this.weatherRequest = controller;
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal });
    if (!response.ok) throw new Error(`RainViewer: HTTP ${response.status}`);
    const data: {
      host?: string;
      radar?: { past?: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
    } = await response.json();
    if (requestId !== this.requestId) return;
    this.weatherRequest = null;
    const pastFrames = data.radar?.past ?? [];
    const futureFrames = data.radar?.nowcast ?? [];
    const allFrames = [...pastFrames, ...futureFrames];

    if (!data.host || allFrames.length === 0) throw new Error('Brak klatek radaru RainViewer.');

    const tileLayers = allFrames.map((frame) => {
      return new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          if (!coord || zoom > 7) return null;
          return `${data.host}${frame.path}/256/${zoom}/${coord.x}/${coord.y}/2/1_1.png`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 7,
        opacity: 0.65,
        name: `Weather_${frame.time}`,
      });
    });

    let frameIndex = 0;

    const renderFrame = (index: number) => {
      this.setOverlay(tileLayers[index]);

      if (onTimestampChange) {
        const date = new Date(allFrames[index].time * 1000);
        const isForecast = index >= pastFrames.length;
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        onTimestampChange(`${timeStr} ${isForecast ? '(Prognoza)' : '(Na żywo)'}`);
      }
    };

    renderFrame(frameIndex);

    this.animationInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % tileLayers.length;
      renderFrame(frameIndex);
    }, 650);
  }

  private setOverlay(layer: google.maps.ImageMapType) {
    if (this.overlay) {
      const index = this.map.overlayMapTypes.getArray().indexOf(this.overlay);
      if (index !== -1) this.map.overlayMapTypes.removeAt(index);
    }
    this.overlay = layer;
    this.map.overlayMapTypes.push(layer);
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
        if (!coord || zoom > 9) return null;
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${yesterday}/GoogleMapsCompatible_Level9/${zoom}/${coord.y}/${coord.x}.jpg`;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 9,
      opacity: 0.55,
      name: 'AirQualityNASA',
    });

    this.setOverlay(nasaLayer);
  }

  public clearAll() {
    this.requestId += 1;
    this.weatherRequest?.abort();
    this.weatherRequest = null;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.overlay) {
      const index = this.map.overlayMapTypes.getArray().indexOf(this.overlay);
      if (index !== -1) this.map.overlayMapTypes.removeAt(index);
      this.overlay = null;
    }
    if (this.previousTilt !== null) {
      this.map.setTilt(this.previousTilt);
      this.previousTilt = null;
    }
    this.currentLayer = 'none';
  }
}
