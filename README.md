# willa-panorama
willa-panorama

## Living Map-OS

Ustaw `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` w `.env.local` oraz w środowisku
wdrożenia i uruchom aplikację ponownie. W projekcie Google Cloud włącz
rozliczenia, Maps JavaScript API oraz Places API (New). Klucz
przeglądarkowy należy ograniczyć do właściwych domen i wymaganych API.
Mapa domyślnie wykorzystuje fotorealistyczny widok 3D Google Maps z natywnymi
kontrolkami oraz pinami miejsc w pobliżu. Kliknięcie miejsca otwiera jego
szczegóły w aplikacji. Kliknięcie pustego miejsca otwiera kartę punktu;
przytrzymanie lub prawy przycisk myszy wybiera przybliżony środek mapy.
Z karty można wyszukać miejsca, przeanalizować punkt lub zapisać szkic
nieruchomości z jego współrzędnymi. Zapis szkicu wymaga zalogowania.
Centralne okno AI można zminimalizować i przywrócić przyciskiem u dołu ekranu.
Obsługa zapytań w oknie AI zostanie podłączona w kolejnym etapie.
Widok 3D oraz Street View zależą od dostępności danych Google w danej
lokalizacji. Korzystanie z tych usług może generować opłaty.

Karta punktu korzysta z backendu `/api/geo/intelligence`.
Na serwerze ustaw
`GOOGLE_MAPS_SERVER_KEY` (w razie braku używany jest klucz przeglądarkowy)
i włącz Elevation API, Solar API, Air Quality API, Pollen API oraz Weather API.
Ogranicz klucze do wymaganych usług i źródeł. Dostępność danych zależy od
lokalizacji, a zapytania mogą generować opłaty. Wyniki są przechowywane przez
10 minut w pamięci danego procesu serwera; błędy usług nie są buforowane.
Endpoint analizy jest publiczny, dlatego przed publicznym wdrożeniem należy
ograniczyć dostęp lub liczbę wywołań oraz ustawić limity kosztów Google Cloud.
