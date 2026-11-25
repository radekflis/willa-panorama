# willa-panorama
willa-panorama

## Living Map-OS

Ustaw `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` w `.env.local` oraz w środowisku
wdrożenia i uruchom aplikację ponownie. W projekcie Google Cloud włącz
rozliczenia, Maps JavaScript API, Places API (New), Routes API i Geocoding API. Klucz
przeglądarkowy należy ograniczyć do właściwych domen i wymaganych API.
Widok 3D oraz Street View zależą od dostępności danych Google w danej
lokalizacji. Korzystanie z tych usług może generować opłaty.

Kliknięcie miejsca na mapie otwiera jego szczegóły w aplikacji; trasy i
Street View również są wyświetlane na mapie. Trasa wymaga wcześniejszego
wskazania punktu nieruchomości.

W przepływie sprzedającego wybrane pliki pozostają wyłącznie w pamięci
przeglądarki i nie są przesyłane ani zapisywane. Pin również jest tymczasowy.
Silnik 3D Nerfstudio i analiza wymiarów rzutu zostaną podłączone w kolejnym
etapie; utworzenie spaceru nie jest obecnie dostępne.
