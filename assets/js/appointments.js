// /assets/js/appointments.js
// Booking widget. Hooks any [data-appt-root] container.
(function () {
    const root = document.querySelector("[data-appt-root]");
    if (!root) return;

    const locale = (document.documentElement.getAttribute("lang") || "fr").startsWith("en") ? "en" : "fr";
    const T = locale === "fr"
        ? {
            loading: "Chargement des créneaux disponibles…",
            noSlots: "Aucun créneau disponible. Écrivez à dossiers@nexuradata.ca pour un délai plus court.",
            pickDate: "Choisissez une date",
            pickTime: "Choisissez une heure",
            details: "Vos coordonnées",
            name: "Nom complet",
            email: "Courriel",
            phone: "Téléphone (facultatif)",
            supportType: "Type d'appareil",
            supportPlaceholder: "Ex.: SSD 1 To, NAS Synology, iPhone 14, RAID 5…",
            notes: "Notes (facultatif)",
            notesPlaceholder: "Symptômes, urgence, contexte…",
            submit: "Réserver le créneau",
            submitting: "Enregistrement…",
            ok: "✔ Rendez-vous enregistré.",
            okSub: "Vous recevez à l'instant une confirmation par courriel avec votre référence.",
            ref: "Référence&nbsp;:",
            addr: "Adresse exacte transmise dans la confirmation. Stationnement gratuit, accès sans escalier.",
            consent: "En réservant, vous acceptez d'être contacté à propos de ce rendez-vous.",
            slotsLabel: (n) => n === 1 ? "1 créneau" : (n + " créneaux"),
            weekdays: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
            months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
            error: "Une erreur est survenue. Réessayez."
        }
        : {
            loading: "Loading available slots…",
            noSlots: "No slots available. Email dossiers@nexuradata.ca for a faster turnaround.",
            pickDate: "Pick a date",
            pickTime: "Pick a time",
            details: "Your contact info",
            name: "Full name",
            email: "Email",
            phone: "Phone (optional)",
            supportType: "Device type",
            supportPlaceholder: "e.g., 1 TB SSD, Synology NAS, iPhone 14, RAID 5…",
            notes: "Notes (optional)",
            notesPlaceholder: "Symptoms, urgency, context…",
            submit: "Book this slot",
            submitting: "Saving…",
            ok: "✔ Appointment booked.",
            okSub: "You're getting an email confirmation right now with your reference.",
            ref: "Reference:",
            addr: "Exact address sent in the confirmation. Free parking, step-free access.",
            consent: "By booking, you agree to be contacted about this appointment.",
            slotsLabel: (n) => n === 1 ? "1 slot" : (n + " slots"),
            weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            error: "Something went wrong. Please try again."
        };

    let days = [];
    let selectedDate = null;
    let selectedTime = null;

    root.innerHTML = `
    <div class="appt-status" data-appt-status>${T.loading}</div>
    <div class="appt-grid" hidden>
      <section class="appt-step">
        <h3>${T.pickDate}</h3>
        <div class="appt-days" data-appt-days></div>
      </section>
      <section class="appt-step">
        <h3>${T.pickTime}</h3>
        <div class="appt-times" data-appt-times>—</div>
      </section>
    </div>
    <form class="appt-form" data-appt-form hidden novalidate>
      <h3>${T.details}</h3>
      <label class="appt-field">
        <span>${T.name}</span>
        <input name="name" required maxlength="100" autocomplete="name">
      </label>
      <label class="appt-field">
        <span>${T.email}</span>
        <input name="email" type="email" required maxlength="200" autocomplete="email">
      </label>
      <label class="appt-field">
        <span>${T.phone}</span>
        <input name="phone" type="tel" maxlength="40" autocomplete="tel">
      </label>
      <label class="appt-field">
        <span>${T.supportType}</span>
        <input name="supportType" maxlength="80" placeholder="${T.supportPlaceholder}">
      </label>
      <label class="appt-field">
        <span>${T.notes}</span>
        <textarea name="notes" maxlength="1000" rows="3" placeholder="${T.notesPlaceholder}"></textarea>
      </label>
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="appt-hp" aria-hidden="true">
      <p class="appt-consent">${T.consent}</p>
      <button type="submit" class="appt-submit">${T.submit}</button>
      <p class="appt-result" data-appt-result hidden></p>
    </form>
  `;

    const elStatus = root.querySelector("[data-appt-status]");
    const elGrid = root.querySelector(".appt-grid");
    const elDays = root.querySelector("[data-appt-days]");
    const elTimes = root.querySelector("[data-appt-times]");
    const elForm = root.querySelector("[data-appt-form]");
    const elResult = root.querySelector("[data-appt-result]");
    const elSubmit = elForm.querySelector(".appt-submit");

    const fmtDate = (iso) => {
        const [y, m, d] = iso.split("-").map(Number);
        const dd = new Date(Date.UTC(y, m - 1, d));
        return `${T.weekdays[dd.getUTCDay()]} ${d} ${T.months[m - 1]}`;
    };

    const renderDays = () => {
        elDays.innerHTML = "";
        for (const day of days) {
            if (!day.available || !day.available.length) continue;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "appt-day";
            btn.dataset.date = day.date;
            btn.innerHTML = `<strong>${fmtDate(day.date)}</strong><span>${T.slotsLabel(day.available.length)}</span>`;
            if (day.date === selectedDate) btn.classList.add("is-active");
            btn.addEventListener("click", () => {
                selectedDate = day.date;
                selectedTime = null;
                renderDays();
                renderTimes();
                elForm.hidden = true;
            });
            elDays.appendChild(btn);
        }
    };

    const renderTimes = () => {
        elTimes.innerHTML = "";
        if (!selectedDate) { elTimes.textContent = "—"; return; }
        const day = days.find((d) => d.date === selectedDate);
        if (!day) return;
        for (const t of day.available) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "appt-time";
            btn.textContent = t;
            btn.dataset.time = t;
            if (t === selectedTime) btn.classList.add("is-active");
            btn.addEventListener("click", () => {
                selectedTime = t;
                renderTimes();
                elForm.hidden = false;
                elForm.querySelector('input[name="name"]').focus();
            });
            elTimes.appendChild(btn);
        }
    };

    fetch("/api/appointments/availability?days=14")
        .then((r) => r.json())
        .then((data) => {
            if (!data.ok) throw new Error("api");
            days = (data.days || []).filter((d) => d.available && d.available.length);
            if (!days.length) { elStatus.textContent = T.noSlots; return; }
            elStatus.hidden = true;
            elGrid.hidden = false;
            renderDays();
        })
        .catch(() => { elStatus.textContent = T.error; });

    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return;
        if (elForm.elements.website.value) return; // honeypot
        elSubmit.disabled = true;
        elSubmit.textContent = T.submitting;
        elResult.hidden = true;
        elResult.classList.remove("is-error");

        try {
            const r = await fetch("/api/appointments/book", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    slotDate: selectedDate,
                    slotTime: selectedTime,
                    name: elForm.elements.name.value,
                    email: elForm.elements.email.value,
                    phone: elForm.elements.phone.value,
                    supportType: elForm.elements.supportType.value,
                    notes: elForm.elements.notes.value,
                    locale,
                    website: elForm.elements.website.value
                })
            });
            const data = await r.json();
            if (!r.ok || !data.ok) throw new Error(data.message || T.error);

            elForm.querySelectorAll("input,textarea,button").forEach((el) => { el.disabled = true; });
            elResult.hidden = false;
            elResult.innerHTML = `<strong>${T.ok}</strong><br>${T.okSub}<br><br>${T.ref} <code>${data.ref}</code><br><small>${T.addr}</small>`;
        } catch (err) {
            elResult.hidden = false;
            elResult.classList.add("is-error");
            elResult.textContent = (err && err.message) || T.error;
            elSubmit.disabled = false;
            elSubmit.textContent = T.submit;
        }
    });
})();
