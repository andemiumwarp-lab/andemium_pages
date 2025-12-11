/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let allCards = [];
let filteredCards = [];
let deck = {};            // cardId: count
let deckFaction = null;   // faction unique du deck

/* ============================================================
   RÉFÉRENCES DOM
============================================================ */
const cardsGrid = document.getElementById("cardsGrid");
const deckList = document.getElementById("deckList");
const deckCountSpan = document.getElementById("deckCount");
const cardsCountSpan = document.getElementById("cardsCount");
const cardsTitle = document.getElementById("cardsTitle");

const filterFaction = document.getElementById("filterFaction");
const filterType = document.getElementById("filterType");
const filterCost = document.getElementById("filterCost");
const filterSearch = document.getElementById("filterSearch");
const btnResetFilters = document.getElementById("btnResetFilters");

const factionPagesContainer = document.getElementById("factionPages");
const deckCardGrid = document.getElementById("deckCardGrid");

const btnClearDeck = document.getElementById("btnClearDeck");
const btnExportDeck = document.getElementById("btnExportDeck");
const importDeckFile = document.getElementById("importDeckFile");

/* ============================================================
   INITIALISATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    loadDeckFromStorage();
    loadCards();

    // Filtres
    [filterFaction, filterType, filterCost].forEach(el =>
        el.addEventListener("change", applyFilters)
    );
    filterSearch.addEventListener("input", applyFilters);

    // Reset filtres
    if (btnResetFilters) {
        btnResetFilters.addEventListener("click", resetFilters);
    }

    // Deck actions
    btnClearDeck.addEventListener("click", clearDeck);
    btnExportDeck.addEventListener("click", exportDeck);
    importDeckFile.addEventListener("change", importDeckFromFile);

    setupTabs();
});

/* ============================================================
   CHARGEMENT DES CARTES
============================================================ */
async function loadCards() {
    const res = await fetch("cards.json");
    allCards = await res.json();

    initFiltersFromCards();
    applyFilters();
    renderDeck();
}

/* ============================================================
   INIT FILTRES DYNAMIQUES
============================================================ */
function initFiltersFromCards() {
    const factions = [...new Set(allCards.map(c => c.faction))].sort();
    filterFaction.innerHTML = `<option value="">Toutes</option>`;
    factions.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        filterFaction.appendChild(opt);
    });

    const types = [...new Set(allCards.map(c => c.type))].sort();
    filterType.innerHTML = `<option value="">Tous</option>`;
    types.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        filterType.appendChild(opt);
    });

    factionPagesContainer.innerHTML = "";
    factions.forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = f;
        btn.addEventListener("click", () => {
            filterFaction.value = f;
            filterType.value = "";
            filterCost.value = "";
            filterSearch.value = "";

            factionPagesContainer.querySelectorAll("button")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            applyFilters();
        });
        factionPagesContainer.appendChild(btn);
    });
}

/* ============================================================
   FILTRAGE PRINCIPAL
============================================================ */
function applyFilters() {
    const faction = filterFaction.value;
    const type = filterType.value;
    const costFilter = filterCost.value;
    const search = filterSearch.value.toLowerCase();

    filteredCards = allCards.filter(card => {
        if (faction && card.faction !== faction) return false;
        if (type && card.type !== type) return false;

        // Filtre coût
        if (costFilter !== "") {
            const c = Number(card.cost);
            if (costFilter === "other") {
                if (c === 0 || c === 1 || c === 2) return false;
            } else if (c !== Number(costFilter)) {
                return false;
            }
        }

        // Recherche texte
        if (search) {
            const haystack = [
                card.name,
                card.effect,
                (card.keywords || []).join(" "),
                card.type,
                card.faction
            ].join(" ").toLowerCase();

            if (!haystack.includes(search)) return false;
        }

        return true;
    });

    cardsCountSpan.textContent = `${filteredCards.length} carte(s)`;
    cardsTitle.textContent = faction ? `Faction : ${faction}` : "Toutes les cartes";

    renderCards(filteredCards, cardsGrid, true);
}

/* ============================================================
   BOUTON RÉINITIALISER LES FILTRES
============================================================ */
function resetFilters() {
    filterFaction.value = "";
    filterType.value = "";
    filterCost.value = "";
    filterSearch.value = "";

    factionPagesContainer.querySelectorAll("button")
        .forEach(btn => btn.classList.remove("active"));

    cardsTitle.textContent = "Toutes les cartes";

    applyFilters();
}

/* ============================================================
   RENDU DES CARTES
============================================================ */
function renderCards(list, container, showAdd = false) {
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p style="color:#aaa;">Aucune carte trouvée.</p>`;
        return;
    }

    list.forEach(card => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card";

        // IMAGE
        const img = document.createElement("div");
        img.className = "card-image";
        img.style.backgroundImage = card.image ? `url('${card.image}')` : "none";

        const tag = document.createElement("div");
        tag.className = "card-faction-tag";
        tag.textContent = card.faction;
        img.appendChild(tag);

        // BODY
        const body = document.createElement("div");
        body.className = "card-body";

        body.innerHTML = `
            <div class="card-title-row">
                <div class="card-title">${card.name}</div>
                <div class="card-cost">${card.cost ?? ""}</div>
            </div>

            <div class="card-type">${card.type}</div>
            <div class="card-keywords">${(card.keywords || []).join(" • ")}</div>
            <div class="card-effect">${card.effect || ""}</div>
        `;

        // STATS
        const stats = document.createElement("div");
        stats.className = "card-stats";
        stats.innerHTML = `
            <div>Portée : ${card.range ?? "-"}</div>
            <div>Distance : ${card.ranged ?? "-"}</div>
            <div>Mêlée : ${card.melee ?? "-"}</div>
            <div>PV : ${card.hp ?? "-"}</div>
        `;
        body.appendChild(stats);

        // FOOTER
        const footer = document.createElement("div");
        footer.className = "card-footer";

        footer.innerHTML = `<div class="card-limit">Limite : ${getCardLimit(card)}</div>`;

        if (showAdd) {
            const btn = document.createElement("button");
            btn.className = "add-to-deck";
            btn.textContent = "Ajouter";
            btn.addEventListener("click", () => addToDeck(card.id));
            footer.appendChild(btn);
        }

        body.appendChild(footer);

        cardDiv.appendChild(img);
        cardDiv.appendChild(body);

        container.appendChild(cardDiv);
    });
}

/* ============================================================
   LIMITES DE CARTES
============================================================ */
function getCardLimit(card) {
    if (card.type && card.type.toLowerCase().includes("héros légendaire")) return 1;
    if (card.limit !== undefined) return card.limit;
    return 3;
}

/* ============================================================
   AJOUT / SUPPRESSION DANS LE DECK
============================================================ */
function addToDeck(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    // MONO FACTION
    if (deckFaction === null) {
        deckFaction = card.faction;
    } else if (deckFaction !== card.faction) {
        alert(`Votre deck est ${deckFaction}. Impossible d'ajouter une carte ${card.faction}.`);
        return;
    }

    // Limite copies
    const max = getCardLimit(card);
    if (!deck[cardId]) deck[cardId] = 0;

    if (deck[cardId] >= max) {
        alert(`Limite atteinte (${max}) pour "${card.name}".`);
        return;
    }

    deck[cardId]++;
    saveDeckToStorage();
    renderDeck();
}

function removeFromDeck(cardId) {
    if (!deck[cardId]) return;

    deck[cardId]--;
    if (deck[cardId] <= 0) delete deck[cardId];

    saveDeckToStorage();
    renderDeck();
}

function clearDeck() {
    if (confirm("Vider totalement le deck ?")) {
        deck = {};
        deckFaction = null;
        saveDeckToStorage();
        renderDeck();
    }
}

/* ============================================================
   RENDU DU DECK
============================================================ */
function renderDeck() {
    deckList.innerHTML = "";
    deckCardGrid.innerHTML = "";

    let total = 0;

    for (const [id, count] of Object.entries(deck)) {
        const card = allCards.find(c => c.id === id);
        if (!card) continue;

        total += count;

        const li = document.createElement("li");
        li.innerHTML = `
            <span class="deck-card-name">${card.name}</span>
            <span class="deck-count-badge">x${count}/${getCardLimit(card)}</span>
        `;

        const btn = document.createElement("button");
        btn.className = "deck-remove-btn";
        btn.textContent = "-1";
        btn.addEventListener("click", () => removeFromDeck(id));

        li.appendChild(btn);
        deckList.appendChild(li);

        for (let i = 0; i < count; i++) {
            deckCardGrid.appendChild(createDeckCard(card));
        }
    }

    deckCountSpan.textContent = total;
}

function createDeckCard(card) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
        <div class="card-image" style="background-image:url('${card.image}')"></div>
        <div class="card-body">
            <div class="card-title">${card.name}</div>
            <div class="card-type">${card.type}</div>
            <div class="card-stats">
                <div>Portée : ${card.range ?? "-"}</div>
                <div>Distance : ${card.ranged ?? "-"}</div>
                <div>Mêlée : ${card.melee ?? "-"}</div>
                <div>PV : ${card.hp ?? "-"}</div>
            </div>
        </div>
    `;
    return div;
}

/* ============================================================
   SAUVEGARDE LOCALE
============================================================ */
function saveDeckToStorage() {
    localStorage.setItem("aow_deck", JSON.stringify(deck));
    localStorage.setItem("aow_deck_faction", deckFaction);
}

function loadDeckFromStorage() {
    const raw = localStorage.getItem("aow_deck");
    if (raw) deck = JSON.parse(raw);

    const savedFaction = localStorage.getItem("aow_deck_faction");
    deckFaction = savedFaction ? savedFaction : null;
}

/* ============================================================
   EXPORT / IMPORT DECK
============================================================ */
function exportDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "deck.json";
    a.click();

    URL.revokeObjectURL(url);
}

function importDeckFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            deck = JSON.parse(e.target.result);
            saveDeckToStorage();
            renderDeck();
        } catch {
            alert("Erreur : fichier deck invalide.");
        }
    };
    reader.readAsText(file);
}

/* ============================================================
   NAVIGATION ENTRE ONGLET CARTES / DECK
============================================================ */
function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const tabs = {
        cards: document.getElementById("tab-cards"),
        deck: document.getElementById("tab-deck")
    };

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const tab = btn.dataset.tab;
            Object.entries(tabs).forEach(([name, el]) => {
                el.classList.toggle("active", name === tab);
            });

            if (tab === "deck") renderDeck();
        });
    });
}
