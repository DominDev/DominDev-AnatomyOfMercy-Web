import fs from "node:fs";
import path from "node:path";
import { narrationFor } from "../../scripts/narration-clips.mjs";

// Tresc interaktywnego dylematu "Swiatlo pod popiolem" (/pl/dylemat/), Faza 0,
// ryzyko R-020. Jedno zrodlo: szablon osadza ten obiekt jako JSON, a skrypt
// dylemat.js prowadzi po nim gracza. Fakty sa te same co w notatce Docs
// "04 Vertical Slice - Proba dylematu - Zestaw do sesji" i w scenariuszu
// "Swiatlo pod popiolem"; tutaj opowiedziane literacko, w drugiej osobie, dla
// kogos, kto nie zna swiata ani bohaterow. Zmiana faktu wymaga zmiany w Docs.
//
// Tekst scen jest odslaniany zdanie po zdaniu, wiec <strong> i <em> nie moga
// obejmowac dwoch zdan naraz. <strong> to fragmenty niosace dramaturgie; przed
// zdaniem z nim narracja robi krotka pauze.
//
// Wersja trafia do kazdego zapisanego wyniku i do statystyk, zeby nie mieszac
// odpowiedzi do roznych tresci.
const version = "2.1";

const exists = (publicPath) => fs.existsSync(path.resolve("src/static" + publicPath));

// Obraz docelowy z /assets/images/dylemat/, a do czasu jego wygenerowania
// zamiennik z istniejacych grafik strony. Podmiana nie wymaga zmiany kodu.
const art = (name, fallback) => {
  const own = `/assets/images/dylemat/${name}.webp`;
  return exists(own) ? own : fallback;
};

const audio = (name) => {
  const file = `/assets/audio/${name}.mp3`;
  return exists(file) ? file : null;
};

// Nagrania lektora: tylko te, ktorych plik istnieje i ktorych odcisk tekstu
// zgadza sie z obecna trescia (scripts/narration-clips.mjs). Ten plik ma
// wylacznie eksport domyslny: Eleventy przy nazwanych eksportach przekazuje
// caly modul ({ default }), a wtedy strona nie dostaje tresci.
// Kto jest na ktorej grafice: Julian to postac w ptasiej masce z latarnia
// (grafika hero), Veyr to inkwizytor w bialej porcelanowej masce (winieta 1 i
// portret dylematu). Nie zamieniac.
const img = {
  title: art("tytul", "/assets/images/hero/vespera-doctor-1100.webp"),
  lucja: "/assets/images/mood/scene-2.webp",
  cordon: "/assets/images/mood/scene-4.webp",
  julian: "/assets/images/hero/vespera-doctor-1100.webp",
  agata: "/assets/images/mood/scene-3.webp",
  tomasz: art("tomasz", "/assets/images/stories/the-volunteer.webp"),
  veyr: art("veyr", "/assets/images/mood/scene-1.webp"),
  seweryn: art("seweryn", "/assets/images/world/plague.webp"),
  way: art("droga", "/assets/images/world/vespera.webp"),
  road: art("brama", "/assets/images/world/city.webp"),
  decision: art("decyzja", "/assets/images/world/plague.webp"),
  ask: art("lucja", "/assets/images/mood/scene-2.webp"),
  refuse: art("sprzeciw", art("lucja", "/assets/images/mood/scene-2.webp")),
  endStab: art("skutek-stabilizacja", "/assets/images/mood/scene-3.webp"),
  endWasted: art("skutek-zmarnowane", art("skutek-stabilizacja", "/assets/images/mood/scene-3.webp")),
  endTomasz: art("skutek-tomasz", art("tomasz", "/assets/images/stories/the-volunteer.webp")),
  endVeyr: art("skutek-veyr-zywy", art("veyr", "/assets/images/mood/scene-1.webp")),
  endDeputy: art("skutek-veyr-zabity", "/assets/images/world/church.webp"),
  endSeweryn: art("skutek-seweryn", art("seweryn", "/assets/images/world/plague.webp"))
};

const content = {
  version,
  audio: { intro: audio("dylemat-intro"), ambient: audio("dylemat-ambient") },

  opening: {
    image: img.title,
    lines: [
      "Vespera. Miasto zamknięte kordonami.",
      "Popiół pada na dachy jak brudny śnieg.",
      "W kaplicy zamienionej w lazaret dziewczynka nie może zaczerpnąć tchu.",
      "Tylko ty potrafisz ją wyleczyć.",
      "Tylko że lekarstwo trzeba komuś odebrać."
    ],
    kicker: "Anatomy of Mercy",
    title: "Światło pod popiołem",
    slogan: "Every cure leaves a scar.",
    skip: "Pomiń"
  },

  welcome: {
    lead: "Za chwilę podejmiesz decyzję, której nie da się podjąć dobrze. Nie ma tu właściwej odpowiedzi ani testu wiedzy. Chcemy wiedzieć, co zrobisz i dlaczego.",
    notes: [
      "Około 15 minut. Najlepiej w słuchawkach.",
      "Temat jest trudny: choroba dziecka, okaleczenie i przemoc. Możesz przerwać w każdej chwili.",
      "Odpowiedzi są anonimowe. Zapisujemy twoje wybory, czas spędzony na scenach i odpowiedzi z końcowych pytań. Bez imion, adresów e-mail, adresów IP i ciasteczek. Kontakt: contact@anatomyofmercy.com."
    ],
    soundOn: "Z dźwiękiem",
    withVoice: "Z lektorem i muzyką",
    musicOnly: "Tylko muzyka",
    soundOff: "Bez dźwięku",
    start: "Wejdź do lazaretu",
    practice: "Twoje pierwsze odpowiedzi są już zapisane. Możesz przejść tę drogę jeszcze raz; zapiszemy ją jako powtórkę."
  },

  chapterWord: "Rozdział",
  hint: "Ikona i przypomina, co oznacza dana odpowiedź. Wybierać możesz też klawiszami z numerami.",
  skipHint: "Kliknij albo naciśnij spację, żeby odsłonić całość.",

  chapters: {
    I: "Lazaret",
    II: "Cztery drogi",
    III: "Wybór",
    IV: "Kordon",
    V: "Łucja",
    VI: "Blizna"
  },

  scenes: [
    {
      id: "A", chapter: "I", title: "Łucja", image: img.lucja,
      text: [
        "Kaplica dawno przestała być kaplicą. Pod ołtarzem stoi stół, któremu brakuje nogi, więc ktoś podparł blat cegłami.",
        "Leży na nim Łucja, dziewczynka z żółtą nitką wplecioną w warkocz. Oddycha płytko, jakby coś pod koszulą nie pozwalało jej żebrom się rozsunąć.",
        "Stukasz cienkim prętem w jej mostek. Zamiast żywej kości odpowiada ci krótki, suchy dźwięk, jak od szkła.",
        "Ludzie nazywają tę chorobę Karmazynowym Pomorem. Ty mówisz na nią krystalica krwi, bo widziałeś, co robi z ciałem. <strong>W kościach i szpiku Łucji rosną kryształy.</strong> Są jeszcze małe, ale rosną szybko i bolą.",
        "Łucja łapie cię za rękaw. <strong>„Nie chcę, żeby ktoś umarł przeze mnie.”</strong> Mówi to o wszystkich. Nawet o tych, których nie lubi.",
        "Zapamiętaj te słowa. Łucja przyjmie dar tylko od kogoś, kto sam go ofiaruje i wie, ile go to będzie kosztować. <strong>Na nic, co zdobyto siłą albo czyjąś śmiercią, się nie zgodzi.</strong>"
      ]
    },
    {
      id: "B", chapter: "I", title: "Kordon", image: img.cordon,
      text: [
        "Za drzwiami lazaretu zaczyna się kordon. Inkwizycja, zbrojne ramię Kościoła Światła, zamknęła dzielnicę drewnianymi zaporami. Przy bramach stoją strażnicy w białych maskach.",
        "Zaraza żyje w pyle i w chorej tkance. Dlatego strażnicy przeszukują każdego, kto przechodzi przez bramę, i <strong>palą każdą tkankę wynoszoną ze strefy.</strong> Nie odróżnią zdrowej od chorej i nie mają prawa robić wyjątków, więc spłonie także dar od zdrowego dawcy.",
        "Nie robią tego z okrucieństwa. Widzieli, co się stało, kiedy kiedyś wypuszczono chorych. Zaraza poszła za nimi na kolejne ulice.",
        "Kordon chroni miasto. <strong>I odcina Łucję od wszystkiego, co mogłoby ją wyleczyć.</strong> To leży po drugiej stronie."
      ]
    },
    {
      id: "C", chapter: "I", title: "Ty", image: img.julian, focus: "80% 40%",
      text: [
        "Jesteś Julianem, lekarzem wyklętym przez Kościół za wiedzę, której ten nie uznaje. Nosisz maskę z dziobem, woskowany płaszcz i rękawice. Odsuwają od ciebie zarazę, ale jej nie zatrzymają. <strong>Nie jesteś odporny.</strong>",
        "Siostra Agata z Zakonu Latarni prowadzi ten lazaret. Wezwała cię nocą, potajemnie, bo sama nie potrafi Łucji wyleczyć.",
        "Nie ufa twoim metodom. <strong>Potrzebuje ich.</strong>",
        "Wiesz, jak zastąpić chorą kość i szpik zdrowymi. Ale zdrowa tkanka nie bierze się znikąd. <strong>Musi pochodzić od drugiego człowieka.</strong>",
        "Każdy dzień zwłoki to więcej kryształu w jej kościach. Dziś zdecydujesz, od kogo."
      ]
    },
    {
      id: "D", chapter: "II", tag: "Droga pierwsza", title: "Siostra Agata", image: img.agata,
      text: [
        "Agata zna kościelną metodę. Nie wyleczy nią Łucji, ale może ją uratować przed tym, co najgorsze. Dziewczynka przeżyje kryzys, a ból zelżeje.",
        "Choroba jednak zostanie w jej kościach, a po kościelnej metodzie drugiej próby leczenia już nie będzie. Łucja trafi do kościelnej izolacji, za płótno, do sali, w której nikt nie obiecuje jutra.",
        "<strong>Nikt inny nie zapłaci.</strong> <strong>Tylko ona.</strong>"
      ]
    },
    {
      id: "E", chapter: "II", tag: "Droga druga", title: "Brat Tomasz", image: img.tomasz,
      text: [
        "Brat Tomasz jest wujem Łucji. Siedzi w progu aneksu za kordonem, z kijem na kolanach. Za nim śpią dzieci, które przygarnął. Jest ich jedynym obrońcą.",
        "Kiedy słyszy, czego potrzebujesz, nie waha się ani chwili. Sam zgłasza się na dawcę. Jego tkanka nie pasuje do Łucji idealnie, ale wystarczy.",
        "Pobierzesz fragment kości z jego miednicy i wyleczysz Łucję. <strong>Ale Tomasz już nigdy nie będzie chodził jak dawniej.</strong>",
        "A kiedy Inkwizycja zacznie palić zarażone domy, <strong>nie wyprowadzi sam tych dzieci.</strong>"
      ]
    },
    {
      id: "F", chapter: "II", tag: "Droga trzecia", title: "Kapitan Veyr", image: img.veyr,
      text: [
        "Kapitan Veyr dowodzi kordonem. Przed laty sam przeżył tę chorobę i dlatego jego tkanka pasuje do Łucji lepiej niż czyjakolwiek.",
        "Ma rozkaz spalić zarażone ulice. Wykonuje go, bo kiedyś widział, jak ktoś zrobił to w pośpiechu. Ogień rozniósł pył i <strong>zginęła cała ulica.</strong>",
        "Od tamtej pory Veyr pali powoli, dom po domu, i najpierw każe wyprowadzić zdrowych. Trzyma też w ryzach swojego zastępcę, który chciałby palić od razu.",
        "Dlatego odmawia ci swojej tkanki. Po pobraniu nie byłby już sprawny, a gdyby zginął, dowodzenie przejąłby zastępca. <strong>Veyr wierzy, że bez niego zginie więcej ludzi.</strong> Może mieć rację.",
        "Wbrew jego woli możesz tylko jedno: obezwładnić go i pobrać tkankę siłą. Przeżyje, ale okaleczony. <strong>Możesz go też zabić i pobrać ją z ciała.</strong>"
      ]
    },
    {
      id: "G", chapter: "II", tag: "Droga czwarta", title: "Brat Seweryn", image: img.seweryn,
      text: [
        "Pod starą kaplicą za kordonem jest piwnica. Ktoś w niej oddycha.",
        "To brat Seweryn, dawny nauczyciel Agaty. Kryształ, który porasta mury piwnicy, porósł także jego. Seweryn zrósł się z nim w jedno. Nie walczy. Odpowiada na głosy.",
        "<strong>To z niego sączy się zakaźny pył,</strong> który niesie zarazę po dzielnicy.",
        "Przy życiu trzyma go kryształowy rdzeń. Rdzeń rezonuje: chore dzieci w lazarecie słyszą go nocą przez posadzkę jak niski dźwięk. Jeśli go wytniesz, przygotujesz z niego eksperymentalną terapię. Może wyleczyć Łucję, ale zostawi w niej trwały ślad, którego nikt nie potrafi przewidzieć, i może związać ją z tym dźwiękiem. <strong>Seweryn umrze.</strong>",
        "Rdzeń można też związać i spalić. Seweryn umarłby tak samo, ale pył przestałby się sączyć i dzielnica byłaby bezpieczna. <strong>Tyle że dla Łucji nie zostałoby wtedy nic.</strong>"
      ]
    },
    {
      id: "H", chapter: "II", tag: "Droga powrotna", title: "Brama", image: img.way,
      text: [
        "Aneks Tomasza, posterunek Veyra i piwnica Seweryna leżą po drugiej stronie kordonu. Cokolwiek tam weźmiesz, musisz potem przenieść przez bramę, przy której strażnicy palą wynoszoną tkankę.",
        "Przy bramie będziesz mógł oddać materiał, przemknąć obok strażników albo przebić się siłą.",
        "Materiału od jednego dawcy wystarczy na jedno leczenie. <strong>Drugiej próby nie będzie.</strong>"
      ]
    }
  ],

  // Kwestie wyboru brzmia jak dialog albo decyzja Juliana i mowia wprost, kogo
  // dotycza. "info" to krotkie przypomnienie ceny z kart, bez ujawniania kart
  // konsekwencji.
  decision: {
    chapter: "III", title: "Którą drogą leczysz Łucję?", image: img.decision,
    text: [
      "Wracasz do kaplicy. Agata stoi przy drzwiach i o nic nie pyta. Łucja śpi niespokojnie, z dłonią zaciśniętą na brzegu koca.",
      "Masz jedną szansę. <strong>Cokolwiek wybierzesz, ktoś za to zapłaci.</strong>"
    ],
    options: [
      { value: "stabilizacja", label: "„Zostańmy przy metodzie siostry Agaty.”",
        info: "Łucja przeżyje, ale zostanie chora i w izolacji, bez drugiej próby leczenia. Nikt inny nie zapłaci." },
      { value: "tomasz", label: "„Przyjmę dar brata Tomasza.”",
        info: "Łucja wyzdrowieje. Tomasz zostanie kaleką, a dzieci z aneksu stracą jedynego obrońcę." },
      { value: "veyr_zywy", label: "„Obezwładnię Veyra i pobiorę tkankę siłą. Kapitan przeżyje.”",
        info: "Łucja wyzdrowieje. Okaleczony Veyr nie poprowadzi ewakuacji zdrowych. Łucja nie chciała niczego zdobytego przymusem." },
      { value: "veyr_zabity", label: "„Zabiję Veyra i pobiorę tkankę z jego ciała.”",
        info: "Łucja wyzdrowieje. Dowodzenie przejmie zastępca, który pali od razu. Łucja nie chciała niczyjej śmierci." },
      { value: "seweryn", label: "„Zejdę do piwnicy i wytnę rdzeń Seweryna.”",
        info: "Eksperyment może wyleczyć Łucję, ale zostawi w niej trwały ślad i może związać ją z rezonansem rdzenia. Seweryn umrze, a piwnica dalej będzie źródłem pyłu." }
    ]
  },

  difficulty: {
    question: "Jak trudna była ta decyzja?",
    low: "Oczywista",
    high: "Bardzo trudna"
  },

  returnChoice: {
    chapter: "IV", title: "Brama", image: img.road,
    text: [
      "Wracasz nocą z zawiniątkiem pod płaszczem. Zaułek kończy się bramą kordonu.",
      "Przy latarniach stoi dwóch strażników w białych maskach. Jeden kaszle w rękaw. Drugi przegląda wózek z rzeczami, które ktoś próbował wynieść, i bez słowa wrzuca je do ognia.",
      "<strong>Wiesz, co zrobią z tym, co niesiesz.</strong> I wiesz, że mają powód. Każdy strzęp chorej tkanki, który przejdzie przez bramę, może zanieść zarazę dalej.",
      "Pod murem stoją beczki i rzucają długi cień. Pod płaszczem czujesz ciężar noża."
    ],
    options: [
      { value: "oddanie", label: "Wychodzę z cienia i oddaję zawiniątko strażnikom.",
        info: "Nikogo nie skrzywdzisz i nie złamiesz rozkazu, który chroni miasto. Ale materiał spłonie, cena zapłacona przez dawcę pójdzie na marne, a Łucji zostanie tylko stabilizacja." },
      { value: "przemkniecie", label: "Czekam, aż się odwrócą, i przemykam za beczkami.",
        info: "Ryzykujesz, że cię zauważą. Jeśli się uda, nikt nie ucierpi, ale wniesiesz za kordon to, co miasto pali dla własnego bezpieczeństwa, i nikt się o tym nie dowie." },
      { value: "przebicie", label: "Wyciągam nóż i przechodzę siłą.",
        info: "Przejdziesz na pewno. Ale strażnicy, którzy wykonują rozkaz chroniący miasto, zostaną ranni albo zginą." }
    ]
  },

  lucja: {
    chapter: "V", title: "„Skąd to jest?”", image: img.ask,
    text: [
      "Agata zapaliła wszystkie świece, jakie zostały. Rozkładasz narzędzia na czystym płótnie, kiedy Łucja otwiera oczy.",
      "Patrzy na zawiniątko. Potem na twoje ręce. Potem na ciebie.",
      "<strong>„Skąd to jest?”</strong> pyta cicho. „Pamiętasz, co ci mówiłam?”",
      "Pamiętasz. <em>Nie chcę, żeby ktoś umarł przeze mnie.</em>"
    ],
    // Stawka rozmowy zalezy od drogi: przy darze Tomasza prawda nie wywola
    // sprzeciwu, przy pozostalych moze.
    stakes: {
      tomasz: "Jeśli powiesz prawdę, będzie wiedziała, ile kosztuje jej zdrowie. Jeśli skłamiesz, oszczędzisz jej tego ciężaru. <strong>Na razie.</strong>",
      veyr_zywy: "Jeśli powiesz prawdę, może odmówić leczenia. <strong>Jeśli skłamiesz, wyzdrowieje dzięki czemuś, na co nigdy by się nie zgodziła.</strong>",
      veyr_zabity: "Jeśli powiesz prawdę, może odmówić leczenia. <strong>Jeśli skłamiesz, wyzdrowieje dzięki czyjejś śmierci i nawet o tym nie będzie wiedziała.</strong>",
      seweryn: "Jeśli powiesz prawdę, może odmówić leczenia. <strong>Jeśli skłamiesz, wyzdrowieje dzięki czyjejś śmierci i nawet o tym nie będzie wiedziała.</strong>"
    },
    truth: {
      tomasz: "„Od twojego wuja. Sam chciał. Wiedział, że już nigdy nie będzie chodził jak dawniej.”",
      veyr_zywy: "„Od kapitana Veyra. Nie chciał oddać, więc wziąłem siłą.”",
      veyr_zabity: "„Od kapitana Veyra. Musiałem go zabić.”",
      seweryn: "„Od brata Seweryna z piwnicy. Żeby to zdobyć, musiał umrzeć.”"
    },
    truthInfo: "Łucja pozna całą prawdę. Wtedy to ona zdecyduje.",
    lie: "„Nie myśl o tym. Ważne, że wyzdrowiejesz.”",
    lieInfo: "Łucja wyzdrowieje, nie wiedząc, skąd pochodzi lekarstwo. Ty będziesz wiedział."
  },

  objection: {
    chapter: "V", title: "Sprzeciw", image: img.refuse,
    text: {
      veyr_zywy: "Łucja odsuwa twoją rękę. <strong>„Mówiłam ci.</strong> <strong>Nie chcę niczego, co komuś zabrano siłą.”</strong> Głos jej drży, ale się nie łamie. „Nie rób tego. Proszę.”",
      veyr_zabity: "Łucja zaciska palce na twoim rękawie, aż bieleją jej knykcie. <strong>„Mówiłam ci.</strong> <strong>Nie chcę, żeby ktoś umarł przeze mnie.”</strong> Odwraca głowę do ściany. „A on umarł.”",
      seweryn: "Łucja długo milczy. „Mogę zaryzykować siebie. Ten ślad, o którym mówisz.” Patrzy na ciebie. <strong>„Ale nie chciałam, żeby on umierał dla mnie.”</strong>"
    },
    close: "Materiał leży na stole. Wystarczy, że po niego sięgniesz.",
    options: [
      { value: "mimo_sprzeciwu", label: "„Wybacz mi. Zrobię to mimo wszystko.”",
        info: "Wyleczysz ją wbrew jej woli. Będzie wiedziała, że ją słyszałeś i nie posłuchałeś." },
      { value: "rezygnacja", label: "„Dobrze. Nie zrobię tego.”",
        info: "Uszanujesz jej odmowę. Zostanie stabilizacja, a cena zapłacona przez dawcę pójdzie na marne." }
    ]
  },

  consequences: {
    stabilizacja: {
      title: "Łucja żyje", image: img.endStab,
      text: [
        "Oddycha płyciej niż inne dzieci, ale oddycha. Ból zelżał. Choroba została w jej kościach.",
        "O świcie siostry przenoszą ją za płótno izolacji. Łucja słabo macha ci ręką. Drzwi zamykają się za nią ciężko.",
        "Chory chłopiec z sąsiedniego łóżka obraca w palcach guzik, który kiedyś jej przyniósł. Pyta cicho: <strong>„Nie wziąłeś od nikogo.</strong> <strong>Zrobiłeś to dla niej czy dla siebie?”</strong>"
      ],
      // Ostatni akapit, gdy ktos juz zaplacil, a material nie zostal uzyty
      // (oddanie przy bramie albo uszanowana odmowa Lucji); mowi, kto zaplacil.
      wastedImage: img.endWasted,
      wasted: {
        tomasz: "Agata długo patrzy na puste płótno, na którym miał leżeć materiał. Nic nie mówi. Tomasz już nigdy nie będzie chodził jak dawniej, a dzieci z aneksu straciły obrońcę. <strong>Łucja i tak została chora.</strong>",
        veyr_zywy: "Agata długo patrzy na puste płótno, na którym miał leżeć materiał. Nic nie mówi. Okaleczony Veyr nie poprowadzi już ewakuacji zdrowych. <strong>Łucja i tak została chora.</strong>",
        veyr_zabity: "Agata długo patrzy na puste płótno, na którym miał leżeć materiał. Nic nie mówi. Veyr nie żyje, a jego pieczęć przejął zastępca. <strong>Łucja i tak została chora.</strong>",
        seweryn: "Agata długo patrzy na puste płótno, na którym miał leżeć materiał. Nic nie mówi. Seweryn nie żyje, a odłamki jego kryształu dalej pylą w piwnicy. <strong>Łucja i tak została chora.</strong>"
      }
    },
    tomasz: {
      title: "Dar wuja", image: img.endTomasz,
      text: [
        "Łucja schodzi ze stołu o własnych siłach. Jej wuj nie.",
        "Tomasz uczy się chodzić o kiju, który dotąd trzymał na kolanach. Jedno biodro ma teraz niżej niż drugie.",
        "Prosi cię tylko o jedno: <strong>„Kiedy przyjdzie ogień, wyprowadź je za mnie.”</strong> Obiecujesz. Od tej chwili dzieci z aneksu patrzą na ciebie, nie na niego.",
        "<strong>Obietnica nie gasi ognia.</strong> <strong>Tylko go odsuwa.</strong>"
      ]
    },
    veyr_zywy: {
      title: "Pieczęć", image: img.endVeyr,
      text: [
        "Łucja jest zdrowa.",
        "Kapitan Veyr siedzi na posterunku z nogą sztywno wyprostowaną. Podpisuje wstrzymanie ognia ręką, która drży. Ewakuacji zdrowych już nie poprowadzi.",
        "Kiedy wychodzisz, nie podnosi wzroku. <strong>Nie wybacza ci.</strong>"
      ]
    },
    veyr_zabity: {
      title: "Zastępca", image: img.endDeputy,
      text: [
        "Łucja jest zdrowa.",
        "Pieczęć Veyra przejmuje jego zastępca. To człowiek, który nie sprawdza, kto jeszcze żyje za drzwiami. Ma rozkaz i listę ulic.",
        "Rano pod domy toczą beczki żywicy. <strong>Na wyprowadzenie zdrowych nie ma już czasu.</strong>"
      ]
    },
    seweryn: {
      title: "Rezonans", image: img.endSeweryn,
      text: [
        "Kryształy w kościach Łucji przestają rosnąć. Gorączka spada.",
        "Ale nocą dziewczynka siada na łóżku i nasłuchuje. Słyszy to samo co chore dzieci: niski dźwięk spod posadzki, jakby ktoś powtarzał jej imię. <strong>Choroba w niej nie zniknęła.</strong> <strong>Zmieniła się.</strong> Łucja może stać się jej nowym źródłem.",
        "Seweryn nie żyje. Ale wycinając rdzeń, rozbiłeś kryształ, z którym był zrośnięty. Jego odłamki zostały w szczelinach piwnicy i wciąż żyją. <strong>Dalej sączą pył, który niesie zarazę po dzielnicy.</strong>",
        "Spalić dało się tylko cały rdzeń. Ten zabrałeś dla Łucji."
      ]
    }
  },

  // Dopiski zalezne od dalszych wyborow, doklejane do konsekwencji.
  notes: {
    zatajenie: "Łucja nie wie, skąd pochodzi lekarstwo. Ty wiesz.",
    zatajenie_tomasz: "Ukryłeś przed Łucją cenę, którą zapłacił jej wuj. Kiedy Agata pozna prawdę, przestanie ci pomagać.",
    zatajenie_przymus: "Kiedyś Łucja pozna prawdę. Wtedy sprzeciwi się temu, co zrobiłeś w jej imieniu.",
    prawda_tomasz: "Łucja zna cenę. Ściska dłoń wuja i przyjmuje jego dar.",
    mimo_sprzeciwu: "Leczyłeś ją wbrew jej woli. Zasnęła z twoim „wybacz” w uszach.",
    rezygnacja_veyr_zywy: "Uszanowałeś jej odmowę. Veyr już zapłacił swoją cenę, a jego tkanka nie została użyta.",
    rezygnacja_veyr_zabity: "Uszanowałeś jej odmowę. Veyr nie żyje, a jego tkanka nie została użyta.",
    rezygnacja_seweryn: "Uszanowałeś jej odmowę. Seweryn nie żyje, a rdzeń nie został użyty.",
    oddanie: "Oddałeś zawiniątko strażnikom. Spłonęło przy bramie.",
    przemkniecie: "Przemknąłeś obok strażników. Dalej wierzą, że przez ich bramę nic nie przechodzi. Ty wiesz, że to nieprawda.",
    przebicie: "Przebiłeś się siłą. Strażnicy zostali na placu, ranni albo martwi, a ludzie, których chronili, stracili osłonę. Zaraza nie przestała być prawdziwa."
  },

  // Kronika na koncu: jedno zdanie na kazdy wybor i jego trudnosc.
  chronicle: {
    path: {
      stabilizacja: "Zostałeś przy metodzie Agaty.",
      tomasz: "Przyjąłeś dar Tomasza.",
      veyr_zywy: "Obezwładniłeś Veyra i wziąłeś siłą.",
      veyr_zabity: "Zabiłeś Veyra.",
      seweryn: "Wyciąłeś rdzeń Seweryna."
    },
    returnMode: {
      oddanie: "Oddałeś materiał strażnikom.",
      przemkniecie: "Przemknąłeś obok strażników.",
      przebicie: "Przebiłeś się przez kordon."
    },
    lucja: { prawda: "Powiedziałeś Łucji prawdę.", zatajenie: "Ukryłeś przed Łucją prawdę." },
    objection: { mimo_sprzeciwu: "Leczyłeś mimo jej sprzeciwu.", rezygnacja: "Uszanowałeś jej odmowę." },
    difficulty: "trudność {n} z 5"
  },

  questions: {
    chapter: "VI", title: "Zanim odejdziesz",
    lead: "Kilka szybkich pytań. Każde jest opcjonalne.",
    value: {
      label: "Co było dla ciebie najważniejsze?",
      options: [
        ["zycie_lucji", "Życie i zdrowie Łucji"],
        ["wola_lucji", "Wola Łucji"],
        ["miasto", "Ludzie, których chroni kordon"],
        ["dzieci", "Dzieci z aneksu"],
        ["nikogo_wiecej", "Nie skrzywdzić nikogo więcej"],
        ["prawda", "Prawda"],
        ["inne", "Coś innego"]
      ]
    },
    paid: { label: "Kto zapłacił cenę twojej decyzji?", hint: "Własnymi słowami, nawet jednym wyrazem." },
    veyr: { label: "Na ile rozumiesz racje Veyra i kordonu?", low: "Wcale", high: "W pełni" },
    more: { label: "Chcesz wiedzieć, co było dalej?", options: [["tak", "Tak"], ["nie", "Nie"]], who: "Z kim?", whoOptions: [
      ["lucja", "Łucja"], ["tomasz", "Tomasz"], ["veyr", "Veyr"], ["agata", "Agata"],
      ["seweryn", "Seweryn"], ["dzieci", "Dzieci z aneksu"], ["julian", "Julian"]
    ] },
    clarity: { label: "Jak zrozumiałe było to, co czytałeś?", low: "Niejasne", high: "Całkiem jasne" },
    comment: { label: "Coś było niejasne albo chcesz coś dodać?" },
    age: { label: "Wiek", options: ["poniżej 18", "18-24", "25-34", "35-44", "45-54", "55 i więcej"] },
    games: { label: "Grasz w gry fabularne?", options: ["tak, często", "czasem", "rzadko albo wcale"] },
    submit: "Zakończ"
  },

  end: {
    title: "Twoja ścieżka",
    slogan: "Every cure leaves a scar.",
    others: "Jak wybrali inni",
    pathNames: {
      stabilizacja: "Metoda Agaty",
      tomasz: "Dar Tomasza",
      veyr_zywy: "Veyr, siłą",
      veyr_zabity: "Śmierć Veyra",
      seweryn: "Rdzeń Seweryna"
    },
    yours: "twój wybór",
    count: "Na podstawie {n} odpowiedzi.",
    avgDifficulty: "Średnia trudność pierwszej decyzji: {d} z 5.",
    truthShare: "{p}% osób, które wróciły do Łucji, powiedziało jej prawdę.",
    loading: "Wczytuję wyniki...",
    first: "Jesteś jedną z pierwszych osób, które przeszły tę próbę. Wyniki innych pokażemy, gdy będzie ich więcej.",
    thanks: "Dziękujemy. Prosimy, nie zdradzaj szczegółów osobom, którym przekażesz link.",
    // Ekran konca pojawia sie dopiero po zapisie wyniku, wiec napis nie moze
    // sugerowac, ze cokolwiek przepadlo. Kolejne przejscie tez sie zapisuje,
    // jako powtorka (notka na bramie przy ponownym wejsciu).
    again: "Wypełnij ponownie",
    home: "Poznaj Anatomy of Mercy",
    homeUrl: "/pl/"
  }
};

const narration = narrationFor(content);
content.narration = narration.clips ? { clips: narration.clips } : null;

export default content;
