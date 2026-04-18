const scrollTopBtn = document.querySelector(".to-top");

if (scrollTopBtn) {
    const toggleScrollTopBtn = () => {
        if (window.scrollY > 240) {
            scrollTopBtn.classList.add("is-visible");
            return;
        }

        scrollTopBtn.classList.remove("is-visible");
    };

    window.addEventListener("scroll", toggleScrollTopBtn, { passive: true });
    toggleScrollTopBtn();
}
