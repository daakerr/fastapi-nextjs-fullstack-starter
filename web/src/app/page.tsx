"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/* Icône du sprite SVG */
const Ic = ({ id, style }: { id: string; style?: CSSProperties }) => (
  <svg className="ic" style={style}>
    <use href={`#${id}`} />
  </svg>
);

const DEADLINE = new Date("2026-09-01T00:00:00+02:00");

/* Offre fondateur.
   PRODUCTION : remplacer par le nombre RÉEL d'abonnés fondateurs (base de données).
   Règle Sireno : jamais de faux compteur. */
const FONDATEUR_TOTAL = 100;
const FONDATEUR_PRIS = 0;

type Temps = { j: number | string; h: string; m: string; s: string; passe: boolean };
type Verdict = { nom: string; detail: string; demo: boolean };
type Niveau = { t: string; p: string; etat: "fait" | "encours" | "verrou"; label: string; n?: number };
type Feat = { ic: string; tag: string; tagL: string; t: string; p: string };

function luhnValide(num: string): boolean {
  let somme = 0;
  for (let i = 0; i < num.length; i++) {
    let d = parseInt(num[num.length - 1 - i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    somme += d;
  }
  return somme % 10 === 0;
}

export default function Landing() {
  /* Compte à rebours */
  const [temps, setTemps] = useState<Temps>({ j: "–", h: "–", m: "–", s: "–", passe: false });
  useEffect(() => {
    const maj = () => {
      const diff = DEADLINE.getTime() - Date.now();
      if (diff <= 0) return setTemps({ j: 0, h: "00", m: "00", s: "00", passe: true });
      setTemps({
        j: Math.floor(diff / 86400000),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
        passe: false,
      });
    };
    maj();
    const t = setInterval(maj, 1000);
    return () => clearInterval(t);
  }, []);

  /* SIREN + verdict */
  const [siren, setSiren] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [email, setEmail] = useState("");
  const resultatRef = useRef<HTMLDivElement | null>(null);

  const formaterSiren = (v: string) =>
    v.replace(/\D/g, "").slice(0, 9).replace(/(\d{3})(?=\d)/g, "$1 ");

  async function verifierSiren() {
    const brut = siren.replace(/\D/g, "");
    if (brut.length !== 9 || !luhnValide(brut)) {
      setErreur("Un SIREN contient 9 chiffres. Vérifiez sur une facture, votre Kbis ou votre avis INSEE.");
      return;
    }
    setErreur("");
    setChargement(true);
    try {
      const r = await fetch(`/api/siren?siren=${brut}`);
      const data = await r.json();
      if (data.trouve) {
        afficherVerdict({
          nom: data.nom,
          detail: [data.codePostal && data.ville ? `${data.codePostal} ${data.ville}` : data.ville, data.actif ? "En activité" : "Cessée (INSEE)"]
            .filter(Boolean)
            .join(" · "),
          demo: false,
        });
      } else if (data.erreur) {
        montrerToast("Service de vérification momentanément indisponible. Réessayez dans un instant.");
      } else {
        setErreur("SIREN introuvable dans l'annuaire des entreprises. Vérifiez le numéro.");
      }
    } catch {
      montrerToast("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setChargement(false);
    }
  }

  function modeDecouverte() {
    setErreur("");
    setSiren("");
    afficherVerdict({
      nom: "ATELIER ROUSSEAU (exemple)",
      detail: "Micro-entreprise fictive · Lyon (69) · Franchise de TVA",
      demo: true,
    });
    montrerToast("Ceci est un exemple. Entrez votre SIREN pour votre verdict réel.");
  }

  function afficherVerdict(v: Verdict) {
    setVerdict(v);
    confettis();
    setTimeout(() => resultatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function capturerEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      montrerToast("Vérifiez votre adresse email.");
      return;
    }
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), siren: siren.replace(/\D/g, "") }),
      });
      if (r.ok) {
        montrerToast("C'est noté. Votre plan d'action arrive par email.");
        setEmail("");
      } else montrerToast("Une erreur est survenue. Réessayez.");
    } catch {
      montrerToast("Connexion impossible. Réessayez.");
    }
  }

  /* Audit express */
  const [auditEtape, setAuditEtape] = useState(0); // 0 idle, 1 scan, 2..4 résultats, 5 score
  function lancerAudit() {
    if (auditEtape > 0) return;
    setAuditEtape(1);
    setTimeout(() => setAuditEtape(2), 900);
    setTimeout(() => setAuditEtape(3), 1600);
    setTimeout(() => setAuditEtape(4), 2300);
    setTimeout(() => setAuditEtape(5), 3000);
  }

  /* Paywall + fonctionnalités + toast */
  const [paywall, setPaywall] = useState(false);
  const [featsOuvert, setFeatsOuvert] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function montrerToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setPaywall(false);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* Confettis sobres */
  function confettis() {
    const couleurs = ["#1B2A6B", "#3D55D8", "#16A34A", "#3ECF6E"];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = couleurs[Math.floor(Math.random() * couleurs.length)];
      c.style.animationDuration = 1.1 + Math.random() * 0.9 + "s";
      c.style.animationDelay = Math.random() * 0.3 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
  }

  /* Reveal au scroll + barres animées */
  const [gpsRempli, setGpsRempli] = useState(false);
  const [fondateurVu, setFondateurVu] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.classList.add("vu");
            obs.unobserve(el);
            if (el.dataset.anim === "gps") setTimeout(() => setGpsRempli(true), 250);
            if (el.dataset.anim === "fondateur") setTimeout(() => setFondateurVu(true), 300);
          }
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const niveaux: Niveau[] = [
    { t: "Comprendre vos obligations", p: "Vos dates, votre cas précis, en français clair.", etat: "fait", label: "Terminé" },
    { t: "Vérifier votre situation réelle", p: "Contrôle SIREN sur l'annuaire officiel, preuve à l'appui.", etat: "fait", label: "Terminé" },
    { t: "Auditer vos factures actuelles", p: "Mentions, format, corrections précises, comme ci-dessus.", etat: "encours", label: "En cours", n: 3 },
    { t: "Choisir votre circuit", p: "Recommandation neutre parmi les 137 plateformes, selon votre profil.", etat: "verrou", label: "Après l'étape 3", n: 4 },
    { t: "Prévenir votre écosystème", p: "Lettres prêtes : fournisseurs, clients, expert-comptable.", etat: "verrou", label: "À venir", n: 5 },
    { t: "Configurer et tester", p: "Guidé pas à pas dans votre outil, sans rien casser.", etat: "verrou", label: "À venir", n: 6 },
    { t: "Passer en règle", p: "Vérification finale + badge « Conformité vérifiée ».", etat: "verrou", label: "À venir", n: 7 },
    { t: "Rester en règle (2027 et après)", p: "Veille personnalisée, alertes échéance, re-vérifications.", etat: "verrou", label: "À venir", n: 8 },
  ];

  const feats: Feat[] = [
    { ic: "i-search", tag: "tag-gratuit", tagL: "Gratuit", t: "Contrôle SIREN officiel", p: "Votre situation réelle vérifiée sur l'annuaire d'État, preuve à l'appui." },
    { ic: "i-clock", tag: "tag-gratuit", tagL: "Gratuit", t: "Compte à rebours personnalisé", p: "Vos échéances (2026, 2027), pas des dates génériques." },
    { ic: "i-doc-check", tag: "tag-pack", tagL: "Pack", t: "Audit de factures illimité", p: "Mentions, format, corrections précises pour chaque document." },
    { ic: "i-layers", tag: "tag-pack", tagL: "Pack", t: "Comparateur 100 % neutre", p: "Le top 3 des plateformes pour votre profil. Zéro commission cachée." },
    { ic: "i-file", tag: "tag-pack", tagL: "Pack", t: "Dossier de bonne foi PDF", p: "Daté, sourcé, exportable : votre bouclier face à la DGFiP." },
    { ic: "i-bell", tag: "tag-serenite", tagL: "Sérénité", t: "Alertes échéance 2027", p: "J-90, J-30, J-7 : impossible de rater l'obligation d'émission." },
    { ic: "i-mail", tag: "tag-pack", tagL: "Pack", t: "Lettres types prêtes", p: "Fournisseurs, clients, expert-comptable : tout est pré-rédigé." },
    { ic: "i-radar", tag: "tag-serenite", tagL: "Sérénité", t: "Surveillance de votre plateforme", p: "Rachats, disparitions parmi les 137 : si la vôtre vacille, on vous prévient avec un plan B." },
    { ic: "i-refresh", tag: "tag-serenite", tagL: "Sérénité", t: "Re-vérification trimestrielle", p: "Votre conformité re-contrôlée automatiquement, rapport à l'appui." },
    { ic: "i-award", tag: "tag-serenite", tagL: "Sérénité", t: "Badge « Conformité vérifiée »", p: "À afficher sur vos devis et votre site : rassurez vos propres clients." },
    { ic: "i-pause", tag: "tag-serenite", tagL: "Sérénité", t: "Mode pause intelligent", p: "Suspendez, on vous réveille avant votre échéance. Personne ne fait ça." },
    { ic: "i-users", tag: "tag-bientot", tagL: "Bientôt", t: "Espace Cabinet", p: "Experts-comptables : la conformité de tous vos clients sur un seul écran." },
  ];

  return (
    <>
      {/* Sprite SVG */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></symbol>
        <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></symbol>
        <symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></symbol>
        <symbol id="i-building" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2M10 21v-3h4v3" /></symbol>
        <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="m8.5 14.5-2 7 5.5-3 5.5 3-2-7" /></symbol>
        <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></symbol>
        <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></symbol>
        <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6" /><path d="M16 3.5a4 4 0 0 1 0 9M22 21c0-3.5-2-5.5-5-6" /></symbol>
        <symbol id="i-pause" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></symbol>
        <symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
        <symbol id="i-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
        <symbol id="i-scale" viewBox="0 0 24 24"><path d="M12 3v18M8 21h8" /><path d="m5 7 7-4 7 4" /><path d="M2 13a3 3 0 0 0 6 0L5 7l-3 6zM16 13a3 3 0 0 0 6 0l-3-6-3 6z" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></symbol>
        <symbol id="i-doc-check" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 14 2 2 4-4" /></symbol>
        <symbol id="i-radar" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="M12 3v4" /></symbol>
        <symbol id="i-goutte" viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></symbol>
        <symbol id="i-flamme" viewBox="0 0 24 24"><path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.5-3 1.5-4.5C9 8 10 9.5 11 9.5c1.5 0 1-3.5 1-7.5z" /></symbol>
      </svg>

      <div className="bandeau">
        Obligation de réception au 1er septembre 2026 :{" "}
        <strong>{temps.passe ? "l'obligation est en vigueur" : `${temps.j} jours`}</strong> pour vous préparer sereinement
      </div>

      <header>
        <div className="header-inner">
          <a className="logo" href="#hero"><span className="logo-badge">S</span>Sireno</a>
          <nav>
            <a href="#audit">Essayer l&apos;audit</a>
            <a href="#gps">La méthode</a>
            <a href="#offres">Tarifs</a>
            <a href="#faq">Questions</a>
            <a className="nav-cta" href="#hero">Vérifier mon SIREN</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="hero" style={{ paddingTop: 60 }}>
        <div className="grain" />
        <div className="container hero-inner">
          <span className="pill"><span className="dot" />Réforme en vigueur le 1er septembre 2026. Êtes-vous prêt ?</span>
          <h1>
            La facturation électronique<br />devient obligatoire.<br />
            <span className="grad">Vous, vous serez déjà en règle.</span>
          </h1>
          <p className="sous">
            Vérifiez votre situation en <strong>60 secondes</strong>{" "}
            sur l&apos;annuaire officiel, puis laissez le GPS Conformité vous guider. <strong>En règle en 48 h</strong>, sans jargon, sans expert-comptable à 200 €/h.
          </p>

          <div className="outil">
            <div className="outil-titre"><Ic id="i-search" />Entrez votre n° SIREN (il est sur vos factures ou votre Kbis)</div>
            <div className="champ-ligne">
              <input
                type="text" inputMode="numeric" maxLength={11} placeholder="123 456 789" autoComplete="off"
                value={siren}
                onChange={(e) => setSiren(formaterSiren(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && verifierSiren()}
              />
              <button className="btn" onClick={verifierSiren} disabled={chargement}>
                {chargement ? "Vérification…" : "Vérifier gratuitement"} <Ic id="i-arrow" />
              </button>
            </div>
            {erreur && <p className="erreur">{erreur}</p>}
            <span className="lien-exemple" onClick={modeDecouverte}>
              Pas de SIREN sous la main ? Voir un exemple de verdict <Ic id="i-arrow" />
            </span>
            <p className="note"><Ic id="i-lock" style={{ color: "var(--vert)" }} />Gratuit, sans compte. Vérification appuyée sur l&apos;annuaire officiel des entreprises.</p>
          </div>

          <div className="reassurance">
            <span><Ic id="i-check" />Sources officielles datées</span>
            <span><Ic id="i-check" />Indépendant, payé par vous</span>
            <span><Ic id="i-check" />Zéro cookie publicitaire</span>
          </div>

          <p className="compteur-titre">Obligation de réception pour toutes les entreprises dans :</p>
          <div className="compteur">
            <div className="bloc"><div className="num">{temps.j}</div><div className="lab">jours</div></div>
            <div className="bloc"><div className="num">{temps.h}</div><div className="lab">heures</div></div>
            <div className="bloc"><div className="num">{temps.m}</div><div className="lab">min</div></div>
            <div className="bloc"><div className="num">{temps.s}</div><div className="lab">sec</div></div>
          </div>

          {verdict && (
            <div className="resultat" ref={resultatRef}>
              <div className="carte-identite">
                <div className="icone"><Ic id="i-building" /></div>
                <div>
                  <div className="nom">{verdict.nom}</div>
                  <div className="detail">{verdict.detail}</div>
                </div>
                <span className={`badge ${verdict.demo ? "demo" : "officiel"}`}>
                  {verdict.demo ? "Exemple de démonstration" : "Annuaire officiel"}
                </span>
              </div>

              <div className="carte-verdict">
                <div className="verdict-titre"><span className="feu" />Des actions sont requises avant votre échéance</div>
                <ul className="verdict-liste">
                  <li><Ic id="i-check" style={{ color: "var(--vert)" }} /><span><strong>Votre entreprise est bien concernée par la réforme</strong>, comme 4,5 millions d&apos;autres, même en franchise de TVA.</span></li>
                  <li><Ic id="i-alert" style={{ color: "var(--orange)" }} /><span><strong>Prochaine vérification : votre plateforme de réception.</strong> Au 1er septembre, vos factures fournisseurs n&apos;arriveront plus par email.</span></li>
                  <li><Ic id="i-clock" style={{ color: "var(--bleu-accent)" }} /><span><strong>Vos dates :</strong> réception dès le <strong>01/09/2026</strong>, émission obligatoire au <strong>01/09/2027</strong>.</span></li>
                  <li><Ic id="i-shield" style={{ color: "var(--vert)" }} /><span><strong>Bonne nouvelle :</strong> la DGFiP protège les entreprises de bonne foi qui documentent leur démarche. Sireno construit ce dossier pour vous.</span></li>
                </ul>
                <div className="cycle">
                  <span>Non vérifié</span><span className="actif">Vérifié : actions requises</span><span>En cours</span><span>En règle</span><span>Surveillé</span>
                </div>
              </div>

              <div className="capture">
                <p><strong>Recevez votre plan d&apos;action personnalisé</strong> (gratuit) : vos 8 étapes, vos dates, et le détail de ce verdict, par email.</p>
                <div className="champ-ligne">
                  <input type="email" placeholder="votre@email.fr" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && capturerEmail()} />
                  <button className="btn btn-vert" onClick={capturerEmail}>Recevoir mon plan</button>
                </div>
                <p className="note"><Ic id="i-mail" style={{ color: "var(--vert)" }} />Uniquement votre conformité. Zéro spam, désinscription en 1 clic.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="preuve">
        <div className="container preuve-inner">
          <span><Ic id="i-building" /><b>4,5&nbsp;M</b>&nbsp;d&apos;entreprises concernées</span>
          <span><Ic id="i-layers" /><b>137</b>&nbsp;plateformes agréées à départager</span>
          <span><Ic id="i-clock" />Vérification en <b>60 secondes</b></span>
          <span><Ic id="i-shield" />Garantie <b>30 jours</b> remboursé</span>
        </div>
      </div>

      {/* AUDIT EXPRESS */}
      <section className="audit" id="audit">
        <div className="container">
          <span className="sur-titre reveal">Essayez maintenant, sans compte</span>
          <h2 className="titre-section reveal">Votre facture passerait-elle le contrôle ?</h2>
          <p className="sous-section reveal">Voici une facture fictive comme on en voit des milliers. Lancez l&apos;audit express et regardez Sireno travailler. En production, c&apos;est votre propre facture qui est analysée.</p>

          <div className="audit-wrap">
            <div className="facture-mock reveal">
              <div className={`scan ${auditEtape >= 1 ? "actif" : ""}`} />
              <span className="fm-exemple">Exemple fictif</span>
              <div className="fm-head">
                <div className="fm-logo"><Ic id="i-goutte" /></div>
                <div className="fm-droite">
                  <div className="fm-tag">FACTURE</div>
                  <div className={`fm-num surligne ${auditEtape >= 2 ? "probleme" : ""}`}>N° 12</div>
                </div>
              </div>
              <div className="fm-lignes">
                <b>AQUACLIM SERVICES</b><br />
                8 rue des Acacias, 69003 Lyon<br />
                SIREN : <span className="flou">842 517 396</span><br />
                <b>Client :</b> Entreprise Exemple SAS, 21 quai du Commerce, Lyon
              </div>
              <table className="fm-table">
                <tbody>
                  <tr><th>Désignation</th><th>Montant HT</th></tr>
                  <tr><td>Entretien climatisation (contrat annuel)</td><td>780,00 €</td></tr>
                  <tr><td>Main d&apos;œuvre (4 h)</td><td>240,00 €</td></tr>
                </tbody>
              </table>
              <div className="fm-total"><div className="box"><small>Total HT</small>1 020,00 €</div></div>
              <div className="fm-pied">
                <span className={`surligne ${auditEtape >= 3 ? "probleme" : ""}`}>TVA non applicable</span>{" · "}
                <span className={`surligne ${auditEtape >= 4 ? "probleme" : ""}`}>PDF simple envoyé par email</span>
              </div>
            </div>

            <div>
              <div className="audit-resultats">
                <div className={`item ${auditEtape >= 2 ? "vu" : ""}`}>
                  <Ic id="i-alert" style={{ color: "var(--orange)" }} />
                  <div><h5>Numérotation non conforme</h5><p>« N° 12 » sans séquence chronologique continue ni préfixe. Exigé pour toute facture (ex. FAC-2026-012).</p></div>
                </div>
                <div className={`item ${auditEtape >= 3 ? "vu" : ""}`}>
                  <Ic id="i-alert" style={{ color: "var(--orange)" }} />
                  <div><h5>Mention TVA incomplète</h5><p>« TVA non applicable » doit citer l&apos;article : « art. 293 B du CGI ». Sans lui, la mention est invalide.</p></div>
                </div>
                <div className={`item ${auditEtape >= 4 ? "vu" : ""}`}>
                  <Ic id="i-file" style={{ color: "var(--rouge)" }} />
                  <div><h5>Format non conforme au circuit 2026</h5><p>Un PDF par email n&apos;est pas une facture électronique au sens légal. Il faut un format structuré (Factur-X, UBL, CII) via une plateforme agréée.</p></div>
                </div>
              </div>

              {auditEtape >= 5 ? (
                <div className="score-carte">
                  <div className="score-ligne">
                    <div>
                      <div className="score-num">58<small>/100</small></div>
                      <div style={{ fontSize: "12.5px", opacity: 0.7 }}>Score de conformité</div>
                    </div>
                    <Ic id="i-doc-check" style={{ fontSize: 40, opacity: 0.35 }} />
                  </div>
                  <p>3 corrections précises suffisent pour passer cette facture en règle. Sireno vous donne le détail exact, les modèles corrigés et votre dossier de bonne foi.</p>
                  <button className="btn" onClick={() => setPaywall(true)}>Débloquer mes corrections <Ic id="i-arrow" /></button>
                </div>
              ) : (
                <div className="audit-lancer" style={{ opacity: auditEtape > 0 ? 0.35 : 1 }}>
                  <button className="btn" onClick={lancerAudit}><Ic id="i-search" /> Lancer l&apos;audit express</button>
                  <p className="note" style={{ justifyContent: "center" }}><Ic id="i-eye" />Démonstration interactive. Aucune donnée envoyée.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* GPS */}
      <section id="gps">
        <div className="container">
          <span className="sur-titre reveal">La méthode Sireno</span>
          <h2 className="titre-section reveal">8 étapes guidées. Zéro jargon.<br />Une célébration à chaque victoire.</h2>
          <p className="sous-section reveal">Tout le plan est visible : rien de flouté, rien de caché. Pendant que vous avancez, votre dossier de bonne foi se construit tout seul.</p>

          <div className="gps-wrap">
            <div>
              <div className="gps-progress reveal" data-anim="gps">
                <span className="score">2/8 étapes</span>
                <div className="barre"><div className="fill" style={{ width: gpsRempli ? "25%" : 0 }} /></div>
                <span style={{ fontSize: "12.5px", color: "var(--doux)", whiteSpace: "nowrap", fontWeight: 650 }}>En route</span>
              </div>
              {niveaux.map((n, i) => (
                <div className={`niveau ${n.etat} reveal`} key={i}>
                  <div className="num">{n.etat === "fait" ? <Ic id="i-check" /> : n.n}</div>
                  <div><h4>{n.t}</h4><p>{n.p}</p></div>
                  <span className="etat">{n.label}</span>
                </div>
              ))}
            </div>

            <div className="dossier reveal">
              <div className="entete"><div className="ico"><Ic id="i-doc-check" /></div><h4>Votre dossier de bonne foi</h4></div>
              <p className="sous">Il se remplit à chaque étape terminée. Daté, sourcé, exportable en PDF.</p>
              <div className="doc">
                <div className="doc-ligne faite"><Ic id="i-check" />Diagnostic réalisé</div>
                <div className="doc-ligne faite"><Ic id="i-check" />Situation vérifiée sur l&apos;annuaire officiel</div>
                <div className="doc-ligne attente"><Ic id="i-clock" />Audit des factures</div>
                <div className="doc-ligne attente"><Ic id="i-clock" />Plateforme sélectionnée</div>
                <div className="doc-ligne attente"><Ic id="i-clock" />Écosystème informé</div>
                <div className="doc-ligne attente"><Ic id="i-clock" />Configuration testée</div>
              </div>
              <p className="note-dossier">La DGFiP a annoncé une <strong>tolérance pour les entreprises de bonne foi qui documentent leur démarche</strong>. Ce dossier est exactement cette documentation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="feats">
        <div className="container">
          <span className="sur-titre reveal">Tout est déjà pensé</span>
          <h2 className="titre-section reveal">Une application complète,<br />pas un PDF qu&apos;on vous vend.</h2>
          <p className="sous-section reveal">Chaque fonctionnalité répond à un vrai moment de votre mise en conformité : aujourd&apos;hui, en 2027, et après.</p>
          <div className={`feats-grille ${featsOuvert ? "" : "replie"}`}>
            {feats.map((f, i) => (
              <div className={`feat ${i < 6 ? "reveal" : ""}`} key={i}>
                <span className={`tag ${f.tag}`}>{f.tagL}</span>
                <div className="ico"><Ic id={f.ic} /></div>
                <h4>{f.t}</h4><p>{f.p}</p>
              </div>
            ))}
          </div>
          <div className={`feats-toggle reveal ${featsOuvert ? "ouvert" : ""}`}>
            <button onClick={() => setFeatsOuvert(!featsOuvert)}>
              <span>{featsOuvert ? "Réduire la liste" : "Découvrir les 6 autres fonctionnalités"}</span>
              <Ic id="i-chev" />
            </button>
          </div>
        </div>
      </section>

      {/* Différence */}
      <section>
        <div className="container">
          <span className="sur-titre reveal">Sans langue de bois</span>
          <h2 className="titre-section reveal">Pourquoi Sireno plutôt qu&apos;un autre ?</h2>
          <p className="sous-section reveal">Parce qu&apos;on ne fait pas semblant. Comparez ce qu&apos;on fait à ce qui existe.</p>
          <div className="diff-grille">
            <div className="diff-carte reveal"><div className="ico"><Ic id="i-search" /></div><span className="eux">Les autres : un quiz déclaratif</span><span className="nous">Une vérification réelle sur l&apos;annuaire officiel, avec preuve à l&apos;appui</span></div>
            <div className="diff-carte reveal"><div className="ico"><Ic id="i-scale" /></div><span className="eux">Les comparateurs : payés par les plateformes</span><span className="nous">Payés par vous, pour vous. Zéro commission sur nos recommandations payantes</span></div>
            <div className="diff-carte reveal"><div className="ico"><Ic id="i-file" /></div><span className="eux">Eux : un PDF statique, débrouillez-vous</span><span className="nous">Un plan interactif qui avance avec vous, et une veille qui continue après</span></div>
            <div className="diff-carte reveal"><div className="ico"><Ic id="i-shield" /></div><span className="eux">Eux : la peur de l&apos;amende pour vendre</span><span className="nous">Votre dossier de bonne foi documenté, exactement ce que demande la DGFiP</span></div>
          </div>
        </div>
      </section>

      {/* Offres */}
      <section id="offres" style={{ paddingTop: 0 }}>
        <div className="container">
          <span className="sur-titre reveal">Tarifs</span>
          <h2 className="titre-section reveal">Des prix simples. Aucun péage caché.</h2>
          <p className="sous-section reveal">Tout le plan est visible gratuitement. Vous payez pour les outils qui font le travail, pas pour lire la suite.</p>

          <div className="fondateur reveal" data-anim="fondateur">
            <div className="ico"><Ic id="i-flamme" /></div>
            <div className="corps">
              <h4>Offre fondateur : les 100 premiers gardent 5 €/mois, à vie</h4>
              <p>Abonnement Sérénité au tarif fondateur (au lieu de 9 €/mois), verrouillé pour toujours. Quand les 100 places sont prises, l&apos;offre disparaît définitivement.</p>
              <div className="oe-barre"><div className="oe-fill" style={{ width: fondateurVu ? `${(FONDATEUR_PRIS / FONDATEUR_TOTAL) * 100}%` : 0 }} /></div>
              <div className="oe-places">{FONDATEUR_PRIS} place{FONDATEUR_PRIS > 1 ? "s" : ""} déjà prise{FONDATEUR_PRIS > 1 ? "s" : ""} · {FONDATEUR_TOTAL - FONDATEUR_PRIS} restantes</div>
            </div>
            <a className="btn" href="#hero">Prendre ma place <Ic id="i-arrow" /></a>
          </div>

          <div className="offres-grille">
            <div className="offre reveal">
              <h3>Vérifie</h3>
              <div className="prix">0 €</div>
              <div className="sous-prix">Pour savoir où vous en êtes</div>
              <ul>
                <li><Ic id="i-check" />Contrôle SIREN sur l&apos;annuaire officiel</li>
                <li><Ic id="i-check" />Verdict personnalisé + vos dates clés</li>
                <li><Ic id="i-check" />Plan des 8 étapes visible en entier</li>
                <li><Ic id="i-check" />2 premières étapes actionnables</li>
                <li><Ic id="i-check" />1 audit de facture offert</li>
              </ul>
              <a className="btn btn-ghost" href="#hero">Commencer gratuitement</a>
            </div>
            <div className="offre populaire reveal">
              <span className="badge-pop">Le plus choisi</span>
              <h3>Pack Conformité</h3>
              <div className="prix">49 € <small>une fois</small></div>
              <div className="sous-prix">Pour être en règle, guidé de A à Z</div>
              <ul>
                <li><Ic id="i-check" />GPS Conformité complet (8 étapes)</li>
                <li><Ic id="i-check" />Audits de factures illimités 30 jours</li>
                <li><Ic id="i-check" />Recommandation de plateforme neutre</li>
                <li><Ic id="i-check" />Dossier de bonne foi exportable (PDF)</li>
                <li><Ic id="i-check" />Lettres types prêtes à envoyer</li>
                <li><Ic id="i-check" />Support humain sous 24 h</li>
              </ul>
              <a className="btn" href="#hero">Choisir le Pack</a>
            </div>
            <div className="offre reveal">
              <h3>Sérénité</h3>
              <div className="prix">9 €<small>/mois</small></div>
              <div className="sous-prix">ou 79 €/an (2 mois offerts), pour ne plus jamais y penser</div>
              <ul>
                <li><Ic id="i-check" />Tout le Pack Conformité, à vie</li>
                <li><Ic id="i-check" />Veille réglementaire personnalisée</li>
                <li><Ic id="i-check" />Alertes échéance 2027 (J-90, J-30, J-7)</li>
                <li><Ic id="i-check" />Surveillance de votre plateforme</li>
                <li><Ic id="i-check" />Badge « Conformité vérifiée »</li>
                <li><Ic id="i-check" />Mode pause intelligent</li>
              </ul>
              <a className="btn btn-ghost" href="#hero">Choisir Sérénité</a>
            </div>
          </div>
          <p className="garantie reveal"><Ic id="i-shield" /><span><strong>Garantie 30 jours satisfait ou remboursé</strong>, sans condition et sans justification.</span></p>
        </div>
      </section>

      {/* Transparence */}
      <section className="feats" id="transparence" style={{ paddingTop: 64 }}>
        <div className="container">
          <span className="sur-titre reveal">Notre méthode</span>
          <h2 className="titre-section reveal">Comment Sireno vérifie</h2>
          <p className="sous-section reveal">Pas de boîte noire. Méthode publique, sources datées, et on vous dit ce qu&apos;on ne voit pas.</p>
          <div className="transp-grille">
            <div className="transp-carte reveal"><div className="ico"><Ic id="i-building" /></div><h4>Sources officielles uniquement</h4><p>Annuaire des entreprises, impots.gouv.fr, economie.gouv.fr. Chaque information porte sa source et sa date.</p></div>
            <div className="transp-carte reveal"><div className="ico"><Ic id="i-scale" /></div><h4>Indépendant, vraiment</h4><p>Non affilié à l&apos;administration. Aucune commission des plateformes sur nos offres payantes.</p></div>
            <div className="transp-carte reveal"><div className="ico"><Ic id="i-lock" /></div><h4>Vos données, minimum vital</h4><p>Un SIREN (donnée publique) et un email si vous voulez votre plan. Hébergement en Europe, zéro revente. Jamais.</p></div>
            <div className="transp-carte reveal"><div className="ico"><Ic id="i-alert" /></div><h4>Honnête sur les limites</h4><p>Sireno informe et outille mais ne remplace pas un conseil juridique personnalisé. Cas complexe ? On vous le dit.</p></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="container" style={{ maxWidth: 820 }}>
          <span className="sur-titre reveal">FAQ</span>
          <h2 className="titre-section reveal">Vos questions, sans détour</h2>
          <p className="sous-section reveal">Les mêmes que se posent 4,5 millions d&apos;entreprises en ce moment.</p>
          <details className="faq-item reveal"><summary>Je suis en micro-entreprise et je ne facture pas de TVA. Je suis concerné ?</summary><p>Oui. C&apos;est LE piège de cette réforme : être « assujetti » à la TVA ne veut pas dire la payer. Même en franchise de TVA, vous devez pouvoir <strong>recevoir</strong> des factures électroniques dès le 1er septembre 2026, et en <strong>émettre</strong> à partir du 1er septembre 2027. Le contrôle SIREN gratuit vous montre votre situation exacte.</p></details>
          <details className="faq-item reveal"><summary>Mon PDF envoyé par email, ça ne suffira plus ?</summary><p>Non. Une facture électronique au sens de la réforme, c&apos;est un format structuré (Factur-X, UBL ou CII) qui transite par une plateforme agréée par l&apos;État, pas un PDF dans Gmail. Word, Excel et Canva ne produisent pas ce format. Bonne nouvelle : pas besoin de tout changer, il faut surtout choisir le bon circuit. C&apos;est exactement ce qu&apos;on vous aide à faire.</p></details>
          <details className="faq-item reveal"><summary>Qu&apos;est-ce que je risque si je ne fais rien ?</summary><p>D&apos;abord des blocages très concrets : vos factures fournisseurs ne vous parviendront plus, et vos clients professionnels finiront par exiger le format légal. Ensuite des sanctions prévues par les textes (amendes plafonnées à 15 000 €/an). À savoir : la DGFiP a annoncé une tolérance au démarrage pour les entreprises <strong>de bonne foi qui documentent leur démarche</strong>. C&apos;est précisément ce que Sireno construit pour vous.</p></details>
          <details className="faq-item reveal"><summary>Il existe des solutions gratuites, pourquoi payer Sireno ?</summary><p>Il existe d&apos;excellents logiciels gratuits (on les recommande d&apos;ailleurs quand c&apos;est le bon choix pour vous, sans toucher de commission). Sireno ne vend pas un logiciel de facturation : on vérifie que vous êtes <em>réellement</em> en règle, on vous guide pas à pas, et on surveille dans le temps. C&apos;est le copilote, pas le véhicule.</p></details>
          <details className="faq-item reveal"><summary>Vous êtes affiliés à l&apos;État ?</summary><p>Non, et on préfère le dire clairement : Sireno est un service indépendant, non affilié à l&apos;administration fiscale. On s&apos;appuie sur les sources officielles (impots.gouv.fr, economie.gouv.fr, l&apos;annuaire public) et chaque information affichée est datée et sourcée.</p></details>
          <details className="faq-item reveal"><summary>Et si je ne suis pas satisfait ?</summary><p>Remboursé, sous 30 jours, sans condition et sans formulaire de torture. On préfère 1 000 clients contents que 10 clients piégés.</p></details>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-final reveal">
            <h2>60 secondes maintenant,<br />ou la panique en septembre.</h2>
            <p>Le contrôle est gratuit, sans compte, et vous saurez exactement où vous en êtes. C&apos;est déjà ça de réglé.</p>
            <a className="btn" href="#hero">Vérifier mon SIREN gratuitement</a>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grille">
            <div className="footer-col" style={{ maxWidth: 280 }}>
              <strong>Sireno</strong>
              <p>Le copilote de conformité des indépendants et TPE face à la facturation électronique. Vérifier. Agir. Dormir tranquille.</p>
            </div>
            <div className="footer-col">
              <strong>Produit</strong>
              <a href="#hero">Contrôle SIREN gratuit</a>
              <a href="#audit">Audit express</a>
              <a href="#gps">Le GPS Conformité</a>
              <a href="#offres">Tarifs</a>
            </div>
            <div className="footer-col">
              <strong>Sources officielles</strong>
              <a href="https://www.impots.gouv.fr/professionnel/je-decouvre-la-facturation-electronique" target="_blank" rel="noopener noreferrer">impots.gouv.fr</a>
              <a href="https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises" target="_blank" rel="noopener noreferrer">economie.gouv.fr</a>
              <a href="https://annuaire-entreprises.data.gouv.fr" target="_blank" rel="noopener noreferrer">Annuaire des entreprises</a>
            </div>
            <div className="footer-col">
              <strong>Légal</strong>
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité</a>
              <a href="#">CGV</a>
            </div>
          </div>
          <div className="footer-legal">
            <p><strong>Sireno est un service indépendant, non affilié à l&apos;administration fiscale.</strong> Les informations fournies sont issues de sources officielles, datées, et ne constituent pas un conseil juridique, fiscal ou comptable personnalisé. Données hébergées en Europe · Pas de cookies publicitaires · Pas de revente de données. © 2026 Sireno.</p>
          </div>
        </div>
      </footer>

      {paywall && (
        <div className="voile" onClick={(e) => e.target === e.currentTarget && setPaywall(false)}>
          <div className="modal">
            <button className="fermer" onClick={() => setPaywall(false)}><Ic id="i-x" /></button>
            <div className="ico-modal"><Ic id="i-doc-check" /></div>
            <h3>Vos 3 corrections sont prêtes</h3>
            <p>Le Pack Conformité débloque le détail exact, les modèles corrigés, et tout le GPS jusqu&apos;à être en règle.</p>
            <ul>
              <li><Ic id="i-check" />Le détail précis des 3 corrections de cette facture</li>
              <li><Ic id="i-check" />Audits illimités pendant 30 jours</li>
              <li><Ic id="i-check" />GPS Conformité complet + dossier de bonne foi</li>
              <li><Ic id="i-check" />Recommandation de plateforme 100 % neutre</li>
            </ul>
            <button className="btn" onClick={() => montrerToast("Bientôt disponible : le Pack Conformité arrive au lancement complet. Laissez votre email pour être prévenu en premier.")}>
              Débloquer pour 49 €, une fois
            </button>
            <button className="continuer" onClick={() => setPaywall(false)}>Continuer avec la version gratuite</button>
            <div className="mini-garantie"><Ic id="i-shield" />Garantie 30 jours satisfait ou remboursé, sans condition</div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "visible" : ""}`}>{toast}</div>
    </>
  );
}
