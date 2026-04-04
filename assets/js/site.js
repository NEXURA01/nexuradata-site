const yearTarget = document.querySelector("[data-year]");

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const revealElements = document.querySelectorAll("[data-reveal]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const showAllReveals = () => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
};

if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
  showAllReveals();
} else if (revealElements.length > 0) {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();

    target.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });
});

const intakeForm = document.querySelector("[data-intake-form]");

if (intakeForm) {
  const statusTarget = intakeForm.querySelector("[data-form-status]");

  intakeForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!intakeForm.checkValidity()) {
      intakeForm.reportValidity();

      if (statusTarget) {
        statusTarget.dataset.state = "error";
        statusTarget.textContent = "Complétez les champs requis avant de préparer la demande.";
      }

      return;
    }

    const formData = new FormData(intakeForm);
    const subject = `Demande NEXURA - ${formData.get("support")} - ${formData.get("urgence")}`;
    const bodyLines = [
      `Nom: ${formData.get("nom") || ""}`,
      `Courriel: ${formData.get("courriel") || ""}`,
      `Téléphone: ${formData.get("telephone") || ""}`,
      `Profil: ${formData.get("profil") || ""}`,
      `Support: ${formData.get("support") || ""}`,
      `Urgence: ${formData.get("urgence") || ""}`,
      "",
      "Description du problème:",
      `${formData.get("message") || ""}`
    ];

    if (statusTarget) {
      statusTarget.dataset.state = "success";
      statusTarget.textContent = "Ouverture de votre application courriel avec un message prérempli.";
    }

    window.location.href = `mailto:contact@nexura.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  });
}

const statusForm = document.querySelector("[data-status-form]");

if (statusForm) {
  const messageTarget = statusForm.querySelector("[data-status-form-message]");
  const statusPanel = document.querySelector("[data-status-panel]");
  const isLocalPreview = window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const demoCases = {
    "NX-2026-0412|MONTREAL24": {
      status: "Évaluation en cours",
      updated: "4 avril 2026 à 11 h 40",
      support: "Disque externe USB",
      next: "Communication de l'évaluation initiale",
      summary: "Le support a été reçu et enregistré. L'évaluation initiale est en cours avant l'envoi de la soumission ou des prochaines étapes.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et pris en charge.", state: "complete" },
        { title: "Évaluation en cours", note: "Lecture initiale et qualification du cas.", state: "active" },
        { title: "Soumission", note: "À transmettre après évaluation.", state: "pending" },
        { title: "Traitement", note: "Commence après autorisation.", state: "pending" }
      ]
    },
    "NX-2026-0419|RAIDSECURE": {
      status: "Soumission envoyée",
      updated: "4 avril 2026 à 10 h 15",
      support: "RAID / NAS",
      next: "Attente de l'autorisation client",
      summary: "L'évaluation initiale a été complétée. La soumission et le cadre d'intervention ont été transmis au client pour acceptation.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et enregistré.", state: "complete" },
        { title: "Évaluation", note: "Analyse initiale terminée.", state: "complete" },
        { title: "Soumission envoyée", note: "En attente d'acceptation.", state: "active" },
        { title: "Traitement", note: "Débute après autorisation.", state: "pending" }
      ]
    }
  };

  const renderStatusStep = (step) => {
    const article = document.createElement("article");
    article.className = `status-step status-step-${step.state}`;

    const title = document.createElement("p");
    title.className = "status-step-title";
    title.textContent = step.title;

    const note = document.createElement("p");
    note.className = "status-step-note";
    note.textContent = step.note;

    article.append(title, note);
    return article;
  };

  statusForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!statusForm.checkValidity()) {
      statusForm.reportValidity();

      if (messageTarget) {
        messageTarget.dataset.state = "error";
        messageTarget.textContent = "Entrez un numéro de dossier et un code d'accès valides.";
      }

      return;
    }

    const formData = new FormData(statusForm);
    const dossier = `${formData.get("dossier") || ""}`.trim().toUpperCase();
    const code = `${formData.get("code") || ""}`.trim().toUpperCase();
    const key = `${dossier}|${code}`;
    const record = isLocalPreview ? demoCases[key] : null;

    if (!isLocalPreview) {
      if (statusPanel) {
        statusPanel.hidden = true;
      }

      if (messageTarget) {
        messageTarget.dataset.state = "error";
        messageTarget.textContent = "Le suivi sécurisé en ligne doit être branché à un accès serveur dédié avant activation publique.";
      }

      return;
    }

    if (!record) {
      if (statusPanel) {
        statusPanel.hidden = true;
      }

      if (messageTarget) {
        messageTarget.dataset.state = "error";
        messageTarget.textContent = "Aucun dossier n'a été trouvé avec cet accès. Vérifiez les identifiants transmis par NEXURA ou demandez une mise à jour.";
      }

      return;
    }

    if (messageTarget) {
      messageTarget.dataset.state = "success";
      messageTarget.textContent = "Dossier trouvé.";
    }

    if (!statusPanel) {
      return;
    }

    statusPanel.hidden = false;
    const caseTarget = statusPanel.querySelector("[data-status-case]");
    const badgeTarget = statusPanel.querySelector("[data-status-badge]");
    const updatedTarget = statusPanel.querySelector("[data-status-updated]");
    const supportTarget = statusPanel.querySelector("[data-status-support]");
    const nextTarget = statusPanel.querySelector("[data-status-next]");
    const summaryTarget = statusPanel.querySelector("[data-status-summary]");
    const timelineTarget = statusPanel.querySelector("[data-status-timeline]");

    if (caseTarget) caseTarget.textContent = dossier;
    if (badgeTarget) badgeTarget.textContent = record.status;
    if (updatedTarget) updatedTarget.textContent = record.updated;
    if (supportTarget) supportTarget.textContent = record.support;
    if (nextTarget) nextTarget.textContent = record.next;
    if (summaryTarget) summaryTarget.textContent = record.summary;

    if (timelineTarget) {
      timelineTarget.replaceChildren(...record.steps.map(renderStatusStep));
    }
  });
}
