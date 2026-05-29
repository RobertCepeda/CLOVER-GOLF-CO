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

const messageForm = document.querySelector("[data-message-form]");

if (messageForm) {
  const messageStatus = document.querySelector("[data-message-status]");

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = messageForm.querySelector("button[type='submit']");
    const formData = new FormData(messageForm);
    const payload = Object.fromEntries(formData.entries());

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
    "Signature Leather": "assets/cap-signature-leather.png?v=4",
    "Forest Classic": "assets/cap-forest-classic.png?v=4",
    "Stripe Course": "assets/cap-stripe-course.png?v=4",
    "Cream Heritage": "assets/cap-cream-heritage.png?v=4",
    "Olive Performance": "assets/cap-olive-performance.png?v=4",
    "Tour Cream": "assets/cap-tour-cream.png?v=4",
    "Women's Bucket Hat": "assets/cap-womens-bucket.png?v=4",
    "Jiuguva Visor": "assets/cap-womens-visor.png?v=4",
    "Fairway Classic": "assets/cap-womens-fairway-classic.png?v=4",
    "Cream Fairway": "assets/cap-womens-cream-fairway.png?v=4",
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
    capImage.src = capImagesByStyle[capStyle] || "assets/cap-womens-cream-fairway.png?v=4";
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
