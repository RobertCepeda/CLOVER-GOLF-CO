const header = document.querySelector(".site-header");

if (header) {
  window.addEventListener("scroll", () => {
    const isScrolled = window.scrollY > 12;
    header.style.boxShadow = isScrolled
      ? "0 14px 34px rgba(12, 36, 22, 0.08)"
      : "none";
  });
}

const adminSessionKey = "cloverAdminAuthenticated";

const setStatus = (element, message, type = "neutral") => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.status = type;
};

const storeProducts = [
  {
    id: "signature-leather",
    name: "Signature Leather",
    category: "gorras",
    tags: ["cuero", "bordado", "clasica"],
    image: "assets/cap-thumb-signature-leather.png?v=3",
    view360: "assets/cap-360-signature-leather-production.png?v=2",
    description: "Crema, verde bosque y parche de cuero grabado para el modelo principal.",
  },
  {
    id: "forest-classic",
    name: "Forest Classic",
    category: "gorras",
    tags: ["bordado", "verde", "clasica"],
    image: "assets/cap-thumb-forest-classic.png?v=3",
    view360: "assets/cap-360-forest-classic-production.png?v=2",
    description: "Gorra verde completa con bordado crema, textura de tela y perfil limpio.",
  },
  {
    id: "stripe-course",
    name: "Stripe Course",
    category: "gorras",
    tags: ["bordado", "rayas", "retro"],
    image: "assets/cap-thumb-stripe-course.png?v=3",
    view360: "assets/cap-360-stripe-course-production.png?v=2",
    description: "Rayas verticales crema y verde con presencia retro de campo.",
  },
  {
    id: "cream-heritage",
    name: "Cream Heritage",
    category: "gorras",
    tags: ["bordado", "crema", "clasica"],
    image: "assets/cap-thumb-cream-heritage.png?v=3",
    view360: "assets/cap-360-cream-heritage-production.png?v=2",
    description: "Base crema limpia con logo Clover bordado al frente.",
  },
  {
    id: "olive-performance",
    name: "Olive Performance",
    category: "gorras",
    tags: ["performance", "oliva", "perforada"],
    image: "assets/cap-thumb-olive-performance.png?v=3",
    view360: "assets/cap-360-olive-performance-production.png?v=2",
    description: "Oliva sobrio, textura ligera y perforaciones laterales.",
  },
  {
    id: "tour-cream",
    name: "Tour Cream",
    category: "gorras",
    tags: ["bordado", "crema", "verde"],
    image: "assets/cap-thumb-tour-cream.png?v=3",
    view360: "assets/cap-360-tour-cream-production.png?v=2",
    description: "Crema con visera verde y logo centrado sin cordon frontal.",
  },
  {
    id: "womens-bucket",
    name: "Women's Bucket Hat",
    category: "mujer",
    tags: ["mujer", "bucket", "bordado"],
    image: "assets/cap-thumb-womens-bucket.png?v=3",
    view360: "assets/cap-360-womens-bucket-production.png?v=2",
    description: "Bucket hat crema con textura sutil y logo Clover bordado al frente.",
  },
  {
    id: "jiuguva-visor",
    name: "Jiuguva Visor",
    category: "mujer",
    tags: ["mujer", "visor", "performance"],
    image: "assets/cap-thumb-jiuguva-visor.png?v=3",
    view360: "assets/cap-360-jiuguva-visor-production.png?v=4",
    description: "Visor blanco con banda respirable y logo bordado centrado arriba.",
  },
  {
    id: "fairway-classic",
    name: "Fairway Classic",
    category: "mujer",
    tags: ["mujer", "bordado", "verde"],
    image: "assets/cap-thumb-fairway-classic.png?v=3",
    view360: "assets/cap-360-fairway-classic-production.png?v=2",
    description: "Gorra femenina en verde profundo con logo Clover crema bordado.",
  },
  {
    id: "cream-fairway",
    name: "Cream Fairway",
    category: "mujer",
    tags: ["mujer", "crema", "verde"],
    image: "assets/cap-thumb-cream-fairway.png?v=3",
    view360: "assets/cap-360-cream-fairway-production.png?v=2",
    description: "Base crema con visera verde para un look femenino de campo.",
  },
];

const customerKey = "cloverCustomer";
const cartKey = "cloverCart";
const favoritesKey = "cloverFavorites";
const shopViews = document.querySelectorAll("[data-shop-view]");
const shopLinks = document.querySelectorAll("[data-shop-link]");
const navLinks = document.querySelectorAll(".main-nav [data-shop-link]");
const productGrid = document.querySelector("[data-product-grid]");
const productSearch = document.querySelector("[data-product-search]");
const productFilters = document.querySelectorAll("[data-product-filter]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const accountDrawer = document.querySelector("[data-account-drawer]");
const drawerBackdrop = document.querySelector("[data-drawer-backdrop]");
const cartList = document.querySelector("[data-cart-list]");
const favoriteList = document.querySelector("[data-favorite-list]");
const cartSelectionNote = document.querySelector("[data-cart-selection-note]");
const cartCount = document.querySelector("[data-cart-count]");
const favoriteCount = document.querySelector("[data-favorite-count]");
const checkoutSummary = document.querySelector("[data-checkout-summary]");
const customerForm = document.querySelector("[data-customer-auth]");
const customerStatus = document.querySelector("[data-customer-status]");
const customerPanel = document.querySelector("[data-customer-panel]");
const productModal = document.querySelector("[data-product-modal]");
const productModalImage = document.querySelector("[data-product-modal-image]");
const productModalTitle = document.querySelector("[data-product-modal-title]");
const productModalTag = document.querySelector("[data-product-modal-tag]");
const productModalText = document.querySelector("[data-product-modal-text]");
const productModalAdd = document.querySelector("[data-product-modal-add]");
const productModal360 = document.querySelector("[data-product-modal-360]");
const shopViewAliases = {
  marca: "inicio",
  catalogo: "productos",
  mujer: "productos",
  contacto: "pedidos",
  lookbook: "campo",
};
let activeProductFilter = "todos";
let activeProductId = "";
let activeShopView = "inicio";

const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

let customer = readStorage(customerKey, null);
let cart = readStorage(cartKey, []);
let favorites = new Set(readStorage(favoritesKey, []));

const getProductById = (id) => storeProducts.find((product) => product.id === id);

const getCartCount = () => cart.reduce((total, item) => total + item.qty, 0);

const getCartSummaryText = () =>
  cart
    .map((item) => {
      const product = getProductById(item.id);
      return product ? `${item.qty} x ${product.name}` : "";
    })
    .filter(Boolean)
    .join("\n");

const updateActionCounts = () => {
  const nextCartCount = getCartCount();
  const nextFavoriteCount = favorites.size;

  if (cartCount) {
    cartCount.textContent = String(nextCartCount);
    cartCount.hidden = nextCartCount === 0;
  }

  if (favoriteCount) {
    favoriteCount.textContent = String(nextFavoriteCount);
    favoriteCount.hidden = nextFavoriteCount === 0;
  }
};

const getActiveProductNavFilter = () => (activeProductFilter === "mujer" ? "mujer" : "todos");

const updateActiveNavLinks = (nextView = activeShopView) => {
  navLinks.forEach((link) => {
    const linkFilter = link.dataset.filterLink || "";
    const isActive =
      nextView === "productos"
        ? link.dataset.shopLink === "productos" && linkFilter === getActiveProductNavFilter()
        : link.dataset.shopLink === nextView && !linkFilter;

    link.classList.toggle("is-active", isActive);
    link.toggleAttribute("aria-current", isActive);
  });
};

const setProductFilter = (filter) => {
  activeProductFilter = filter || "todos";

  productFilters.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.productFilter === activeProductFilter);
  });

  renderProducts();
  updateActiveNavLinks();
};

const getFilteredProducts = () => {
  const searchValue = productSearch?.value.trim().toLowerCase() || "";

  return storeProducts.filter((product) => {
    const matchesFilter =
      activeProductFilter === "todos" ||
      product.category === activeProductFilter ||
      product.tags.includes(activeProductFilter);
    const searchHaystack = `${product.name} ${product.category} ${product.tags.join(" ")} ${
      product.description
    }`.toLowerCase();

    return matchesFilter && (!searchValue || searchHaystack.includes(searchValue));
  });
};

const renderProducts = () => {
  if (!productGrid) {
    return;
  }

  const products = getFilteredProducts();

  if (!products.length) {
    productGrid.innerHTML = `<p class="empty-products">No encontramos gorras con ese filtro.</p>`;
    return;
  }

  productGrid.innerHTML = products
    .map((product) => {
      const isFavorite = favorites.has(product.id);

      return `
        <article class="store-product-card">
          <button
            class="favorite-toggle ${isFavorite ? "is-active" : ""}"
            type="button"
            aria-label="${isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}"
            data-toggle-favorite="${product.id}"
          >
            ${isFavorite ? "&hearts;" : "&#9825;"}
          </button>
          <button class="product-image-button" type="button" data-open-product="${product.id}">
            <img src="${product.image}" alt="Gorra ${product.name} Clover Golf Co." />
          </button>
          <div class="store-product-info">
            <span>${product.category === "mujer" ? "Linea femenina" : "Clover Golf Co."}</span>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="store-product-actions">
              <button class="primary-button" type="button" data-open-product="${product.id}">
                View
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

const saveCart = () => {
  cart = cart.filter((item) => item.qty > 0 && getProductById(item.id));
  writeStorage(cartKey, cart);
  updateActionCounts();
  renderCart();
  renderCheckoutSummary();
};

const addToCart = (productId) => {
  const product = getProductById(productId);

  if (!product) {
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }

  saveCart();
};

const updateCartItem = (productId, delta) => {
  const item = cart.find((cartItem) => cartItem.id === productId);

  if (!item) {
    return;
  }

  item.qty += delta;
  saveCart();
};

const removeCartItem = (productId) => {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
};

const renderCart = () => {
  if (!cartList) {
    return;
  }

  if (cartSelectionNote) {
    const count = getCartCount();
    cartSelectionNote.textContent = count
      ? `${count} estilo${count === 1 ? "" : "s"} guardado${count === 1 ? "" : "s"} para revisar.`
      : "Guarda los modelos que quieres revisar. Los detalles se confirman contigo antes de producir.";
  }

  if (!cart.length) {
    cartList.innerHTML = `<p class="drawer-empty">Tu seleccion esta vacia.</p>`;
    return;
  }

  cartList.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.id);

      if (!product) {
        return "";
      }

      return `
        <article class="drawer-product">
          <img src="${product.image}" alt="${product.name}" />
          <div>
            <strong>${product.name}</strong>
            <span>Listo para revisar</span>
            <div class="qty-controls">
              <button type="button" data-cart-minus="${product.id}">-</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-plus="${product.id}">+</button>
              <button type="button" data-cart-remove="${product.id}">Quitar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

const renderFavorites = () => {
  if (!favoriteList) {
    return;
  }

  const favoriteProducts = storeProducts.filter((product) => favorites.has(product.id));

  if (!favoriteProducts.length) {
    favoriteList.innerHTML = `<p class="drawer-empty">Aun no tienes favoritos guardados.</p>`;
    return;
  }

  favoriteList.innerHTML = favoriteProducts
    .map(
      (product) => `
        <article class="drawer-product">
          <img src="${product.image}" alt="${product.name}" />
          <div>
            <strong>${product.name}</strong>
            <span>Favorito guardado</span>
            <button class="secondary-button" type="button" data-add-cart="${product.id}">
              Guardar seleccion
            </button>
          </div>
        </article>
      `,
    )
    .join("");
};

const toggleFavorite = (productId) => {
  if (favorites.has(productId)) {
    favorites.delete(productId);
  } else {
    favorites.add(productId);
  }

  writeStorage(favoritesKey, [...favorites]);
  updateActionCounts();
  renderProducts();
  renderFavorites();
};

const renderCustomer = () => {
  if (!customerPanel) {
    return;
  }

  if (!customer) {
    customerPanel.hidden = true;
    return;
  }

  customerPanel.hidden = false;
  customerPanel.innerHTML = `
    <span>Sesion activa</span>
    <strong>${customer.name}</strong>
    <p>${customer.email}</p>
    <button class="secondary-button" type="button" data-logout-customer>Cerrar sesion</button>
  `;
};

const closeDrawers = () => {
  cartDrawer?.setAttribute("hidden", "");
  accountDrawer?.setAttribute("hidden", "");
  drawerBackdrop?.setAttribute("hidden", "");
  document.body.classList.remove("drawer-open");
};

const openDrawer = (drawer) => {
  closeDrawers();
  drawer?.removeAttribute("hidden");
  drawerBackdrop?.removeAttribute("hidden");
  document.body.classList.add("drawer-open");
};

const renderCheckoutSummary = () => {
  if (!checkoutSummary) {
    return;
  }

  const summary = getCartSummaryText();

  if (!summary) {
    checkoutSummary.hidden = true;
    checkoutSummary.innerHTML = "";
    return;
  }

  checkoutSummary.hidden = false;
  checkoutSummary.innerHTML = `
    <span>Seleccion actual</span>
    <pre>${summary}</pre>
  `;
};

const resolveShopView = (viewName) => shopViewAliases[viewName] || viewName || "inicio";

const showView = (viewName, options = {}) => {
  const requestedView = resolveShopView(viewName);
  const hasView = [...shopViews].some((view) => view.dataset.shopView === requestedView);
  const nextView = hasView ? requestedView : "inicio";
  activeShopView = nextView;

  shopViews.forEach((view) => {
    const isActive = view.dataset.shopView === nextView;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });

  updateActiveNavLinks(nextView);

  if (!options.skipHash && window.location.hash !== `#${nextView}`) {
    history.pushState(null, "", `#${nextView}`);
  }

  if (!options.skipScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const openProductModal = (productId) => {
  const product = getProductById(productId);

  if (!product || !productModal) {
    return;
  }

  activeProductId = product.id;
  productModalImage.src = product.view360;
  productModalImage.alt = `Vista 360 de ${product.name}`;
  productModalTitle.textContent = product.name;
  productModalTag.textContent = product.category === "mujer" ? "Linea femenina" : "Gorra Clover";
  productModalText.textContent = product.description;
  productModal.hidden = false;
  document.body.classList.add("drawer-open");
};

const closeProductModal = () => {
  productModal?.setAttribute("hidden", "");
  document.body.classList.remove("drawer-open");
};

shopLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    if (link.dataset.filterLink) {
      setProductFilter(link.dataset.filterLink);
    }

    showView(link.dataset.shopLink);
  });
});

window.addEventListener("popstate", () => {
  showView(window.location.hash.replace("#", "") || "inicio", { skipHash: true });
});

productFilters.forEach((button) => {
  button.addEventListener("click", () => setProductFilter(button.dataset.productFilter));
});

productSearch?.addEventListener("input", renderProducts);

document.querySelectorAll("[data-open-search]").forEach((button) => {
  button.addEventListener("click", () => {
    showView("productos");
    productSearch?.focus();
  });
});

document.querySelectorAll("[data-open-cart]").forEach((button) => {
  button.addEventListener("click", () => openDrawer(cartDrawer));
});

document.querySelectorAll("[data-open-account], [data-open-favorites]").forEach((button) => {
  button.addEventListener("click", () => {
    renderFavorites();
    renderCustomer();
    openDrawer(accountDrawer);
  });
});

document.querySelectorAll("[data-close-drawer]").forEach((button) => {
  button.addEventListener("click", closeDrawers);
});

drawerBackdrop?.addEventListener("click", closeDrawers);

productGrid?.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-toggle-favorite]");
  const addButton = event.target.closest("[data-add-cart]");
  const openButton = event.target.closest("[data-open-product]");

  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.toggleFavorite);
    return;
  }

  if (addButton) {
    addToCart(addButton.dataset.addCart);
    openDrawer(cartDrawer);
    return;
  }

  if (openButton) {
    openProductModal(openButton.dataset.openProduct);
  }
});

cartList?.addEventListener("click", (event) => {
  const minusButton = event.target.closest("[data-cart-minus]");
  const plusButton = event.target.closest("[data-cart-plus]");
  const removeButton = event.target.closest("[data-cart-remove]");

  if (minusButton) {
    updateCartItem(minusButton.dataset.cartMinus, -1);
  }

  if (plusButton) {
    updateCartItem(plusButton.dataset.cartPlus, 1);
  }

  if (removeButton) {
    removeCartItem(removeButton.dataset.cartRemove);
  }
});

favoriteList?.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-cart]");

  if (addButton) {
    addToCart(addButton.dataset.addCart);
    openDrawer(cartDrawer);
  }
});

customerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = customerForm.querySelector("button[type='submit']");
  const formData = new FormData(customerForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email.includes("@")) {
    setStatus(customerStatus, "Completa nombre y correo valido.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus(customerStatus, "Verificando cuenta...", "neutral");

  try {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo abrir la cuenta.");
    }

    customer = payload;
    writeStorage(customerKey, customer);
    customerForm.reset();
    renderCustomer();
    setStatus(customerStatus, "Cuenta lista. Tus datos quedaron guardados.", "success");
  } catch (error) {
    setStatus(customerStatus, error.message || "No se pudo crear o entrar a la cuenta.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

customerPanel?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-logout-customer]")) {
    return;
  }

  customer = null;
  localStorage.removeItem(customerKey);
  renderCustomer();
  setStatus(customerStatus, "Sesion cerrada.", "neutral");
});

document.querySelector("[data-checkout-cart]")?.addEventListener("click", () => {
  closeDrawers();
  showView("pedidos");
  renderCheckoutSummary();
});

document.querySelector("[data-close-product-modal]")?.addEventListener("click", closeProductModal);

productModal?.addEventListener("click", (event) => {
  if (event.target === productModal) {
    closeProductModal();
  }
});

productModalAdd?.addEventListener("click", () => {
  addToCart(activeProductId);
  closeProductModal();
  openDrawer(cartDrawer);
});

productModal360?.addEventListener("click", () => {
  const product = getProductById(activeProductId);

  closeProductModal();
  showView("vista-360");

  const matchingChoice = [...document.querySelectorAll("[data-cap-360-choice]")].find(
    (choice) => choice.dataset.name === product?.name,
  );

  matchingChoice?.click();
});

const initialHash = window.location.hash.replace("#", "");

if (initialHash === "mujer") {
  activeProductFilter = "mujer";
}

if (initialHash === "catalogo") {
  activeProductFilter = "todos";
}

setProductFilter(activeProductFilter);
renderCart();
renderFavorites();
renderCustomer();
renderCheckoutSummary();
updateActionCounts();
showView(initialHash || "inicio", { skipHash: true, skipScroll: true });

const messageForm = document.querySelector("[data-message-form]");

if (messageForm) {
  const messageStatus = document.querySelector("[data-message-status]");

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = messageForm.querySelector("button[type='submit']");
    const formData = new FormData(messageForm);
    const payload = Object.fromEntries(formData.entries());
    const cartSummaryText = getCartSummaryText();

    if (cartSummaryText) {
      payload.interest = "Seleccion de estilos";
      payload.message = `${payload.message}\n\nSeleccion:\n${cartSummaryText}`;
    }

    submitButton.disabled = true;
    setStatus(messageStatus, "Enviando mensaje...", "neutral");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar");
      }

      messageForm.reset();
      cart = [];
      saveCart();
      setStatus(
        messageStatus,
        "Mensaje recibido. Clover te respondera por el contacto que dejaste.",
        "success",
      );
    } catch {
      setStatus(
        messageStatus,
        "No se pudo enviar el mensaje. Intenta de nuevo con el servidor encendido.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
    }
  });
}

const cap360Image = document.querySelector("[data-cap-360-image]");

if (cap360Image) {
  const cap360Caption = document.querySelector("[data-cap-360-caption]");
  const cap360Choices = document.querySelectorAll("[data-cap-360-choice]");

  cap360Choices.forEach((choice) => {
    choice.addEventListener("click", () => {
      const name = choice.dataset.name || "Clover 360";

      cap360Choices.forEach((button) => {
        const isActive = button === choice;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      cap360Image.src = choice.dataset.image;
      cap360Image.alt = `Vista 360 de la gorra ${name} Clover Golf Co.`;

      if (cap360Caption) {
        cap360Caption.textContent = name;
      }
    });
  });
}

const isAdminPage = document.body.classList.contains("admin-page");

if (isAdminPage) {
  const isRobertRoute = window.location.pathname.startsWith("/robert");
  const adminHomeLink = document.querySelector("[data-admin-home-link]");
  const publicHomeLink = document.querySelector("[data-public-home-link]");
  const loginForm = document.querySelector("[data-admin-login]");
  const loginError = document.querySelector("[data-login-error]");
  const loginTwoFactorField = document.querySelector("[data-login-two-factor-field]");
  const logoutButton = document.querySelector("[data-admin-logout]");
  const refreshButton = document.querySelector("[data-refresh-messages]");
  const securityOpenButton = document.querySelector("[data-security-open]");
  const securityCloseButton = document.querySelector("[data-security-close]");
  const securityModal = document.querySelector("[data-security-modal]");
  const securityGate = document.querySelector("[data-security-gate]");
  const securityUnlocked = document.querySelector("[data-security-unlocked]");
  const twoFactorSetupGate = document.querySelector("[data-two-factor-setup-gate]");
  const twoFactorVerifyGate = document.querySelector("[data-two-factor-verify-gate]");
  const twoFactorSetupForm = document.querySelector("[data-two-factor-setup-form]");
  const twoFactorEnableForm = document.querySelector("[data-two-factor-enable-form]");
  const twoFactorVerifyForm = document.querySelector("[data-two-factor-verify-form]");
  const twoFactorStatus = document.querySelector("[data-two-factor-status]");
  const twoFactorSecretPanel = document.querySelector("[data-two-factor-secret-panel]");
  const twoFactorSecret = document.querySelector("[data-two-factor-secret]");
  const twoFactorSecretInput = document.querySelector("[data-two-factor-secret-input]");
  const accountForm = document.querySelector("[data-account-form]");
  const accountStatus = document.querySelector("[data-account-status]");
  const currentAdminEmail = document.querySelector("[data-current-admin-email]");
  const accountTwoFactorField = document.querySelector("[data-account-two-factor-field]");
  const messageList = document.querySelector("[data-message-list]");
  const emptyMessages = document.querySelector("[data-empty-messages]");
  const messageCount = document.querySelector("[data-message-count]");
  const lastMessage = document.querySelector("[data-last-message]");
  const capImagesByStyle = {
    "Signature Leather": "assets/cap-thumb-signature-leather.png?v=3",
    "Forest Classic": "assets/cap-thumb-forest-classic.png?v=3",
    "Stripe Course": "assets/cap-thumb-stripe-course.png?v=3",
    "Cream Heritage": "assets/cap-thumb-cream-heritage.png?v=3",
    "Olive Performance": "assets/cap-thumb-olive-performance.png?v=3",
    "Tour Cream": "assets/cap-thumb-tour-cream.png?v=3",
    "Women's Bucket Hat": "assets/cap-thumb-womens-bucket.png?v=3",
    "Jiuguva Visor": "assets/cap-thumb-jiuguva-visor.png?v=3",
    "Fairway Classic": "assets/cap-thumb-fairway-classic.png?v=3",
    "Cream Fairway": "assets/cap-thumb-cream-fairway.png?v=3",
  };
  const accountState = {
    twoFactorEnabled: false,
    securityUnlocked: false,
  };
  let pendingTwoFactorPassword = "";

  if (isRobertRoute) {
    adminHomeLink.href = "/robert/admin";
    publicHomeLink.href = "/robert";
  }

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo completar la accion.");
    }

    return payload;
  };

  const formatDate = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const setTwoFactorStatus = (message, type = "neutral") => {
    setStatus(twoFactorStatus, message, type);
  };

  const renderSecurityState = () => {
    if (!securityGate || !securityUnlocked) {
      return;
    }

    securityGate.hidden = accountState.securityUnlocked;
    securityUnlocked.hidden = !accountState.securityUnlocked;

    if (twoFactorSetupGate) {
      twoFactorSetupGate.hidden = accountState.twoFactorEnabled;
    }

    if (twoFactorVerifyGate) {
      twoFactorVerifyGate.hidden = !accountState.twoFactorEnabled;
    }

    if (accountTwoFactorField) {
      accountTwoFactorField.hidden = !accountState.twoFactorEnabled;
      accountTwoFactorField.querySelector("input").required = accountState.twoFactorEnabled;
    }
  };

  const openSecurityModal = () => {
    if (!securityModal) {
      return;
    }

    accountState.securityUnlocked = false;
    securityModal.hidden = false;
    setTwoFactorStatus("", "neutral");
    renderSecurityState();

    if (accountState.twoFactorEnabled) {
      twoFactorVerifyForm?.elements.twoFactorCode?.focus();
      return;
    }

    twoFactorSetupForm?.elements.currentPassword?.focus();
  };

  const closeSecurityModal = () => {
    if (!securityModal) {
      return;
    }

    securityModal.hidden = true;
    accountState.securityUnlocked = false;
    pendingTwoFactorPassword = "";
    twoFactorSetupForm?.reset();
    twoFactorEnableForm?.reset();
    twoFactorVerifyForm?.reset();

    if (twoFactorSecretPanel) {
      twoFactorSecretPanel.hidden = true;
    }

    setTwoFactorStatus("", "neutral");
    renderSecurityState();
  };

  const buildMessageCard = (message) => {
    const article = document.createElement("article");
    article.className = "admin-message-card";

    const top = document.createElement("div");
    top.className = "message-card-top";

    const identity = document.createElement("div");
    identity.className = "message-identity";

    const avatar = document.createElement("span");
    avatar.textContent = (message.name || "C").slice(0, 1).toUpperCase();

    const nameBlock = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = message.name || "Cliente";
    const contact = document.createElement("a");
    contact.href = message.contact?.includes("@") ? `mailto:${message.contact}` : "#";
    contact.textContent = message.contact || "Sin contacto";

    nameBlock.append(name, contact);
    identity.append(avatar, nameBlock);

    const date = document.createElement("time");
    date.dateTime = message.createdAt || "";
    date.textContent = formatDate(message.createdAt);

    top.append(identity, date);

    const content = document.createElement("div");
    content.className = "message-block-grid";

    const requestBlock = document.createElement("section");
    requestBlock.className = "message-info-block";

    const requestTitle = document.createElement("span");
    requestTitle.className = "message-block-label";
    requestTitle.textContent = "Solicitud";

    const details = document.createElement("div");
    details.className = "message-detail-grid";

    [
      ["Motivo", message.interest || "Consulta"],
      ["Estado", message.status || "Nuevo"],
    ].forEach(([label, value]) => {
      const item = document.createElement("span");
      item.textContent = `${label}: ${value}`;
      details.append(item);
    });

    requestBlock.append(requestTitle, details);

    const capBlock = document.createElement("section");
    capBlock.className = "message-cap-block";

    const capTitle = document.createElement("span");
    capTitle.className = "message-block-label";
    capTitle.textContent = "Gorra seleccionada";

    const capImage = document.createElement("img");
    const capStyle = message.capStyle || "No especificado";
    capImage.src = capImagesByStyle[capStyle] || "assets/cap-thumb-cream-fairway.png?v=3";
    capImage.alt = `Gorra seleccionada: ${capStyle}`;

    const capName = document.createElement("strong");
    capName.textContent = capStyle;

    capBlock.append(capTitle, capImage, capName);

    const noteBlock = document.createElement("section");
    noteBlock.className = "message-info-block message-note-block";

    const noteTitle = document.createElement("span");
    noteTitle.className = "message-block-label";
    noteTitle.textContent = "Mensaje del cliente";

    const body = document.createElement("p");
    body.textContent = message.message || "";

    noteBlock.append(noteTitle, body);
    content.append(requestBlock, capBlock, noteBlock);
    article.append(top, content);
    return article;
  };

  const renderMessages = (messages) => {
    messageList.replaceChildren();

    messageCount.textContent = String(messages.length);
    lastMessage.textContent = messages[0] ? formatDate(messages[0].createdAt) : "Sin mensajes";
    emptyMessages.hidden = messages.length > 0;

    messages.forEach((message) => {
      messageList.append(buildMessageCard(message));
    });
  };

  const loadMessages = async () => {
    if (!messageList) {
      return;
    }

    refreshButton.disabled = true;

    try {
      const response = await fetch("/api/messages", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("No se pudo cargar");
      }

      const messages = await response.json();
      renderMessages(Array.isArray(messages) ? messages : []);
    } catch {
      emptyMessages.hidden = false;
      emptyMessages.textContent = "No se pudieron cargar los mensajes.";
    } finally {
      refreshButton.disabled = false;
    }
  };

  const loadAccount = async () => {
    if (!accountForm) {
      return;
    }

    try {
      const account = await requestJson("/api/account", { cache: "no-store" });
      currentAdminEmail.textContent = account.email;
      accountForm.elements.email.value = account.email;
      accountState.twoFactorEnabled = account.twoFactorEnabled === true;
      renderSecurityState();
    } catch {
      setStatus(accountStatus, "No se pudo cargar la cuenta admin.", "error");
    }
  };

  const setAdminAccess = (isAllowed) => {
    document.body.classList.toggle("admin-locked", !isAllowed);

    if (isAllowed) {
      sessionStorage.setItem(adminSessionKey, "true");
      loadMessages();
      loadAccount();
    } else {
      sessionStorage.removeItem(adminSessionKey);
    }
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector("button[type='submit']");
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const twoFactorCode = String(formData.get("twoFactorCode") || "").trim();

    submitButton.disabled = true;
    setStatus(loginError, "Verificando acceso...", "neutral");

    try {
      const loginResponse = await requestJson("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, twoFactorCode }),
      });

      if (loginResponse.requiresTwoFactor) {
        loginTwoFactorField.hidden = false;
        loginTwoFactorField.querySelector("input").required = true;
        loginTwoFactorField.querySelector("input").focus();
        setStatus(loginError, "Ingresa el codigo actual de Google Authenticator.", "neutral");
        return;
      }

      setStatus(loginError, "", "neutral");
      loginForm.reset();
      loginTwoFactorField.hidden = true;
      loginTwoFactorField.querySelector("input").required = false;
      setAdminAccess(true);
    } catch (error) {
      setStatus(loginError, error.message || "Email o password incorrecto.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  securityOpenButton?.addEventListener("click", openSecurityModal);
  securityCloseButton?.addEventListener("click", closeSecurityModal);

  securityModal?.addEventListener("click", (event) => {
    if (event.target === securityModal) {
      closeSecurityModal();
    }
  });

  twoFactorSetupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = twoFactorSetupForm.querySelector("button[type='submit']");
    const formData = new FormData(twoFactorSetupForm);
    const currentPassword = String(formData.get("currentPassword") || "");

    submitButton.disabled = true;
    setTwoFactorStatus("Generando clave segura...", "neutral");

    try {
      const setup = await requestJson("/api/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword }),
      });

      pendingTwoFactorPassword = currentPassword;
      twoFactorSecret.textContent = setup.secretDisplay;
      twoFactorSecretInput.value = setup.secret;
      twoFactorSecretPanel.hidden = false;
      setTwoFactorStatus(
        "Clave generada. Agregala en Google Authenticator y confirma el codigo.",
        "success",
      );
      twoFactorEnableForm.querySelector("input[name='twoFactorCode']").focus();
    } catch (error) {
      setTwoFactorStatus(error.message || "No se pudo generar la clave 2FA.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  twoFactorEnableForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = twoFactorEnableForm.querySelector("button[type='submit']");
    const formData = new FormData(twoFactorEnableForm);
    const secret = String(formData.get("secret") || "");
    const twoFactorCode = String(formData.get("twoFactorCode") || "").trim();

    submitButton.disabled = true;
    setTwoFactorStatus("Activando verificacion 2FA...", "neutral");

    try {
      const account = await requestJson("/api/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: pendingTwoFactorPassword,
          secret,
          twoFactorCode,
        }),
      });

      accountState.twoFactorEnabled = true;
      accountState.securityUnlocked = true;
      pendingTwoFactorPassword = "";
      currentAdminEmail.textContent = account.email;
      accountForm.elements.email.value = account.email;
      twoFactorSetupForm.reset();
      twoFactorEnableForm.reset();
      twoFactorSecretPanel.hidden = true;
      setTwoFactorStatus("", "neutral");
      renderSecurityState();
      setStatus(accountStatus, "2FA activado. Ya puedes actualizar la cuenta.", "success");
    } catch (error) {
      setTwoFactorStatus(error.message || "No se pudo activar 2FA.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  twoFactorVerifyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = twoFactorVerifyForm.querySelector("button[type='submit']");
    const formData = new FormData(twoFactorVerifyForm);
    const twoFactorCode = String(formData.get("twoFactorCode") || "").trim();

    submitButton.disabled = true;
    setTwoFactorStatus("Verificando codigo...", "neutral");

    try {
      await requestJson("/api/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ twoFactorCode }),
      });

      accountState.securityUnlocked = true;
      twoFactorVerifyForm.reset();
      setTwoFactorStatus("", "neutral");
      renderSecurityState();
      accountForm.elements.email.focus();
    } catch (error) {
      setTwoFactorStatus(error.message || "Codigo 2FA incorrecto o vencido.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = accountForm.querySelector("button[type='submit']");
    const formData = new FormData(accountForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const twoFactorCode = String(formData.get("twoFactorCode") || "").trim();

    if (newPassword !== confirmPassword) {
      setStatus(accountStatus, "La nueva contrasena no coincide.", "error");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setStatus(accountStatus, "La nueva contrasena debe tener al menos 8 caracteres.", "error");
      return;
    }

    if (accountState.twoFactorEnabled && !/^\d{6}$/.test(twoFactorCode)) {
      setStatus(accountStatus, "Ingresa el codigo 2FA actual de seis digitos.", "error");
      return;
    }

    submitButton.disabled = true;
    setStatus(accountStatus, "Guardando cambios...", "neutral");

    try {
      const account = await requestJson("/api/account", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, currentPassword, newPassword, twoFactorCode }),
      });

      currentAdminEmail.textContent = account.email;
      accountForm.elements.email.value = account.email;
      accountForm.elements.currentPassword.value = "";
      accountForm.elements.newPassword.value = "";
      accountForm.elements.confirmPassword.value = "";
      if (accountForm.elements.twoFactorCode) {
        accountForm.elements.twoFactorCode.value = "";
      }
      setStatus(accountStatus, "Cuenta actualizada correctamente.", "success");
    } catch (error) {
      setStatus(accountStatus, error.message || "No se pudo actualizar la cuenta.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", () => {
    closeSecurityModal();
    loginTwoFactorField.hidden = true;
    loginTwoFactorField.querySelector("input").required = false;
    setAdminAccess(false);
  });

  refreshButton.addEventListener("click", loadMessages);
  setAdminAccess(sessionStorage.getItem(adminSessionKey) === "true");
}
