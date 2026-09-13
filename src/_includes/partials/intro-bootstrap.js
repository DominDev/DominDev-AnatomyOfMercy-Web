      (() => {
        const root = document.documentElement;
        root.classList.add("js");
        // Sekwencja wejscia odtwarza sie przy kazdym wczytaniu strony. Jest
        // czescia doswiadczenia, nie ekranem ladowania, wiec nie zapamietujemy
        // jej na sesje. Uklad wstawia ten skrypt wylacznie na stronach, ktore
        // maja preloader; na pozostalych klasa nigdy nie powstaje.
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
