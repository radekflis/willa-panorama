# willa-panorama
willa-panorama

## Living Map-OS

Ustaw `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` w `.env.local` oraz w środowisku
wdrożenia i uruchom aplikację ponownie. W projekcie Google Cloud włącz
rozliczenia i Maps JavaScript API. Klucz
przeglądarkowy należy ograniczyć do właściwych domen i wymaganych API.
Mapa wykorzystuje Google Maps z widokiem hybrydowym, nachyleniem 45°
oraz natywnymi kontrolkami, bez dodatkowych nakładek i znaczników aplikacji.
Do obrotu i nachylenia mapy potrzebna jest obsługa wektorowego Google Maps;
w trybie rastrowym funkcje te mogą być niedostępne.
Centralne okno AI można zminimalizować i przywrócić przyciskiem u dołu ekranu.
Obsługa zapytań w oknie AI zostanie podłączona w kolejnym etapie.
Widok 3D oraz Street View zależą od dostępności danych Google w danej
lokalizacji. Korzystanie z tych usług może generować opłaty.

Backend `/api/geo/intelligence` pozostaje dostępny do przyszłej integracji.
Na serwerze ustaw
`GOOGLE_MAPS_SERVER_KEY` (w razie braku używany jest klucz przeglądarkowy)
i włącz Elevation API, Solar API, Air Quality API, Pollen API oraz Weather API.
Ogranicz klucze do wymaganych usług i źródeł. Dostępność danych zależy od
lokalizacji, a zapytania mogą generować opłaty. Wyniki są przechowywane przez
10 minut w pamięci danego procesu serwera; błędy usług nie są buforowane.
Endpoint analizy jest publiczny, dlatego przed publicznym wdrożeniem należy
ograniczyć dostęp lub liczbę wywołań oraz ustawić limity kosztów Google Cloud.
