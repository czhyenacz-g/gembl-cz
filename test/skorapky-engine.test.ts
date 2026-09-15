import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateShuffleSequence, pickRandomCup, pickRevealCup } from "../lib/skorapky/engine.ts";

describe("pickRandomCup", () => {
  test("vrací vždy platnou pozici 0-2", () => {
    for (let i = 0; i < 200; i++) {
      const cup = pickRandomCup();
      assert.ok(cup === 0 || cup === 1 || cup === 2, `neplatná pozice: ${cup}`);
    }
  });

  test("s injektovaným random je deterministický (stejný vzor jako slot-engine.ts spin)", () => {
    assert.equal(pickRandomCup(() => 0), 0);
    assert.equal(pickRandomCup(() => 0.999), 2);
  });
});

describe("pickRevealCup — klíčový princip hry: hráč vždy prohraje", () => {
  test("NIKDY nevrátí `selectedCup`, bez ohledu na hodnotu random", () => {
    for (const selected of [0, 1, 2] as const) {
      for (let i = 0; i < 500; i++) {
        assert.notEqual(pickRevealCup(selected), selected);
      }
      // I na okrajích generátoru (0 a téměř 1) platí totéž.
      assert.notEqual(pickRevealCup(selected, () => 0), selected);
      assert.notEqual(pickRevealCup(selected, () => 0.999), selected);
    }
  });

  test("vrací vždy jednu ze DVOU nevybraných pozic (nikdy nic mimo 0-2)", () => {
    for (const selected of [0, 1, 2] as const) {
      const others = ([0, 1, 2] as const).filter((cup) => cup !== selected);
      for (let i = 0; i < 200; i++) {
        assert.ok(others.includes(pickRevealCup(selected)), `reveal mimo nevybrané pozice pro selected=${selected}`);
      }
    }
  });

  test("50/50 mezi dvěma nevybranými — s injektovaným random pokrývá OBĚ hodnoty", () => {
    const others = [1, 2] as const; // selected = 0
    assert.equal(pickRevealCup(0, () => 0), others[0]);
    assert.equal(pickRevealCup(0, () => 0.999), others[1]);
  });

  test("nad velkým počtem losování padnou OBĚ nevybrané pozice (reálná náhoda, ne pevný jeden výsledek)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) seen.add(pickRevealCup(1));
    assert.deepEqual([...seen].sort(), [0, 2]);
  });
});

describe("generateShuffleSequence", () => {
  test("vrací přesně `stepCount` kroků, každý s aspoň jedním platným kelímkem", () => {
    const sequence = generateShuffleSequence(8);
    assert.equal(sequence.length, 8);
    for (const step of sequence) {
      assert.ok(step.cups.length >= 1 && step.cups.length <= 2);
      for (const cup of step.cups) assert.ok(cup === 0 || cup === 1 || cup === 2);
    }
  });

  test("s injektovaným random je deterministická", () => {
    const a = generateShuffleSequence(5, () => 0);
    const b = generateShuffleSequence(5, () => 0);
    assert.deepEqual(a, b);
  });

  test("pořadí je náhodné — nad víc kroky se objeví víc než jeden vzor", () => {
    const sequence = generateShuffleSequence(30);
    const patterns = new Set(sequence.map((step) => step.cups.join(",")));
    assert.ok(patterns.size > 1);
  });
});
