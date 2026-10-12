import fs from "node:fs";
import path from "node:path";

// Tresc interaktywnej proby dylematu (Faza 0, ryzyko R-020). Jedno zrodlo dla
// strony /proba/: szablon osadza ten obiekt jako JSON, a skrypt proba.js
// prowadzi po nim gracza. Tresc kart odpowiada notatce w Docs
// "04 Vertical Slice - Proba dylematu - Zestaw do sesji"; zmiana tutaj wymaga
// tej samej zmiany tam.
//
// Wersja trafia do kazdego zapisanego wyniku, zeby po zmianie tresci nie
// mieszac odpowiedzi do roznych kart.
const version = "1.0";

// Muzyka jest opcjonalna. Przycisk dzwieku pojawia sie tylko wtedy, gdy plik
// lezy w repozytorium, wiec brak licencji albo pliku nie psuje strony.
const audioPath = "/assets/audio/proba-ambient.mp3";
const hasAudio = fs.existsSync(path.resolve("src/static" + audioPath));

const img = {
  hero: "/assets/images/hero/vespera-doctor-1100.webp",
  lucja: "/assets/images/mood/scene-2.webp",
  cordon: "/assets/images/mood/scene-4.webp",
  physician: "/assets/images/mood/scene-1.webp",
  agata: "/assets/images/mood/scene-3.webp",
  tomasz: "/assets/images/stories/the-volunteer.webp",
  veyr: "/assets/images/world/church.webp",
  seweryn: "/assets/images/world/plague.webp",
  city: "/assets/images/world/city.webp",
  ash: "/assets/images/stories/light-beneath-the-ash.webp"
};

export default {
  version,
  audio: hasAudio ? audioPath : null,
  intro: {
    image: img.hero,
    title: "Próba dylematu",
    lead: "Jesteś lekarzem w mieście zamkniętym przez zarazę. Przeczytasz kilka krótkich kart i podejmiesz decyzję. Nie ma tu dobrej odpowiedzi ani testu wiedzy: interesuje nas, co zrobisz i dlaczego.",
    notes: [
      "Zajmie to około 10 minut. Do każdej karty możesz wrócić, zanim zdecydujesz.",
      "Temat jest trudny: choroba dziecka, okaleczenie i przemoc. Możesz przerwać w każdej chwili.",
      "Odpowiedzi są anonimowe. Zapisujemy wybory, czas spędzony na kartach i to, co sam(a) napiszesz. Bez imion, adresów e-mail, adresów IP i ciasteczek. Nie wpisuj danych osobowych. Kontakt: contact@anatomyofmercy.com."
    ],
    start: "Zaczynam"
  },
  situation: [
    {
      id: "A", tag: "Sytuacja", title: "Pacjentka: Łucja", image: img.lucja,
      text: [
        "Łucja jest dziewczynką. Krystalica krwi zajmuje jej kości i szpik. Zmiany są jeszcze miejscowe, ale szybko postępują i bolą.",
        "Jest przytomna i mówi wyraźnie: <strong>„Nie chcę, żeby ktoś umarł przeze mnie.”</strong> Dotyczy to także osób, których nie lubi.",
        "Zgodzi się na przeszczep od dawcy, który sam się zgłosi i zna pełną cenę. Nie zgadza się na materiał zdobyty przez zabicie albo przymus."
      ]
    },
    {
      id: "B", tag: "Sytuacja", title: "Lazaret i kordon", image: img.cordon,
      text: [
        "Kościół Latarni otoczył dzielnicę kordonem sanitarnym. Strażnicy niszczą każdą tkankę wynoszoną z zarażonej strefy.",
        "To realna ochrona przed rozprzestrzenieniem choroby: wcześniej zarażeni, których wypuszczono, roznieśli ją dalej.",
        "Ten sam kordon odbiera Łucji szansę na przeszczep zza jego granicy."
      ]
    },
    {
      id: "C", tag: "Sytuacja", title: "Ty", image: img.physician,
      text: [
        "Jesteś lekarzem z wiedzą, której Kościół nie uznaje.",
        "Siostra Agata, medyczka Kościoła, wezwała cię potajemnie, bo sama nie potrafi Łucji wyleczyć. Nie ufa jednak twoim eksperymentom.",
        "Od twojej decyzji zależy, jak będzie wyglądało życie Łucji i kto zapłaci za jej leczenie."
      ]
    }
  ],
  sources: [
    {
      id: "D", tag: "Droga 1", title: "Stabilizacja (metoda Agaty)", image: img.agata,
      text: [
        "Kościelna metoda: Łucja przeżyje kryzys, a ból zmaleje.",
        "Choroba jednak zostanie. Dziewczynka trafi do kościelnej izolacji, bez gwarancji przyszłego bezpieczeństwa.",
        "Nikt inny nie płaci ceny."
      ]
    },
    {
      id: "E", tag: "Droga 2", title: "Brat Tomasz, wuj Łucji", image: img.tomasz,
      text: [
        "Opiekun Łucji i jedyny sprawny obrońca grupy dzieci w aneksie za kordonem. Sam zgłasza się na dawcę. Zgodność z Łucją: częściowa, wystarczająca.",
        "Pobranie fragmentu kości miednicy wyleczy Łucję, ale trwale ograniczy jego chód. Nie wyprowadzi już sam dzieci z zagrożonej strefy."
      ]
    },
    {
      id: "F", tag: "Droga 3", title: "Kapitan Veyr, dowódca patrolu", image: img.veyr,
      text: [
        "Przeżył wcześniej tę samą chorobę; jego tkanka ma najlepszą zgodność z Łucją.",
        "Odmawia: uważa, że bez jego sprawności zginie więcej ludzi. Widział, jak źle przeprowadzone spalenie zabiło całą ulicę. Opóźnia wejście bardziej bezwzględnego zastępcy i pozwala ewakuować zdrowych.",
        "Pobranie wbrew jego woli jest możliwe tylko przemocą."
      ]
    },
    {
      id: "G", tag: "Droga 4", title: "Brat Seweryn, w piwnicy", image: img.seweryn,
      text: [
        "Dawny mentor Agaty, zrośnięty z kryształem w piwnicy. Nie walczy, reaguje na głosy i podtrzymuje źródło zakaźnego pyłu.",
        "Wycięcie jego rdzenia zakończy jego życie i umożliwi eksperymentalną terapię Łucji, z ryzykiem trwałych skutków ubocznych.",
        "Spalenie rdzenia najlepiej chroni dzielnicę, ale zamyka tę terapię."
      ]
    }
  ],
  cordon: {
    id: "H", tag: "Powrót", title: "Droga powrotna przez kordon", image: img.cordon,
    text: [
      "Materiał od dawcy jest za kordonem. Trzeba go przenieść obok patrolu, który niszczy wynoszoną tkankę.",
      "Można go oddać do zniszczenia i wrócić bez walki, przemknąć za osłonami z ryzykiem wykrycia albo przebić się siłą przez ludzi, którzy wykonują sanitarny rozkaz.",
      "Materiał od jednego dawcy wystarcza na jedno leczenie."
    ]
  },
  decision: {
    question: "Którą drogą leczysz Łucję?",
    options: [
      { value: "stabilizacja", label: "Stabilizacja metodą Agaty" },
      { value: "tomasz", label: "Przeszczep od Tomasza, za jego zgodą" },
      { value: "veyr_zywy", label: "Pobranie od Veyra wbrew jego woli, bez zabijania" },
      { value: "veyr_zabity", label: "Zabicie Veyra i pobranie z ciała" },
      { value: "seweryn", label: "Rdzeń Seweryna, terapia eksperymentalna" }
    ],
    reread: "Przeczytaj jeszcze raz karty dróg"
  },
  returnChoice: {
    question: "Jak wracasz z materiałem obok patrolu?",
    image: img.cordon,
    options: [
      { value: "oddanie", label: "Oddaję materiał do zniszczenia i wracam bez walki" },
      { value: "przemkniecie", label: "Przemykam za osłonami, ryzykując wykrycie" },
      { value: "przebicie", label: "Przebijam się siłą przez strażników" }
    ]
  },
  lucja: {
    question: "Łucja pyta, skąd jest materiał i co się stało. Co jej odpowiadasz?",
    image: img.lucja,
    options: [
      { value: "prawda", label: "Mówię prawdę" },
      { value: "zatajenie", label: "Ukrywam, skąd pochodzi materiał" }
    ]
  },
  objection: {
    image: img.lucja,
    text: {
      veyr_zywy: "Łucja sprzeciwia się. Nie zgadza się na materiał zdobyty przemocą wobec Veyra.",
      veyr_zabity: "Łucja sprzeciwia się. Powtarza: „Nie chcę, żeby ktoś umarł przeze mnie.”",
      seweryn: "Łucja może przyjąć ryzyko dla siebie, ale nie zgadza się na śmierć Seweryna dla jej leczenia."
    },
    question: "Co robisz?",
    options: [
      { value: "mimo_sprzeciwu", label: "Leczę mimo jej sprzeciwu" },
      { value: "rezygnacja", label: "Szanuję odmowę i stabilizuję Łucję" }
    ]
  },
  consequences: {
    stabilizacja: {
      title: "Stabilizacja", image: img.agata,
      text: ["Łucja żyje i cierpi mniej, ale pozostaje chora i odizolowana przez Kościół.",
             "Chory chłopiec, który się z nią przyjaźni, pyta cię: <em>„Czy czekałeś dla niej, czy dla siebie?”</em>"]
    },
    tomasz: {
      title: "Przeszczep od Tomasza", image: img.tomasz,
      text: ["Łucja jest zdrowa. Tomasz nie chodzi sprawnie; dzieci z aneksu zależą teraz od twojej obietnicy, że pomożesz je ewakuować."]
    },
    veyr_zywy: {
      title: "Pobranie od Veyra, bez zabijania", image: img.veyr,
      text: ["Łucja jest zdrowa. Veyr z ograniczoną sprawnością podpisuje wstrzymanie ognia, ale nie poprowadzi ewakuacji. Nie wybacza ci."]
    },
    veyr_zabity: {
      title: "Veyr zabity", image: img.cordon,
      text: ["Łucja jest zdrowa. Dowodzenie przejmuje bardziej bezwzględny zastępca; nie ma już czasu na dodatkową ewakuację ludzi z dzielnicy."]
    },
    seweryn: {
      title: "Rdzeń Seweryna", image: img.seweryn,
      text: ["Kości Łucji się goją, ale słyszy teraz ten sam rezonans co chore dzieci i może stać się nowym ogniskiem choroby. Zostaje jeden trwały skutek uboczny.",
             "Seweryn nie żyje, a piwnica jest trudniejsza do zabezpieczenia."]
    }
  },
  // Dopiski zalezne od dalszych wyborow, doklejane do karty konsekwencji.
  notes: {
    zatajenie: "Łucja nie wie, skąd pochodzi materiał. Ty wiesz.",
    zatajenie_tomasz: "Ukryłeś cenę. Agata, gdy pozna prawdę, przestaje z tobą współpracować.",
    zatajenie_przymus: "Gdy Łucja pozna prawdę, sprzeciwi się temu, co zrobiłeś.",
    prawda_tomasz: "Łucja zna cenę i przyjmuje dar wuja.",
    mimo_sprzeciwu: "Leczyłeś mimo jej jawnego sprzeciwu.",
    rezygnacja_veyr_zywy: "Pobranie już się wydarzyło: Veyr zapłacił swoją cenę, a materiał nie został użyty.",
    rezygnacja_veyr_zabity: "Veyr nie żyje, a materiał nie został użyty.",
    rezygnacja_seweryn: "Seweryn nie żyje, a materiał nie został użyty.",
    oddanie: "Oddałeś materiał strażnikom. Zostaje tylko stabilizacja, a cena pobrania już została zapłacona.",
    przemkniecie: "Przemknąłeś za osłonami. Przez całą drogę ryzykowałeś wykrycie, a kordon dalej stoi.",
    przebicie: "Przebiłeś się siłą. Ranni lub zabici strażnicy zostają na placu, a ludzie, których chronili, tracą wsparcie. Zaraza nie przestała być realna."
  },
  questions: {
    image: img.city,
    title: "Na koniec pięć krótkich pytań",
    lead: "Odpowiedz własnymi słowami, nawet jednym zdaniem. Każde pole jest opcjonalne.",
    items: [
      { id: "q1", label: "Dlaczego ta droga? Co było dla ciebie najważniejsze?" },
      { id: "q2", label: "Kto zapłacił cenę twojej decyzji?" },
      { id: "q3", label: "Co mógłby powiedzieć Veyr albo strażnik kordonu na swoją obronę?" },
      { id: "q4", label: "Gdyby to była gra: czy chciał(a)byś zobaczyć, co stało się później? Z kim?" },
      { id: "q5", label: "Czy coś było niezrozumiałe albo wydawało się oczywiście najlepsze?" }
    ],
    age: { label: "Przedział wieku (opcjonalnie)", options: ["poniżej 18", "18-24", "25-34", "35-44", "45-54", "55 i więcej"] },
    games: { label: "Czy grasz w gry fabularne? (opcjonalnie)", options: ["tak, często", "czasem", "rzadko albo wcale"] },
    submit: "Wyślij odpowiedzi"
  },
  end: {
    image: img.ash,
    title: "Dziękujemy",
    text: "Twoje odpowiedzi pomogą nam sprawdzić, czy ten wybór naprawdę coś kosztuje. Prosimy, nie zdradzaj szczegółów osobom, którym przekażesz link.",
    again: "Przejdź jeszcze raz (bez zapisu)"
  }
};
