const galleryContainer = document.querySelector("#gallery");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const revealItems = document.querySelectorAll("[data-reveal]");

const galleryItems = Array.from({ length: 19 }, (_, index) => {
  const itemNumber = String(index + 1).padStart(2, "0");

  return {
    src: `assets/gallery/nails-${itemNumber}.jpeg`,
    alt: `Beauty by Bugi rad ${index + 1}`,
    label: `Rad ${itemNumber}`,
  };
});

const openLightbox = (src, alt) => {
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightbox.showModal();
  document.body.style.overflow = "hidden";
};

const resetLightboxState = () => {
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
};

const closeLightbox = () => {
  if (lightbox.open) {
    lightbox.close();
    return;
  }

  resetLightboxState();
};

galleryItems.forEach((item) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-card";
  button.setAttribute("aria-label", `Otvori veći prikaz za ${item.alt}`);
  button.innerHTML = `
    <img src="${item.src}" alt="${item.alt}" loading="lazy" />
    <span>${item.label}</span>
  `;
  button.addEventListener("click", () => openLightbox(item.src, item.alt));
  galleryContainer.appendChild(button);
});

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const src = trigger.getAttribute("data-lightbox-src");
    const alt = trigger.getAttribute("data-lightbox-alt") || "";
    openLightbox(src, alt);
  });
});

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
