/* OC Ortodoncia Avanzada — demo interactiva
   Business name = ONE swappable constant. Todo el texto, en español. */
const CLINIC_NAME = "OC Ortodoncia Avanzada";
const DOCTOR_NAME = "Dr. Edgar Omar Cuevas Mendoza";
const WA_NUMBER = "523322459533";
const WA_DISPLAY = "+52 33 2245 9533";
const waLink = (text) => "https://wa.me/" + WA_NUMBER + (text ? "?text=" + encodeURIComponent(text) : "");

/* ---------- fechas reales: próximos 7 días ---------- */
function next7Days() {
  const fmt = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short" });
  const out = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const label = fmt.format(d);
    out.push({ label: label.charAt(0).toUpperCase() + label.slice(1), iso: d.toISOString().slice(0, 10), date: d });
  }
  return out;
}
const TIME_SLOTS = ["Matutino · 10:00", "Matutino · 11:30", "Vespertino · 16:00", "Vespertino · 17:30"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function nowTime() {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

/* ---------- motor de chat ---------- */
class Chat {
  constructor(root, flow) {
    this.root = root;
    this.flow = flow; // 'hero' | 'simA' | 'simB' | 'simC'
    this.body = root.querySelector(".chat-body");
    this.chipsBox = root.querySelector(".chips");
    this.hint = root.querySelector(".chip-hint");
    this.form = root.querySelector(".composer");
    this.input = root.querySelector(".composer input");
    this.state = {};
    this.awaiting = null; // {key, next} when free text is expected
    this.busy = false;
    this.form.addEventListener("submit", (e) => { e.preventDefault(); this.onText(); });
    this.start();
  }

  start() {
    this.body.innerHTML = "";
    this.state = {};
    this.awaiting = null;
    this.dateLine("Hoy · Asistente clínico");
    if (this.flow === "hero") this.heroStart();
    else if (this.flow === "simA") this.simAStart();
    else if (this.flow === "simB") this.simBStart();
    else if (this.flow === "simC") this.simCStart();
  }

  dateLine(text) {
    const d = document.createElement("div");
    d.className = "chat-date"; d.textContent = text.toUpperCase();
    this.body.appendChild(d);
  }
  scroll() { this.body.scrollTop = this.body.scrollHeight; }
  async bot(text, delay = 650) {
    const t = document.createElement("div");
    t.className = "typing"; t.innerHTML = "<i></i><i></i><i></i>";
    this.body.appendChild(t); this.scroll();
    await wait(delay);
    t.remove();
    const m = document.createElement("div");
    m.className = "msg bot";
    m.innerHTML = text + '<span class="time">' + nowTime() + "</span>";
    this.body.appendChild(m); this.scroll();
  }
  user(text) {
    const m = document.createElement("div");
    m.className = "msg user";
    m.textContent = text;
    const s = document.createElement("span");
    s.className = "time"; s.innerHTML = nowTime() + ' <span class="ticks">✓✓</span>';
    m.appendChild(s);
    this.body.appendChild(m); this.scroll();
  }
  setChips(list, hint) {
    this.chipsBox.innerHTML = "";
    if (hint) { this.hint.textContent = hint; } else { this.hint.textContent = ""; }
    list.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = c.label;
      b.addEventListener("click", () => { this.chipsBox.querySelectorAll(".chip").forEach((x) => (x.disabled = true)); c.onPick(); });
      this.chipsBox.appendChild(b);
    });
  }
  clearChips() { this.chipsBox.innerHTML = ""; this.hint.textContent = ""; }
  async askName() {
    this.awaiting = { key: "name", next: () => this.confirmBooking() };
    await this.bot("Perfecto. ¿Cómo te llamas? Escríbelo aquí abajo y confirmamos tu lugar.");
    this.hint.textContent = "ESCRIBE TU NOMBRE EN EL MENSAJE";
    this.input.focus();
  }
  async confirmBooking() {
    const s = this.state;
    const card = document.createElement("div");
    card.className = "confirm";
    card.innerHTML =
      "<h4>✓ Cita registrada — " + (s.sede || "Guadalajara") + "</h4>" +
      "<ul>" +
      "<li><span>Paciente</span>" + esc(s.name || "") + "</li>" +
      "<li><span>Motivo</span>" + esc(s.symptom || s.forWho || "Valoración") + "</li>" +
      "<li><span>Sede</span>" + esc(s.sede || "") + "</li>" +
      "<li><span>Día</span>" + esc(s.dayLabel || "") + "</li>" +
      "<li><span>Hora</span>" + esc(s.time || "") + "</li>" +
      "</ul>" +
      "<p>Te recordaremos un día antes por WhatsApp. Si necesitas cambiar tu cita, escríbenos al " + WA_DISPLAY + ".</p>" +
      '<a class="wa-link" target="_blank" rel="noopener" href="' + waLink("Hola " + CLINIC_NAME + ", soy " + (s.name || "") + ". Confirmo mi valoración el " + (s.dayLabel || "") + " a las " + (s.time || "") + " en " + (s.sede || "") + ".") + '">Confirmar por WhatsApp →</a>';
    this.body.appendChild(card); this.scroll();
    await this.bot("Listo, " + esc(s.name || "") + ". Tu valoración quedó registrada. Te escribimos un día antes por WhatsApp para recordártela.");
    this.setChips([{ label: "Agendar otra cita", onPick: () => this.start() }], "¿ALGO MÁS?");
  }
  async askSede(next) {
    await this.bot("Contamos con dos sedes. ¿En cuál prefieres tu cita?");
    this.setChips([
      { label: "Guadalajara · Ladrón de Guevara", onPick: async () => { this.user("Guadalajara."); this.state.sede = "Guadalajara — Av. Manuel Acuña 1895"; this.clearChips(); await next(); } },
      { label: "Colima · Médica San Martín", onPick: async () => { this.user("Colima."); this.state.sede = "Colima — Médica San Martín"; this.clearChips(); await next(); } },
    ], "ELIGE TU SEDE");
  }
  async askDay(next) {
    await this.bot("¿Qué día te acomoda? Estos son los próximos 7 días:");
    const days = next7Days();
    this.setChips(days.map((d) => ({
      label: d.label,
      onPick: async () => { this.user(d.label + "."); this.state.dayLabel = d.label; this.state.dayIso = d.iso; this.clearChips(); await next(); },
    })), "PRÓXIMOS 7 DÍAS");
  }
  async askTime(next) {
    await this.bot("¿Prefieres horario matutino o vespertino? Elige una hora:");
    this.setChips(TIME_SLOTS.map((t) => ({
      label: t,
      onPick: async () => { this.user(t + "."); this.state.time = t; this.clearChips(); await next(); },
    })), "ELIGE UNA HORA");
  }
  bookingChain() {
    const chain = async () => this.askSede(async () => this.askDay(async () => this.askTime(async () => this.askName())));
    return chain;
  }

  /* ---------- HERO ---------- */
  async heroStart() {
    await this.bot("Hola, bienvenido a " + CLINIC_NAME + ". Soy el asistente clínico del " + DOCTOR_NAME + ". ¿Qué situación describe mejor tu motivo de consulta hoy?");
    this.setChips([
      { label: "Quiero una valoración", onPick: () => this.heroPatient() },
      { label: "Me duele la mandíbula / truena al masticar", onPick: () => this.heroPain() },
      { label: "Soy dentista — curso biomecánica 2027", onPick: () => this.heroCourse() },
    ], "PRUEBA UNA CONSULTA DE EJEMPLO:");
  }
  async heroPatient() {
    this.user("Hola, quiero una valoración para ortodoncia avanzada.");
    await this.bot("¡Excelente decisión! Para valorar tu caso usamos el protocolo C-IBOS®: análisis facial, biomecánica y tomografía 3D.");
    await this.bot("¿Qué te gustaría revisar en tu valoración?");
    this.setChips([
      { label: "Alineación de dientes", onPick: async () => { this.user("Alineación de dientes."); this.state.symptom = "Alineación de dientes"; this.clearChips(); await this.bookingChain()(); } },
      { label: "Dolor de mandíbula / ATM", onPick: async () => { this.user("Dolor de mandíbula / ATM."); this.state.symptom = "Dolor de mandíbula / ATM"; this.clearChips(); await this.bot("Entendido — lo marcamos como caso de articulación para que el equipo lo revise con prioridad."); await this.bookingChain()(); } },
      { label: "Alineadores invisibles", onPick: async () => { this.user("Alineadores invisibles."); this.state.symptom = "Alineadores invisibles"; this.clearChips(); await this.bookingChain()(); } },
      { label: "Otro motivo", onPick: async () => { this.user("Otro motivo."); this.state.symptom = "Valoración general"; this.clearChips(); await this.bookingChain()(); } },
    ], "ELIGE TU MOTIVO");
  }
  async heroPain() {
    this.user("Me duele la mandíbula al masticar y me truena del lado derecho.");
    await this.bot("⚠️ Triage articular detectado: estos síntomas corresponden a una alteración en la articulación temporomandibular (ATM).");
    await this.bot("Te canalizamos con prioridad. Mientras asistes a valoración: evita alimentos duros, no fuerces la apertura y no mastiques chicle. ¿Deseas cita prioritaria para revisión con el Dr. Cuevas?");
    this.setChips([
      { label: "Sí, quiero cita prioritaria", onPick: async () => { this.user("Sí, quiero cita prioritaria."); this.clearChips(); await this.bot("Tu caso pasa directo al equipo — te contactamos hoy mismo para coordinar tu valoración prioritaria."); await this.bot("Vamos a apartar tu lugar. Elige sede, día y hora:"); await this.bookingChain()(); } },
      { label: "Solo información por ahora", onPick: async () => { this.user("Solo información por ahora."); this.clearChips(); await this.bot("Claro. El dolor de mandíbula y los chasquidos se atienden en la clínica con un protocolo de ATM: valoración articular, férulas y seguimiento. Cuando quieras, aquí mismo puedes agendar tu valoración."); this.setChips([{ label: "Agendar valoración", onPick: () => this.heroPatient() }], "CUANDO QUIERAS"); } },
    ], "¿CITA PRIORITARIA?");
  }
  async heroCourse() {
    this.user("Soy dentista. Me interesa información sobre el curso de Biomecánica Clínica de enero 2027.");
    await this.bot("¡Colega, qué gusto saludarte! El curso intensivo C-IBOS® se llevará a cabo el 22 y 23 de enero de 2027 en Guadalajara, en alianza con American Orthodontics®.");
    await this.bot("Para enviarte el programa completo por WhatsApp, ¿cómo te llamas?");
    this.awaiting = { key: "courseName", next: () => this.courseCedula() };
    this.hint.textContent = "ESCRIBE TU NOMBRE";
  }
  async courseCedula() {
    await this.bot("Gracias, " + esc(this.state.courseName) + ". Ahora compártenos tu cédula profesional para registrarte como colega.");
    this.awaiting = { key: "courseCedula", next: () => this.courseCity() };
    this.hint.textContent = "ESCRIBE TU CÉDULA PROFESIONAL";
  }
  async courseCity() {
    await this.bot("¿Desde qué ciudad nos escribes?");
    this.setChips([
      { label: "Guadalajara", onPick: async () => { this.user("Guadalajara."); this.state.courseCity = "Guadalajara"; this.clearChips(); await this.courseConfirm(); } },
      { label: "Colima", onPick: async () => { this.user("Colima."); this.state.courseCity = "Colima"; this.clearChips(); await this.courseConfirm(); } },
      { label: "Otra ciudad", onPick: async () => { this.user("Otra ciudad."); this.awaiting = { key: "courseCity", next: () => this.courseConfirm() }; await this.bot("¿Cuál ciudad? Escríbela aquí abajo."); this.hint.textContent = "ESCRIBE TU CIUDAD"; } },
    ], "ELIGE TU CIUDAD");
  }
  async courseConfirm() {
    const card = document.createElement("div");
    card.className = "confirm";
    card.innerHTML =
      "<h4>✓ Pre-registro — Curso intensivo C-IBOS®</h4>" +
      "<ul><li><span>Colega</span>" + esc(this.state.courseName || "") + "</li>" +
      "<li><span>Cédula</span>" + esc(this.state.courseCedula || "") + "</li>" +
      "<li><span>Ciudad</span>" + esc(this.state.courseCity || "") + "</li>" +
      "<li><span>Curso</span>22 y 23 de enero de 2027 · Guadalajara</li></ul>" +
      "<p>Te enviamos el programa completo por WhatsApp.</p>";
    this.body.appendChild(card); this.scroll();
    await this.bot("Listo. Te enviamos el programa completo por WhatsApp. El cupo es limitado para garantizar práctica personalizada. ¡Quedas pre-registrado!");
    this.setChips([{ label: "Volver al inicio", onPick: () => this.start() }], "¿ALGO MÁS?");
  }

  /* ---------- SIMULADOR (El Bot) ---------- */
  async simAStart() {
    await this.bot("¡Hola! Bienvenido a " + CLINIC_NAME + ". Soy el asistente clínico automatizado del " + DOCTOR_NAME + ". Con gusto te ayudo a agendar tu valoración especializada. ¿Para quién sería la consulta?");
    this.setChips([
      { label: "Para mí (adulto)", onPick: async () => { this.user("Para mí (adulto)."); this.state.forWho = "Para mí (adulto)"; this.state.symptom = "Valoración · adulto"; this.clearChips(); await this.bookingChain()(); } },
      { label: "Para un menor de edad", onPick: async () => { this.user("Para un menor de edad."); this.state.forWho = "Para un menor de edad"; this.state.symptom = "Valoración · menor de edad"; this.clearChips(); await this.bookingChain()(); } },
    ], "¿PARA QUIÉN ES LA CONSULTA?");
  }
  async simBStart() {
    await this.bot("⚠️ Detectamos un cuadro clínico relacionado con la articulación temporomandibular (ATM) o dolor orofacial.");
    await this.bot("Tu caso pasa directo al equipo clínico como prioridad alta. Te contactaremos hoy mismo para coordinar una valoración urgente con el Dr. Cuevas Mendoza.");
    this.setChips([
      { label: "Reportar dolor agudo ahora", onPick: async () => { this.user("Reportar dolor agudo ahora."); this.clearChips(); await this.bot("🚨 Notificación de triage enviada al equipo clínico. Por favor mantén tu línea disponible: un miembro del equipo te contactará hoy mismo."); await this.bot("¿Quieres que además apartemos tu valoración prioritaria?"); this.setChips([{ label: "Sí, agendar valoración prioritaria", onPick: async () => { this.user("Sí, agendar valoración prioritaria."); this.state.symptom = "Dolor mandibular / ATM — prioridad alta"; this.clearChips(); await this.bookingChain()(); } }, { label: "No, solo esperar su llamada", onPick: async () => { this.user("No, solo esperar su llamada."); this.clearChips(); await this.bot("Perfecto. Te contactamos hoy mismo. Mientras tanto: evita alimentos duros y no fuerces la apertura."); this.setChips([{ label: "Volver al inicio", onPick: () => this.start() }], "¿ALGO MÁS?"); } }], "¿APARTAMOS TU LUGAR?"); } },
      { label: "Indicar sede de preferencia", onPick: async () => { this.user("Quiero indicar mi sede de preferencia."); this.state.symptom = "Dolor mandibular / ATM — prioridad alta"; this.clearChips(); await this.bot("Tu caso ya quedó marcado como prioridad alta. Elige tu sede y apartamos tu valoración:"); await this.askSede(async () => this.askDay(async () => this.askTime(async () => this.askName()))); } },
    ], "¿QUÉ HACEMOS AHORA?");
  }
  async simCStart() {
    await this.bot("Colega, bienvenido. El curso intensivo C-IBOS® se llevará a cabo el 22 y 23 de enero de 2027 en Guadalajara, en alianza con American Orthodontics®.");
    await this.bot("Para enviarte el temario completo y los requisitos de registro, ¿cómo te llamas?");
    this.awaiting = { key: "courseName", next: () => this.courseCedula() };
    this.hint.textContent = "ESCRIBE TU NOMBRE";
  }

  /* ---------- texto libre ---------- */
  async onText() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = "";
    this.user(text);
    this.clearChips();
    const aw = this.awaiting;
    if (aw) {
      this.awaiting = null;
      this.state[aw.key] = text;
      await aw.next();
      return;
    }
    // Fallback sensato + re-ofrecer el inicio del flujo
    const low = text.toLowerCase();
    if (/(dolor|duele|truena|mand[ií]bula|atm|chasquido)/.test(low)) { await this.heroPain(); return; }
    if (/(curso|dentista|colega|c-ibos|biomec)/.test(low)) { await this.heroCourse(); return; }
    await this.bot("Gracias por escribir. Puedo ayudarte a agendar una valoración, atender un dolor de mandíbula o darte información del curso de enero 2027. Elige una opción:");
    if (this.flow === "hero") {
      this.setChips([
        { label: "Quiero una valoración", onPick: () => this.heroPatient() },
        { label: "Me duele la mandíbula", onPick: () => this.heroPain() },
        { label: "Soy dentista — curso 2027", onPick: () => this.heroCourse() },
      ], "ELIGE UNA OPCIÓN");
    } else if (this.flow === "simA") { await this.simAStart(); }
    else if (this.flow === "simB") { await this.simBStart(); }
    else if (this.flow === "simC") { await this.simCStart(); }
  }
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- arranque de chats ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-chat]").forEach((el) => {
    const chat = new Chat(el, el.dataset.chat);
    el._chat = chat;
    const resetBtn = el.querySelector(".chat-reset");
    if (resetBtn) resetBtn.addEventListener("click", () => chat.start());
  });

  /* pestañas del simulador */
  const tabs = document.querySelectorAll(".flow-tab");
  const simRoot = document.querySelector('[data-chat^="sim"]');
  if (tabs.length && simRoot) {
    const sim = simRoot._chat;
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.remove("on"));
        t.classList.add("on");
        sim.flow = t.dataset.flow;
        sim.start();
        const st = document.querySelector(".sim-status");
        if (st) st.textContent = t.dataset.status || "";
      });
    });
    const resetSim = document.querySelector(".sim-reset");
    if (resetSim) resetSim.addEventListener("click", () => sim.start());
  }

  /* acordeones: lecturas + FAQ */
  document.querySelectorAll(".lectura > button, .faq-item > button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      item.classList.toggle("open");
      const chev = btn.querySelector(".chev");
      if (chev) chev.textContent = item.classList.contains("open") ? "−" : "+";
      btn.setAttribute("aria-expanded", item.classList.contains("open"));
    });
  });

  /* ---------- flujo de reserva (Sedes) ---------- */
  const booking = document.querySelector(".booking");
  if (booking) {
    const st = { sede: "Guadalajara", tipo: "Valoración general", day: null, dayLabel: "", time: "", name: "" };
    const dayWrap = booking.querySelector(".day-chips");
    const timeWrap = booking.querySelector(".time-chips");
    const nameInput = booking.querySelector("#bk-name");
    const summary = booking.querySelector(".booking-summary");
    const confirmBtn = booking.querySelector(".bk-confirm");
    const waBtn = booking.querySelector(".bk-wa");

    next7Days().forEach((d) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "day-chip"; b.textContent = d.label;
      b.addEventListener("click", () => {
        dayWrap.querySelectorAll(".day-chip").forEach((x) => x.classList.remove("on"));
        b.classList.add("on"); st.day = d.iso; st.dayLabel = d.label; render();
      });
      dayWrap.appendChild(b);
    });
    TIME_SLOTS.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "time-chip"; b.textContent = t;
      b.addEventListener("click", () => {
        timeWrap.querySelectorAll(".time-chip").forEach((x) => x.classList.remove("on"));
        b.classList.add("on"); st.time = t; render();
      });
      timeWrap.appendChild(b);
    });
    booking.querySelectorAll(".sede-seg button").forEach((b) => {
      b.addEventListener("click", () => {
        booking.querySelectorAll(".sede-seg button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on"); st.sede = b.dataset.sede; render();
      });
    });
    const tipoSel = booking.querySelector("#bk-tipo");
    if (tipoSel) tipoSel.addEventListener("change", () => { st.tipo = tipoSel.value; render(); });
    if (nameInput) nameInput.addEventListener("input", () => { st.name = nameInput.value.trim(); render(); });

    function sedeAddr() {
      return st.sede === "Colima" ? "Colima — Médica San Martín, Av. Ignacio Sandoval 1001" : "Guadalajara — Av. Manuel Acuña 1895, Ladrón de Guevara";
    }
    function render() {
      const ready = st.day && st.time && st.name;
      summary.innerHTML =
        "<h4>Resumen de tu solicitud</h4><ul>" +
        "<li><span>Sede</span>" + esc(sedeAddr()) + "</li>" +
        "<li><span>Motivo</span>" + esc(st.tipo) + "</li>" +
        "<li><span>Día</span>" + esc(st.dayLabel || "Elige un día") + "</li>" +
        "<li><span>Hora</span>" + esc(st.time || "Elige una hora") + "</li>" +
        "<li><span>Nombre</span>" + esc(st.name || "Escríbelo abajo") + "</li></ul>" +
        (ready ? "<p style='margin-top:10px'>Te recordaremos un día antes por WhatsApp.</p>" : "<p style='margin-top:10px;color:#9DB8B2'>Completa día, hora y nombre para continuar por WhatsApp.</p>");
      if (ready) {
        const msg = "Hola " + CLINIC_NAME + ", soy " + st.name + ". Quiero agendar " + st.tipo.toLowerCase() + " el " + st.dayLabel + " a las " + st.time + " en " + sedeAddr() + ".";
        waBtn.href = waLink(msg);
        waBtn.style.display = "inline-block";
        confirmBtn.disabled = false;
      } else {
        waBtn.style.display = "none";
        confirmBtn.disabled = true;
      }
    }
    confirmBtn.addEventListener("click", () => {
      if (!(st.day && st.time && st.name)) return;
      summary.innerHTML =
        "<h4>✓ Solicitud lista — " + esc(st.sede) + "</h4><ul>" +
        "<li><span>Paciente</span>" + esc(st.name) + "</li>" +
        "<li><span>Motivo</span>" + esc(st.tipo) + "</li>" +
        "<li><span>Sede</span>" + esc(sedeAddr()) + "</li>" +
        "<li><span>Día</span>" + esc(st.dayLabel) + "</li>" +
        "<li><span>Hora</span>" + esc(st.time) + "</li></ul>" +
        "<p style='margin-top:10px'>Te recordaremos un día antes por WhatsApp. Continúa en WhatsApp para confirmar con el equipo.</p>";
      waBtn.style.display = "inline-block";
      summary.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    render();
  }

  /* año del pie */
  document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));
});
