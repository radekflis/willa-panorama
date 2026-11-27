# willa-panorama
willa-panorama

## Living Map-OS

Ustaw `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` w `.env.local` oraz w środowisku
wdrożenia i uruchom aplikację ponownie. W projekcie Google Cloud włącz
rozliczenia, Maps JavaScript API, Places API (New), Routes API i Geocoding API. Klucz
przeglądarkowy należy ograniczyć do właściwych domen i wymaganych API.
Mapa wykorzystuje Google Maps z widokiem hybrydowym, natywnymi kontrolkami
oraz nakładkami pogody, terenu, NASA i pyłków. Przyciski 3D i Przelot
uruchamiają obrót kamery, a Rower tymczasowo przełącza mapę na widok drogowy.
Google ogranicza nachylenie zależnie od zoomu (przy zoomie 14 maksymalnie 45°);
przelot zwiększa zoom do co najmniej 15, aby umożliwić nachylenie 60°.
Do obrotu i nachylenia mapy potrzebna jest obsługa wektorowego Google Maps;
w trybie rastrowym funkcje te mogą być niedostępne.
Centralne okno AI można zminimalizować i przywrócić przyciskiem u dołu ekranu.
Po wybraniu nieruchomości, punktu lub miejsca można uruchomić przelot 360°.
Widok 3D oraz Street View zależą od dostępności danych Google w danej
lokalizacji. Korzystanie z tych usług może generować opłaty. Nieruchomości bez
prawidłowych współrzędnych nie są wyświetlane na mapie.

Pogoda pokazuje animowany radar RainViewer (do zoomu 7); włączenie radaru
przy większym przybliżeniu oddala mapę do zoomu 6. Teren pokazuje nakładkę
OpenTopoMap, a Powietrze obraz satelitarny NASA MODIS (do zoomu 9) sprzed
dwóch dni. Obraz MODIS nie jest mapą jakości powietrza; jej punktowy indeks
pochodzi z Google. Pyłki są przedstawiane jako kafelki Google (do zoomu 16).
Panel przedstawia dane punktowe Google; dla słońca nie jest wyświetlana
warstwa przestrzenna.
Pierścienie 5/10/15 minut odpowiadają 500/1000/1500 m i są wyłącznie
orientacyjne: nie uwzględniają sieci dróg ani rzeczywistego czasu podróży.

Kliknięcie miejsca na mapie otwiera jego szczegóły w aplikacji; trasy i
Street View również są wyświetlane na mapie. Trasa wymaga wcześniejszego
wskazania punktu nieruchomości.

Po wybraniu miejsca Google lub punktu nieruchomości dostępna jest analiza
słońca, jakości powietrza, pylenia, pogody i wysokości. Na serwerze ustaw
`GOOGLE_MAPS_SERVER_KEY` (w razie braku używany jest klucz przeglądarkowy)
i włącz Elevation API, Solar API, Air Quality API, Pollen API oraz Weather API.
Klucz przeglądarkowy również musi mieć dostęp do Pollen API dla kafelków.
Ogranicz klucze do wymaganych usług i źródeł. Dostępność danych zależy od
lokalizacji, a zapytania mogą generować opłaty. Wyniki są przechowywane przez
10 minut w pamięci danego procesu serwera; błędy usług nie są buforowane.
Endpoint analizy jest publiczny, dlatego przed publicznym wdrożeniem należy
ograniczyć dostęp lub liczbę wywołań oraz ustawić limity kosztów Google Cloud.

W przepływie sprzedającego wybrane pliki pozostają wyłącznie w pamięci
przeglądarki i nie są przesyłane ani zapisywane. Pin również jest tymczasowy.
Silnik 3D Nerfstudio i analiza wymiarów rzutu zostaną podłączone w kolejnym
etapie; utworzenie spaceru nie jest obecnie dostępne.
