const TYPES = ["dom", "mieszkanie", "działkę", "apartament"];
const REGIONS = [
  "dolnośląskim", "kujawsko-pomorskim", "lubelskim", "lubuskim", "łódzkim",
  "małopolskim", "mazowieckim", "opolskim", "podkarpackim", "podlaskim",
  "pomorskim", "śląskim", "świętokrzyskim", "warmińsko-mazurskim",
  "wielkopolskim", "zachodniopomorskim",
];
const CITIES = ["w Warszawie", "w Krakowie", "we Wrocławiu", "w Gdańsku", "w Gdyni", "w Poznaniu", "w Łodzi", "w Szczecinie", "w Lublinie", "w Katowicach", "w Białymstoku", "w Bydgoszczy", "w Toruniu", "w Olsztynie", "w Opolu", "w Rzeszowie", "w Kielcach", "w Zielonej Górze", "w Gorzowie Wielkopolskim"];
const PREDICTIONS = ["Sprzedaję", "Kupuję", "Sprawdź okolicę"].flatMap((intent) =>
  intent === "Sprawdź okolicę"
    ? [intent, ...CITIES.map((location) => `${intent} ${location}`)]
    : TYPES.flatMap((type) => [
        `${intent} ${type} w województwie`,
        ...REGIONS.flatMap((region) => [`${intent} ${type} w województwie ${region}`, `${intent} ${type} w ${region}`]),
        ...[...CITIES, "nad jeziorem", "w górach"].map((location) => `${intent} ${type} ${location}`),
      ]),
).map((text) => ({ text, normalized: text.toLocaleLowerCase("pl") }));

export function predictSuffix(query: string): string {
  if (!query.trim()) return "";
  const normalized = query.toLocaleLowerCase("pl");
  const prediction = PREDICTIONS.find((candidate) => candidate.normalized.startsWith(normalized) && candidate.text.length > query.length);
  return prediction?.text.slice(query.length) ?? "";
}
