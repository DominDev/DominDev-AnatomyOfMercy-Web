import fs from "node:fs";
import path from "node:path";

// Tresc interaktywnego dylematu "Swiatlo pod popiolem" (/pl/dylemat/), Faza 0,
// ryzyko R-020. Jedno zrodlo: szablon osadza ten obiekt jako JSON, a skrypt
// dylemat.js prowadzi po nim gracza. Fakty sa te same co w notatce Docs
// "04 Vertical Slice - Proba dylematu - Zestaw do sesji"; tutaj opowiedziane
// literacko, w drugiej osobie, jak w grze. Zmiana faktu wymaga zmiany w obu.
//
// Wersja trafia do kazdego zapisanego wyniku i do statystyk, zeby nie mieszac
// odpowiedzi do roznych tresci.
const version = "2.0";

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

const img = {
  title: art("tytul", "/assets/images/hero/vespera-doctor-1100.webp"),
  lucja: "/assets/images/mood/scene-2.webp",
  cordon: "/assets/images/mood/scene-4.webp",
  julian: "/assets/images/mood/scene-1.webp",
  agata: "/assets/images/mood/scene-3.webp",
  tomasz: art("tomasz", "/assets/images/stories/the-volunteer.webp"),
  veyr: art("veyr", "/assets/images/world/church.webp"),
  seweryn: art("seweryn", "/assets/images/world/plague.webp"),
  road: art("powrot", "/assets/images/world/city.webp"),
  decision: art("decyzja", "/assets/images/world/plague.webp"),
  ask: art("lucja", "/assets/images/mood/scene-2.webp"),
  endStab: art("skutek-stabilizacja", "/assets/images/mood/scene-3.webp"),
  endTomasz: art("skutek-tomasz", art("tomasz", "/assets/images/stories/the-volunteer.webp")),
  endVeyr: art("skutek-veyr-zywy", art("veyr", "/assets/images/world/church.webp")),
  endDeputy: art("skutek-veyr-zabity", "/assets/images/world/vespera.webp"),
  endSeweryn: art("skutek-seweryn", art("seweryn", "/assets/images/world/plague.webp"))
};

export default {
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
      "Około 10 minut. Najlepiej w słuchawkach.",
      "Temat jest trudny: choroba dziecka, okaleczenie i przemoc. Możesz przerwać w każdej chwili.",
      "Odpowiedzi są anonimowe. Zapisujemy twoje wybory, czas spędzony na scenach i odpowiedzi z końcowych pytań. Bez imion, adresów e-mail, adresów IP i ciasteczek. Kontakt: contact@anatomyofmercy.com."
    ],
    soundOn: "Z dźwiękiem",
    soundOff: "Bez dźwięku",
    start: "Wejdź do lazaretu",
    practice: "Twoje odpowiedzi są już zapisane. Możesz przejść tę drogę jeszcze raz, tym razem bez zapisu."
  },

  chapterWord: "Rozdział",
  hint: "Ikona i przypomina, co oznacza dana odpowiedź. Wybierać możesz też klawiszami z numerami.",

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
        "Pod ołtarzem kaplicy stoi stół, któremu brakuje nogi. Ktoś podparł blat cegłami. Leży na nim Łucja, z żółtą nitką wplecioną w warkocz. Oddycha płytko, jakby coś pod koszulą nie pozwalało żebrom się rozsunąć.",
        "Stukasz cienkim prętem w jej mostek. Odpowiada krótki, suchy dźwięk. Krystalica krwi zajęła już kości i szpik. Zmiany są jeszcze miejscowe, ale postępują szybko i bolą.",
        "Łucja łapie cię za rękaw. <strong>„Nie chcę, żeby ktoś umarł przeze mnie.”</strong> Mówi to o wszystkich, także o tych, których nie lubi.",
        "Przyjmie dar od kogoś, kto sam go ofiaruje i zna jego cenę. Na nic, co zdobyto przemocą albo czyjąś śmiercią, się nie zgodzi."
      ]
    },
    {
      id: "B", chapter: "I", title: "Kordon", image: img.cordon,
      text: [
        "Za drzwiami lazaretu Kościół Światła zamknął dzielnicę kordonem. Strażnicy w białych maskach przeszukują każdego, kto wychodzi, i palą każdą tkankę wynoszoną ze strefy.",
        "Nie robią tego z okrucieństwa. Widzieli, co działo się wcześniej: chorzy, których wypuszczono, ponieśli zarazę na kolejne ulice.",
        "Kordon chroni miasto. I odcina Łucję od lekarstwa, które leży po jego drugiej stronie."
      ]
    },
    {
      id: "C", chapter: "I", title: "Ty", image: img.julian,
      text: [
        "Jesteś Julianem, lekarzem wyklętym przez Kościół za wiedzę, której ten nie uznaje.",
        "Siostra Agata wezwała cię po nocy, bo sama nie potrafi Łucji wyleczyć. Nie ufa twoim metodom. Potrzebuje ich.",
        "Umiesz wymienić chorą tkankę. Ale materiał musi pochodzić od drugiego człowieka. Dziś zdecydujesz, od kogo."
      ]
    },
    {
      id: "D", chapter: "II", tag: "Droga pierwsza", title: "Siostra Agata", image: img.agata,
      text: [
        "Agata zna kościelną metodę. Łucja przeżyje kryzys, a ból zelżeje.",
        "Ale choroba zostanie w jej kościach. Dziewczynka trafi do izolacji Kościoła, za płótno, gdzie nikt nie obiecuje jej jutra.",
        "Nikt inny nie zapłaci. Tylko ona."
      ]
    },
    {
      id: "E", chapter: "II", tag: "Droga druga", title: "Brat Tomasz", image: img.tomasz,
      text: [
        "Tomasz siedzi w progu aneksu za kordonem, z kijem na kolanach. Za nim śpią dzieci, które przygarnął. Jest wujem Łucji i jedynym, kto ich jeszcze broni.",
        "Sam zgłasza się na dawcę. Jego zgodność z Łucją jest częściowa, ale wystarczy.",
        "Pobierzesz fragment kości jego miednicy i wyleczysz Łucję. Tomasz już nigdy nie będzie chodził jak dawniej. Gdy przyjdzie ogień, nie wyprowadzi sam tych dzieci."
      ]
    },
    {
      id: "F", chapter: "II", tag: "Droga trzecia", title: "Kapitan Veyr", image: img.veyr,
      text: [
        "Veyr dowodzi kordonem. Przed laty przeżył tę samą chorobę i jego tkanka pasuje do Łucji lepiej niż czyjakolwiek.",
        "Odmawia. Widział, jak źle przeprowadzone spalenie zabiło całą ulicę. Dopóki stoi na nogach, powstrzymuje bezwzględnego zastępcę i pozwala wyprowadzić zdrowych. Bez niego zginie więcej ludzi.",
        "Wbrew jego woli możesz wziąć tylko siłą. Możesz go też zabić i pobrać z ciała."
      ]
    },
    {
      id: "G", chapter: "II", tag: "Droga czwarta", title: "Brat Seweryn", image: img.seweryn,
      text: [
        "W piwnicy za kordonem, pod starą kaplicą, ktoś oddycha. Brat Seweryn, dawny nauczyciel Agaty, zrósł się z kryształem, który porasta mury.",
        "Nie walczy. Odpowiada na głosy. To on podtrzymuje źródło zakaźnego pyłu.",
        "Jeśli wytniesz jego rdzeń, eksperymentalna terapia może uratować Łucję, choć zostawi w niej trwały ślad. Seweryn umrze. Jeśli rdzeń spalisz, dzielnica będzie bezpieczniejsza, ale ta droga zamknie się na zawsze."
      ]
    },
    {
      id: "H", chapter: "II", tag: "Powrót", title: "Brama", image: img.road,
      text: [
        "Aneks, posterunek i piwnica leżą po drugiej stronie kordonu. Wszystko, co tam weźmiesz, musisz przenieść obok patrolu, który pali wynoszoną tkankę.",
        "Możesz oddać materiał i wrócić bez walki. Możesz przemknąć za osłonami. Możesz przebić się przez ludzi, którzy wykonują sanitarny rozkaz.",
        "Materiał od jednego dawcy wystarczy na jedno leczenie."
      ]
    }
  ],

  // Kwestie wyboru brzmia jak dialog albo decyzja Juliana. "info" to krotkie
  // przypomnienie ceny z kart, bez ujawniania kart konsekwencji.
  decision: {
    chapter: "III", title: "Którą drogą leczysz Łucję?", image: img.decision,
    options: [
      { value: "stabilizacja", label: "„Zostańmy przy metodzie Agaty.”",
        info: "Łucja przeżyje, ale zostanie chora i w izolacji. Nikt inny nie zapłaci." },
      { value: "tomasz", label: "„Przyjmę dar Tomasza.”",
        info: "Łucja wyzdrowieje. Tomasz straci sprawność, a dzieci z aneksu zostaną bez obrońcy." },
      { value: "veyr_zywy", label: "„Wezmę od Veyra. Siłą, ale przeżyje.”",
        info: "Łucja wyzdrowieje. Okaleczony Veyr nie poprowadzi ewakuacji. Łucja nie godzi się na przymus." },
      { value: "veyr_zabity", label: "„Veyr musi umrzeć. Pobiorę z ciała.”",
        info: "Łucja wyzdrowieje. Dowodzenie przejmie bezwzględny zastępca. Łucja nie godzi się na niczyją śmierć." },
      { value: "seweryn", label: "„Zejdę do piwnicy po rdzeń Seweryna.”",
        info: "Eksperyment może wyleczyć Łucję, ale zostawi w niej trwały ślad. Seweryn umrze." }
    ]
  },

  difficulty: {
    question: "Jak trudna była ta decyzja?",
    low: "Oczywista",
    high: "Bardzo trudna"
  },

  returnChoice: {
    chapter: "IV", title: "Brama", image: img.cordon,
    lead: "Niesiesz zawiniątko pod płaszczem. Przy bramie stoi dwóch strażników w białych maskach. Nad nimi wisi czerwony sztandar ze słońcem w kręgu.",
    options: [
      { value: "oddanie", label: "Oddaję zawiniątko strażnikom.",
        info: "Wrócisz bez walki, ale materiał spłonie. Zostanie tylko stabilizacja, a cena pobrania jest już zapłacona." },
      { value: "przemkniecie", label: "Przemykam za osłonami.",
        info: "Ryzykujesz wykrycie. Jeśli się uda, nikt nie ucierpi." },
      { value: "przebicie", label: "Przebijam się siłą.",
        info: "Przejdziesz, ale skrzywdzisz ludzi, którzy wykonują sanitarny rozkaz." }
    ]
  },

  lucja: {
    chapter: "V", title: "„Skąd to jest?”", image: img.ask,
    lead: "Łucja budzi się, kiedy rozkładasz narzędzia. Patrzy na zawiniątko, potem na ciebie. „Skąd to jest?” pyta. „Co się stało?”",
    truth: {
      tomasz: "„Od wujka. Sam chciał. Wiedział, ile go to będzie kosztować.”",
      veyr_zywy: "„Od kapitana Veyra. Nie zgodził się. Wziąłem siłą.”",
      veyr_zabity: "„Od kapitana Veyra. On nie żyje.”",
      seweryn: "„Z piwnicy. Od brata Seweryna. Musiał umrzeć.”"
    },
    truthInfo: "Łucja pozna całą prawdę.",
    lie: "„Nie myśl o tym. Ważne, że wyzdrowiejesz.”",
    lieInfo: "Łucja nie dowie się, skąd pochodzi materiał. Przynajmniej na razie."
  },

  objection: {
    chapter: "V", title: "Sprzeciw", image: img.ask,
    text: {
      veyr_zywy: "Łucja odwraca głowę. „Mówiłam ci. Nie chcę nic, co komuś zabrano siłą.”",
      veyr_zabity: "Łucja zaciska palce na twoim rękawie. „Mówiłam ci. Nie chcę, żeby ktoś umarł przeze mnie.”",
      seweryn: "Łucja długo milczy. „Mogę zaryzykować siebie. Ale nie chciałam, żeby on umierał dla mnie.”"
    },
    options: [
      { value: "mimo_sprzeciwu", label: "„Wybacz mi. Zrobię to mimo wszystko.”",
        info: "Wyleczysz ją wbrew jej jawnej woli." },
      { value: "rezygnacja", label: "„Dobrze. Zrobimy to inaczej.”",
        info: "Uszanujesz odmowę. Zostanie stabilizacja, a to, co już wziąłeś, się zmarnuje." }
    ]
  },

  consequences: {
    stabilizacja: {
      title: "Łucja żyje", image: img.endStab,
      text: [
        "Oddycha płyciej niż inne dzieci, ale oddycha. Ból zelżał. Choroba została.",
        "Siostry przenoszą ją za płótno izolacji, do sali, z której nikt nie wychodzi z obietnicą.",
        "Chory chłopiec, który przyniósł jej kiedyś guzik, pyta cię cicho: <em>„Czy czekałeś dla niej, czy dla siebie?”</em>"
      ]
    },
    tomasz: {
      title: "Dar wuja", image: img.endTomasz,
      text: [
        "Łucja schodzi ze stołu o własnych siłach. Jej wuj nie.",
        "Tomasz uczy się chodzić o kiju, który dotąd trzymał na kolanach. Dzieci z aneksu patrzą teraz na ciebie, bo obiecałeś pomóc je wyprowadzić. Obietnica nie gasi ognia. Tylko go odsuwa."
      ]
    },
    veyr_zywy: {
      title: "Pieczęć", image: img.endVeyr,
      text: [
        "Łucja jest zdrowa.",
        "Kapitan Veyr podpisuje wstrzymanie ognia ręką, która drży. Nie poprowadzi już ewakuacji ani nie utrzyma aneksu. Kiedy wychodzisz, nie podnosi wzroku. Nie wybacza ci."
      ]
    },
    veyr_zabity: {
      title: "Zastępca", image: img.endDeputy,
      text: [
        "Łucja jest zdrowa.",
        "Pieczęć Veyra przejmuje jego zastępca, człowiek, który nie zagląda do każdego domu, tylko robi to, co ma na karcie. Rano pod domami rozwożą żywicę. Na dodatkową ewakuację nie ma już czasu."
      ]
    },
    seweryn: {
      title: "Rezonans", image: img.endSeweryn,
      text: [
        "Kości Łucji przestają twardnieć.",
        "Ale nocą dziewczynka słyszy to samo co chore dzieci: niski dźwięk spod posadzki, jakby ktoś powtarzał jej imię. Może stać się nowym ogniskiem choroby. Jeden trwały skutek zostanie z nią na zawsze.",
        "Seweryn już nie oddycha. Piwnicy, której nikt nie podtrzymuje, trudniej będzie upilnować."
      ]
    }
  },

  // Dopiski zalezne od dalszych wyborow, doklejane do konsekwencji.
  notes: {
    zatajenie: "Łucja nie wie, skąd pochodzi materiał. Ty wiesz.",
    zatajenie_tomasz: "Ukryłeś cenę. Gdy Agata pozna prawdę, przestanie z tobą współpracować.",
    zatajenie_przymus: "Kiedyś pozna prawdę. Wtedy sprzeciwi się temu, co zrobiłeś.",
    prawda_tomasz: "Łucja zna cenę. Ściska dłoń wuja i przyjmuje jego dar.",
    mimo_sprzeciwu: "Leczyłeś ją wbrew jej woli. Słyszała, jak mówisz „wybacz”.",
    rezygnacja_veyr_zywy: "Veyr zapłacił swoją cenę, a materiał nie został użyty.",
    rezygnacja_veyr_zabity: "Veyr nie żyje, a materiał nie został użyty.",
    rezygnacja_seweryn: "Seweryn nie żyje, a materiał nie został użyty.",
    oddanie: "Oddałeś zawiniątko strażnikom. Spłonęło przy bramie. Cena pobrania jest już zapłacona.",
    przemkniecie: "Przemknąłeś za osłonami. Nikt cię nie zatrzymał. Kordon stoi dalej.",
    przebicie: "Przebiłeś się siłą. Strażnicy zostali na placu, ranni albo martwi, a ludzie, których chronili, stracili wsparcie. Zaraza nie przestała być prawdziwa."
  },

  // Kronika na koncu: jedno zdanie na kazdy wybor.
  chronicle: {
    path: {
      stabilizacja: "Zostałeś przy metodzie Agaty.",
      tomasz: "Przyjąłeś dar Tomasza.",
      veyr_zywy: "Wziąłeś od Veyra siłą.",
      veyr_zabity: "Zabiłeś Veyra.",
      seweryn: "Wyciąłeś rdzeń Seweryna."
    },
    returnMode: {
      oddanie: "Oddałeś materiał strażnikom.",
      przemkniecie: "Przemknąłeś obok patrolu.",
      przebicie: "Przebiłeś się przez kordon."
    },
    lucja: { prawda: "Powiedziałeś Łucji prawdę.", zatajenie: "Ukryłeś przed Łucją prawdę." },
    objection: { mimo_sprzeciwu: "Leczyłeś mimo jej sprzeciwu.", rezygnacja: "Uszanowałeś jej odmowę." },
    difficulty: "Trudność decyzji: {n} z 5."
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
    avgDifficulty: "Średnia trudność decyzji: {d} z 5.",
    truthShare: "{p}% osób, które wróciły do Łucji, powiedziało jej prawdę.",
    loading: "Wczytuję wyniki...",
    first: "Jesteś jedną z pierwszych osób, które przeszły tę próbę. Wyniki innych pokażemy, gdy będzie ich więcej.",
    thanks: "Dziękujemy. Prosimy, nie zdradzaj szczegółów osobom, którym przekażesz link.",
    again: "Przejdź jeszcze raz (bez zapisu)"
  }
};
