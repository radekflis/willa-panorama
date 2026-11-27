# willa-panorama
willa-panorama

## Living Map-OS

Ustaw `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` w `.env.local` oraz w środowisku
wdrożenia i uruchom aplikację ponownie. W projekcie Google Cloud włącz
rozliczenia, Maps JavaScript API, Places API (New), Routes API i Geocoding API. Klucz
przeglądarkowy należy ograniczyć do właściwych domen i wymaganych API.
Domyślny widok Earth 3D wykorzystuje fotorealistyczną mapę Google Maps 3D
(kanał beta); przełączniki udostępniają także mapy 2D i warstwę rowerową.
Po wybraniu nieruchomości, punktu lub miejsca można uruchomić przelot 360°.
Widok 3D oraz Street View zależą od dostępności danych Google w danej
lokalizacji. Korzystanie z tych usług może generować opłaty. Nieruchomości bez
prawidłowych współrzędnych nie są wyświetlane na mapie.

Kliknięcie miejsca na mapie otwiera jego szczegóły w aplikacji; trasy i
Street View również są wyświetlane na mapie. Trasa wymaga wcześniejszego
wskazania punktu nieruchomości.

Po wybraniu miejsca Google lub punktu nieruchomości dostępna jest analiza
słońca, jakości powietrza, pylenia, pogody i wysokości. Na serwerze ustaw
`GOOGLE_MAPS_SERVER_KEY` (w razie braku używany jest klucz przeglądarkowy)
i włącz Elevation API, Solar API, Air Quality API, Pollen API oraz Weather API.
Ogranicz klucz serwerowy do wymaganych usług. Dostępność danych zależy od
lokalizacji, a zapytania mogą generować opłaty. Wyniki są przechowywane przez
12 godzin w pamięci danego procesu serwera; błędy usług nie są buforowane.
Endpoint analizy jest publiczny, dlatego przed publicznym wdrożeniem należy
ograniczyć dostęp lub liczbę wywołań oraz ustawić limity kosztów Google Cloud.

W przepływie sprzedającego wybrane pliki pozostają wyłącznie w pamięci
przeglądarki i nie są przesyłane ani zapisywane. Pin również jest tymczasowy.
Silnik 3D Nerfstudio i analiza wymiarów rzutu zostaną podłączone w kolejnym
etapie; utworzenie spaceru nie jest obecnie dostępne.
