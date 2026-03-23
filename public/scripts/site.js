const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const revealItems = document.querySelectorAll("[data-reveal]");

const openLightbox = (src, alt) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightbox.showModal();
  document.body.style.overflow = "hidden";
};

const resetLightboxState = () => {
  if (!lightboxImage) {
    return;
  }

  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
};

const closeLightbox = () => {
  if (!lightbox) {
    return;
  }

  if (lightbox.open) {
    lightbox.close();
    return;
  }

  resetLightboxState();
};

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const src = trigger.getAttribute("data-lightbox-src");
    const alt = trigger.getAttribute("data-lightbox-alt") || "";

    if (src) {
      openLightbox(src, alt);
    }
  });
});

if (lightbox && lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("close", resetLightboxState);

  lightbox.addEventListener("cancel", () => {
    resetLightboxState();
  });

  lightbox.addEventListener("click", (event) => {
    const bounds = lightbox.getBoundingClientRect();
    const clickedOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (clickedOutside) {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.open) {
      closeLightbox();
    }
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
