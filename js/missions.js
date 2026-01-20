// Team-Puzzle: Jeder Spieler bekommt eine ROLLE (eigenes Infokärtchen + eigener Code).
// Nur wenn ALLE online Spieler ihren Code korrekt abgeben, geht es weiter.

export const MISSIONS = [
  {
    id: 0,
    title: "Kapitel 1: Bauernbefreiung & Leibeigenschaft",
    chapterIntro: [
      "Nach dem Ende des Siebenjährigen Krieges (1763) ordnete Friedrich an, die Leibeigenschaft abzuschaffen – in der Praxis ging das aber langsam.",
      "Im Text wird betont, wie zäh Reformen vorankamen und wie komplex das Thema war."
    ],
    roles: [
      { label: "Chronist", info: "Merke dir das Jahr der Anordnung nach dem Siebenjährigen Krieg.", answer: "1763" },
      { label: "Reformprüfer", info: "Merke dir das Jahr, das im Text als wichtiger juristischer Einschnitt in Preußen genannt wird.", answer: "1807" },
      { label: "Vergleich (Österreich)", info: "Merke dir das Jahr, in dem in Österreich die Leibeigenschaft (auf Gütern) abgeschafft wurde.", answer: "1773" },
      { label: "Untertanen-Hinweis", info: "Merke dir das Jahr des „Untertanenpatents“ (im Text erwähnt).", answer: "1781" }
    ],
    npcName: "Bauern & Land",
    unlockGateId: "gate1"
  },
  {
    id: 1,
    title: "Kapitel 2: Justiz & Folter",
    chapterIntro: [
      "Friedrich wollte Folter zurückdrängen. Im Text steht: Er begann 1740 mit Bemühungen, und es gab spätere Regelungen (bis hin zu einer Kriminalordnung).",
      "Es wird auch beschrieben, warum Folter trotz Reformen noch länger nachwirkte."
    ],
    roles: [
      { label: "Akte 1740", info: "Merke dir: In welchem Jahr begannen die Folter-Bemühungen laut Text?", answer: "1740" },
      { label: "Kriminalordnung", info: "Merke dir das Jahr der „Kriminalordnung“, die im Text erwähnt wird.", answer: "1805" },
      { label: "Vergleich Bayern", info: "Merke dir das Jahr, in dem in Bayern die Folter abgeschafft wurde (im Text genannt).", answer: "1806" }
    ],
    npcName: "Justiz",
    unlockGateId: "gate2"
  },
  {
    id: 2,
    title: "Kapitel 3: Bildung & Verwaltung",
    chapterIntro: [
      "Im Text: Schulwesen in Preußen wurde reformiert; Bauernkinder sollten nur das Nötigste lernen.",
      "Wichtiges Datum: Einrichtung des Ober-Schulkollegiums."
    ],
    roles: [
      { label: "Schulreform-Datum", info: "Merke dir: In welchem Jahr wurde das Ober-Schulkollegium eingerichtet?", answer: "1787" },
      { label: "Ziel der Schule", info: "Der Text: Bauernkinder sollten in Schulen vor allem …? Antworte mit einem Wort.", answer: "Nötigste" }
    ],
    npcName: "Schule",
    unlockGateId: "gate3"
  },
  {
    id: 3,
    title: "Kapitel 4: Bürokratie, Gesetze & Müller-Arnold",
    chapterIntro: [
      "Bürokratie diente als Instrument gegen aristokratische Willkür – in Preußen blieb aber vieles beim Adel.",
      "Fall Müller Arnold: Friedrich greift ein, was als „gerecht“ gefeiert, aber auch als Eingriff kritisiert wird.",
      "Im Text: AGB 1791, später 1794 Allgemeines Landrecht (Revision)."
    ],
    roles: [
      { label: "AGB-Jahr", info: "Merke dir: In welchem Jahr führte der Prozess zum Allgemeinen Gesetzbuch (AGB) für Preußen?", answer: "1791" },
      { label: "Revision-Jahr", info: "Merke dir: In welchem Jahr wurde das Allgemeine Landrecht veröffentlicht (Revision)?", answer: "1794" },
      { label: "Müller-Arnold", info: "Wie hieß der berühmte Fall im Text? Antworte genau mit: Müller …", answer: "Müllers Arnold" }
    ],
    npcName: "Kanzlei",
    unlockGateId: "gateEnd"
  }
];
