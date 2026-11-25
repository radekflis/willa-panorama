import { strict as assert } from "node:assert";
import { test } from "node:test";
import { predictSuffix } from "./crystal-prediction";

test("podpowiada typ i region bez wysyłania zapytania", () => {
  assert.equal(predictSuffix("Sprzedaję dom "), "w województwie");
  assert.equal(predictSuffix("Sprzedaję dom w województwie pom"), "orskim");
  assert.equal(predictSuffix("Kupuję mieszkanie we Wroc"), "ławiu");
  assert.equal(predictSuffix("nieznane"), "");
});

test("rozpoznaje prefiksy wszystkich województw", () => {
  const regions = ["dolnośląskim", "kujawsko-pomorskim", "lubelskim", "lubuskim", "łódzkim", "małopolskim", "mazowieckim", "opolskim", "podkarpackim", "podlaskim", "pomorskim", "śląskim", "świętokrzyskim", "warmińsko-mazurskim", "wielkopolskim", "zachodniopomorskim"];
  for (const region of regions) {
    const prefix = `Sprzedaję dom w województwie ${region.slice(0, -1)}`;
    assert.equal(prefix + predictSuffix(prefix), `Sprzedaję dom w województwie ${region}`);
  }
});
