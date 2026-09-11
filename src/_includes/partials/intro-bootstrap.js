      (() => {
        const root = document.documentElement;
        root.classList.add("js");
        // The entrance plays on every load. It is part of the experience, not a
        // loading screen, so it is not remembered per session.
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          root.classList.add("intro-pending");
          // Release the page even if the deferred script fails to load.
          window.aomIntroFailsafe = setTimeout(() => {
            root.classList.remove("intro-pending");
            document.querySelectorAll("[data-intro-inert]").forEach(node => {
              node.inert = false;
              node.removeAttribute("data-intro-inert");
            });
          }, 8500);
        }
      })();
