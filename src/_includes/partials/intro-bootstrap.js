      (() => {
        const root = document.documentElement;
        // Klasa `js` przelacza style z wersji zapasowej na skryptowa, miedzy
        // innymi pasek nawigacji z listy na przycisk menu. Musi powstac na
        // kazdej stronie, takze bez sekwencji wejscia; bez niej telefon dostaje
        // rozwinieta liste zamiast hamburgera.
        root.classList.add("js");
        // Sekwencja wejscia gra wylacznie na stronach oznaczonych w ukladzie
        // atrybutem `data-entrance`. Jest czescia doswiadczenia, nie ekranem
        // ladowania, wiec nie zapamietujemy jej na sesje.
        if (root.hasAttribute("data-entrance") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
          root.classList.add("intro-pending");
          // Strona musi sie odblokowac takze wtedy, gdy odroczony skrypt nie
          // wczyta sie wcale.
          window.aomIntroFailsafe = setTimeout(() => {
            root.classList.remove("intro-pending");
            document.querySelectorAll("[data-intro-inert]").forEach(node => {
              node.inert = false;
              node.removeAttribute("data-intro-inert");
            });
          }, 8500);
        }
      })();
