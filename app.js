/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let allCards = [];
let filteredCards = [];
let deck = {}; // { cardId: count }
console.log(">>> VERSION 3.0 CHARGÉE");
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
const filterCostMin = document.getElementById("filterCostMin");
const filterCostMax = document.getElementById("filterCostMax");
const filterSearch = document.getElementById("filterSearch");

const factionPagesContainer = document.getElementById("factionPages");

const btnClearDeck = document.getElementById("btnClearDeck");
const btnExportDeck = document.getElementById("btnExportDeck");
const importDeckFile = document.getElementById("importDeckFile");

const deckCardGrid = document.getElementById("deckCardGrid");

/* ============================================================
   INITIALISATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    loadDeckFromStorage();
    loadCards();

    [filterFaction, filterType].forEach(el =>
        el.addEventListener("change", applyFilters)
    );
    [filterCostMin, filterCostMax, filterSearch].forEach(el =>
        el.addEventListener("input", applyFilters)
    );

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
   INIT FILTRES
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
        filterType.append.appendChild(opt);
    });

    factionPagesContainer.innerHTML = "";
    factions.forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = f;
        btn.addEventListener("click", () => {
            filterFaction.value = f;
            filterType.value = "";
            filterCostMin.value = "";
            filterCostMax.value = "";
            filterSearch.value = "";
            cardsTitle.textContent = `Faction : ${f}`;

            factionPagesContainer.querySelectorAll("button")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            applyFilters();
        });
        factionPagesContainer.appendChild(btn);
    });
}

/* ============================================================
   FILTRAGE
============================================================ */
function applyFilters() {
    const faction = filterFaction.value;
    const type = filterType.value;
    const costMin = filterCostMin.value ? parseInt(filterCostMin.value) : null;
    const costMax = filterCostMax.value ? parseInt(filterCostMax.value) : null;
    const search = filterSearch.value.toLowerCase();

    filteredCards = allCards.filter(card => {
        if (faction && card.faction !== faction) return false;
        if (type && card.type !== type) return false;

        if (costMin !== null && Number(card.cost) < costMin) return false;
        if (costMax !== null && Number(card.cost) > costMax) return false;

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
   RENDU DES CARTES
============================================================ */
function renderCards(list, container, showAdd = false) {
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p style="color:#aaa;">Aucune carte trouvée.</p>`;
        return;
    }

    list.forEach(card => {
        const div = document.createElement("div");
        div.className = "card";

        // IMAGE
        const img = document.createElement("div");
        img.className = "card-image";
        if (card.image) img.style.backgroundImage = `url('${card.image}')`;
        else {
            img.classList.add("fallback");
            img.textContent = "Pas d'image";
        }

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

        const limitDiv = document.createElement("div");
        limitDiv.className = "card-limit";
        limitDiv.textContent = `Limite : ${getCardLimit(card)}`;
        footer.appendChild(limitDiv);

        if (showAdd) {
            const btn = document.createElement("button");
            btn.className = "add-to-deck";
            btn.textContent = "Ajouter";
            btn.addEventListener("click", () => addToDeck(card.id));
            footer.appendChild(btn);
        }

        body.appendChild(footer);

        div.appendChild(img);
        div.appendChild(body);

        container.appendChild(div);
    });
}

/* ============================================================
   LIMITES CARTE
============================================================ */
function getCardLimit(card) {
    if (card.type && card.type.toLowerCase().includes("héros légendaire")) return 1;
    if (card.limit !== undefined) return card.limit;
    return 3;
}

/* ============================================================
   DECK
============================================================ */
function addToDeck(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const max = getCardLimit(card);
    if (!deck[cardId]) deck[cardId] = 0;

    if (deck[cardId] >= max) {
        alert(`Vous ne pouvez pas ajouter plus de ${max} exemplaire(s) de "${card.name}".`);
        return;
    }

    deck[cardId]++;
    saveDeckFromStorage();
    renderDeck();
}

function removeFromDeck(cardId) {
    if (!deck[cardId]) return;

    deck[cardId]--;
    if (deck[cardId] <= 0) delete deck[cardId];

    saveDeckFromStorage();
    renderDeck();
}

function clearDeck() {
    if (confirm("Vider le deck ?")) {
        deck = {};
        saveDeckFromStorage();
        renderDeck();
    }
}

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

        // Carte visuelle dans l'onglet DECK
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
   LOCALSTORAGE
============================================================ */
function saveDeckFromStorage() {
    localStorage.setItem("aow_deck", JSON.stringify(deck));
}

function loadDeckFromStorage() {
    const raw = localStorage.getItem("aow_deck");
    if (raw) deck = JSON.parse(raw);
}

/* ============================================================
   EXPORT / IMPORT
============================================================ */
function exportDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], {
        type: "application/json"
    });
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
            saveDeckFromStorage();
            renderDeck();
        } catch {
            alert("Erreur : fichier deck invalide.");
        }
    };
    reader.readAsText(file);
}

/* ============================================================
   ONGLET NAVIGATION
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
