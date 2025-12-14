/* ============================================================
   CONSTANTES
============================================================ */
const DECK_MIN_SIZE = 30;
const DECK_MAX_SIZE = 40;

/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let allCards = [];
let filteredCards = [];
let deck = {};          // { cardId: count }
let deckFaction = null;

/* ============================================================
   RÉFÉRENCES DOM
============================================================ */
const cardsGrid = document.getElementById("cardsGrid");
const deckList = document.getElementById("deckList");
const deckCardGrid = document.getElementById("deckCardGrid");

const deckCountSpan = document.getElementById("deckCount");
const cardsCountSpan = document.getElementById("cardsCount");
const cardsTitle = document.getElementById("cardsTitle");

const filterFaction = document.getElementById("filterFaction");
const filterType = document.getElementById("filterType");
const filterCost = document.getElementById("filterCost");
const filterSearch = document.getElementById("filterSearch");
const btnResetFilters = document.getElementById("btnResetFilters");

const factionPagesContainer = document.getElementById("factionPages");

const btnClearDeck = document.getElementById("btnClearDeck");
const btnExportDeck = document.getElementById("btnExportDeck");
const importDeckFile = document.getElementById("importDeckFile");



function getCardCost(card) {
    if (card.cost !== undefined && card.cost !== null) {
        return card.cost;
    }
    return 0;
}


/* ============================================================
   INITIALISATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    loadDeckFromStorage();
    loadCards();

    [filterFaction, filterType, filterCost].forEach(el =>
        el.addEventListener("change", applyFilters)
    );
    filterSearch.addEventListener("input", applyFilters);

    if (btnResetFilters) {
        btnResetFilters.addEventListener("click", resetFilters);
    }

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
   FILTRES DYNAMIQUES
============================================================ */
function initFiltersFromCards() {
    // Factions
    const factions = [...new Set(allCards.map(c => c.faction))].sort();
    filterFaction.innerHTML = `<option value="">Toutes</option>`;
    factions.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        filterFaction.appendChild(opt);
    });

    // Types
    const types = [...new Set(allCards.map(c => c.type))].sort();
    filterType.innerHTML = `<option value="">Tous</option>`;
    types.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        filterType.appendChild(opt);
    });

    // Pages par faction
    factionPagesContainer.innerHTML = "";
    factions.forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = f;
        btn.addEventListener("click", () => {
            filterFaction.value = f;
            filterType.value = "";
            filterCost.value = "";
            filterSearch.value = "";
            applyFilters();
        });
        factionPagesContainer.appendChild(btn);
    });
}

/* ============================================================
   APPLICATION DES FILTRES
============================================================ */
function applyFilters() {
    const faction = filterFaction.value;
    const type = filterType.value;
    const costFilter = filterCost.value;
    const search = filterSearch.value.toLowerCase();

    filteredCards = allCards.filter(card => {
        if (faction && card.faction !== faction) return false;
        if (type && card.type !== type) return false;

        if (costFilter !== "") {
            const c = Number(getCardCost(card));
            if (costFilter === "other") {
                if (c === 0 || c === 1 || c === 2) return false;
            } else if (c !== Number(costFilter)) {
                return false;
            }
        }

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
   RESET FILTRES
============================================================ */
function resetFilters() {
    filterFaction.value = "";
    filterType.value = "";
    filterCost.value = "";
    filterSearch.value = "";
    applyFilters();
}

/* ============================================================
   RENDU DES CARTES
============================================================ */
function renderCards(list, container, showAdd) {
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p>Aucune carte</p>";
        return;
    }

    list.forEach(card => {
        const div = document.createElement("div");
        div.className = "card";

        const img = document.createElement("div");
        img.className = "card-image";
        if (card.image) img.style.backgroundImage = `url('${card.image}')`;

        const body = document.createElement("div");
        body.className = "card-body";

        body.innerHTML = `
            <div class="card-title-row">
                <div class="card-title">${card.name}</div>
                <div class="card-cost">${getCardCost(card)}</div>
            </div>
            <div class="card-type">${card.type}</div>
            <div class="card-effect">${card.effect || ""}</div>
        `;

        const footer = document.createElement("div");
        footer.className = "card-footer";
        footer.innerHTML = `<div class="card-limit">Limite : ${getCardLimit(card)}</div>`;

        if (showAdd) {
            const btn = document.createElement("button");
            btn.className = "add-to-deck";
            btn.textContent = "Ajouter";
            btn.onclick = () => addToDeck(card.id);
            footer.appendChild(btn);
        }

        body.appendChild(footer);
        div.appendChild(img);
        div.appendChild(body);
        container.appendChild(div);
    });
}

/* ============================================================
   RÈGLES DE CARTES
============================================================ */
function getCardLimit(card) {
    if (card.type && card.type.toLowerCase().includes("héros légendaire")) {
        return 1;
    }
    if (card.limit !== undefined) {
        return card.limit;
    }
    return 3;
}

/* ============================================================
   DECK LOGIQUE
============================================================ */
function getDeckSize() {
    return Object.values(deck).reduce((a, b) => a + b, 0);
}

function addToDeck(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    if (getDeckSize() >= DECK_MAX_SIZE) {
        alert(`Maximum ${DECK_MAX_SIZE} cartes.`);
        return;
    }

    if (deckFaction === null) {
        deckFaction = card.faction;
    } else if (deckFaction !== card.faction) {
        alert(`Deck ${deckFaction} uniquement.`);
        return;
    }

    const limit = getCardLimit(card);
    deck[cardId] = deck[cardId] || 0;

    if (deck[cardId] >= limit) {
        alert("Limite atteinte pour cette carte.");
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
    if (!confirm("Vider le deck ?")) return;
    deck = {};
    deckFaction = null;
    saveDeckToStorage();
    renderDeck();
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
        btn.onclick = () => removeFromDeck(id);

        li.appendChild(btn);
        deckList.appendChild(li);
    }

    deckCountSpan.textContent = total;

    if (total < DECK_MIN_SIZE) {
        deckCountSpan.style.color = "#facc15";
    } else if (total > DECK_MAX_SIZE) {
        deckCountSpan.style.color = "#dc2626";
    } else {
        deckCountSpan.style.color = "#22c55e";
    }
}

/* ============================================================
   LOCAL STORAGE
============================================================ */
function saveDeckToStorage() {
    localStorage.setItem("aow_deck", JSON.stringify(deck));
    localStorage.setItem("aow_deck_faction", deckFaction);
}

function loadDeckFromStorage() {
    const d = localStorage.getItem("aow_deck");
    deck = d ? JSON.parse(d) : {};

    const f = localStorage.getItem("aow_deck_faction");
    deckFaction = f || null;
}

/* ============================================================
   EXPORT / IMPORT
============================================================ */
function exportDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "deck.json";
    a.click();
}

function importDeckFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        deck = JSON.parse(ev.target.result);
        saveDeckToStorage();
        renderDeck();
    };
    reader.readAsText(file);
}

/* ============================================================
   TABS
============================================================ */
function setupTabs() {
    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
        };
    });
}
