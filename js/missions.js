export const MISSIONS = [
  {
    id: 0,
    title: "Kapitel 1: Kronprinz & Konflikt",
    info: [
      "Friedrich II (1712–1786) wuchs am preußischen Hof unter strenger Militärdisziplin auf.",
      "Sein Vater (Friedrich Wilhelm I.) wollte einen „Soldatenkönig“-Stil – Friedrich interessierte sich stärker für Musik/Philosophie.",
      "Das prägte später seinen Regierungsstil: militärisch effektiv, aber auch aufklärerisch interessiert."
    ],
    quiz: {
      q: "Was beschreibt den Konflikt in Friedrichs Jugend am besten?",
      options: [
        "Er wollte Seefahrer werden, sein Vater verbot das.",
        "Er hatte andere Interessen (Kunst/Philosophie) als die strenge Militärlinie seines Vaters.",
        "Er wollte nur Bauer sein und verließ Berlin.",
        "Er lebte nie am Hof, sondern im Ausland."
      ],
      correctIndex: 1
    },
    unlockGateId: "gate1",
    npcHint: "Sprich mit der Station „Hof“ (E)."
  },
  {
    id: 1,
    title: "Kapitel 2: Schlesien & Machtpolitik",
    info: [
      "Als König nutzte Friedrich Chancen, um Preußens Macht auszubauen.",
      "Schlesien war wirtschaftlich wichtig (Bevölkerung, Ressourcen, Steuern).",
      "Politik + Militär gingen bei ihm oft Hand in Hand."
    ],
    quiz: {
      q: "Warum war Schlesien für Preußen besonders attraktiv?",
      options: [
        "Weil dort die Hauptstadt Wien liegt.",
        "Weil es wirtschaftlich und demografisch wichtig war.",
        "Weil es nur aus Wüste bestand.",
        "Weil es völlig unbewohnt war."
      ],
      correctIndex: 1
    },
    unlockGateId: "gate2",
    npcHint: "Station „Schlesien“ (E)."
  },
  {
    id: 2,
    title: "Kapitel 3: Sanssouci & Aufklärung",
    info: [
      "Friedrich förderte Kultur und diskutierte mit Denkern der Aufklärung.",
      "Sanssouci (Potsdam) steht als Symbol für seine Rolle als „Philosophenkönig“.",
      "Er nutzte Ideen der Aufklärung, solange sie dem Staat nützten."
    ],
    quiz: {
      q: "Wofür steht Sanssouci im Zusammenhang mit Friedrich II?",
      options: [
        "Für seine Seeflotte.",
        "Für seine Kultur-/Aufklärungsrolle und Hofkultur.",
        "Für einen Bergbaukonzern.",
        "Für seine Erfindung des Buchdrucks."
      ],
      correctIndex: 1
    },
    unlockGateId: "gate3",
    npcHint: "Station „Sanssouci“ (E)."
  },
  {
    id: 3,
    title: "Kapitel 4: Siebenjähriger Krieg",
    info: [
      "Der Siebenjährige Krieg zeigte Preußens Verwundbarkeit – aber auch Friedrichs Durchhaltewillen.",
      "Er setzte auf schnelle Entscheidungen und Mobilität.",
      "Am Ende blieb Preußen eine europäische Großmacht."
    ],
    quiz: {
      q: "Was passt am besten zum Siebenjährigen Krieg aus preußischer Sicht?",
      options: [
        "Preußen war nie bedroht.",
        "Es war eine harte Krise, aber Preußen behauptete sich als Großmacht.",
        "Es war ein Sportturnier.",
        "Er fand ausschließlich in Amerika statt."
      ],
      correctIndex: 1
    },
    unlockGateId: "gate4",
    npcHint: "Station „Krieg“ (E)."
  },
  {
    id: 4,
    title: "Kapitel 5: Reformen & Verwaltung",
    info: [
      "Friedrich reformierte Verwaltung und Justiz, um den Staat effizienter zu machen.",
      "Religionspolitik: vergleichsweise tolerant (v. a. aus Staatsnutzen).",
      "Ein starker, gut organisierter Staat war sein Kernziel."
    ],
    quiz: {
      q: "Welches Ziel passt zu Friedrichs Reformpolitik?",
      options: [
        "Ein effizienter, gut organisierter Staat.",
        "Ein Staat ohne Verwaltung und Gesetze.",
        "Nur Theaterstücke finanzieren, sonst nichts.",
        "Abschaffung aller Schulen."
      ],
      correctIndex: 0
    },
    unlockGateId: "gate5",
    npcHint: "Station „Reformen“ (E)."
  },
  {
    id: 5,
    title: "Kapitel 6: Kartoffeln & Versorgung",
    info: [
      "Friedrich förderte Anbau/Versorgung, u. a. Kartoffeln (damals nicht überall beliebt).",
      "Stabile Ernährung stärkte Bevölkerung, Armee und Wirtschaft.",
      "Politik heißt auch: Krisen vorbeugen."
    ],
    quiz: {
      q: "Warum war die Förderung von Kartoffeln (und Landwirtschaft) politisch sinnvoll?",
      options: [
        "Weil Kartoffeln Gold enthalten.",
        "Weil bessere Versorgung Krisen verhindert und den Staat stärkt.",
        "Weil Kartoffeln nur Deko sind.",
        "Weil niemand essen musste."
      ],
      correctIndex: 1
    },
    unlockGateId: "gateEnd",
    npcHint: "Station „Versorgung“ (E)."
  }
];
