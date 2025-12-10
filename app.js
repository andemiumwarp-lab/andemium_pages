// ========================
//   DATA + ÉTAT GLOBAL
// ========================
let allCards = [];
let filteredCards = [];
let deck = {}; // { cardId: count }

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

// ========================
//   INIT
// ========================
document.addEventListener("DOMContentLoaded", () => {
    loadDeckFromStorage();
    loadCards();

    // Filtres
    [filterFaction, filterType].forEach(el =>
        el.addEventListener("change", applyFilters)
    );
    [filterCostMin, filterCostMax, filterSearch].forEach(el =>
        el.addEventListener("input", applyFilters)
    );

    // Deck actions
    btnClearDeck.addEventListener("click", clearDeck);
    btnExportDeck.addEventListener("click", exportDeck);
    importDeckFile.addEventListener("change", importDeckFromFile);

    // Onglets
    setupTabs();
});

async function loadCards() {
    const res = await fetch("cards.json");
    allCards = await res.json();
    generateFactionButtons();
    applyFilters();
}

// ========================
//   FILTRES & AFFICHAGE
// ========================
function applyFilters() {
    const faction = filterFaction.value;
    const type = filterType.value;
    const costMin = filterCostMin.value !== "" ? parseInt(filterCostMin.value, 10) : null;
    const costMax = filterCostMax.value !== "" ? parseInt(filterCostMax.value, 10) : null;
    const search = filterSearch.value.toLowerCase().trim();

    filteredCards = allCards.filter(card => {
        if (faction && card.faction !== faction) return false;
        if (type && card.type !== type) return false;
        if (costMin !== null && card.cost < costMin) return false;
        if (costMax !== null && card.cost > costMax) return false;

        if (search) {
            const haystack = [
                card.name,
                card.effect || "",
                (card.keywords || []).join(" "),
                card.faction,
                card.type
            ]
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(search)) return false;
        }

        return true;
    });

    cardsCountSpan.textContent = `${filteredCards.length} carte${filteredCards.length > 1 ? "s" : ""}`;
    renderCards(filteredCards, cardsGrid, true);
}

// Affichage des cartes dans une grille donnée
function renderCards(list, container, showAddButton = false) {
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p style="color:#9ca3af;font-size:.9rem;">Aucune carte trouvée.</p>`;
        return;
    }

    list.forEach(card => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card";

        // Image
        const imgDiv = document.createElement("div");
        imgDiv.className = "card-image";

        const imgUrl = card.image && card.image.trim() !== ""
            ? card.image
            : null;

        if (imgUrl) {
            imgDiv.style.backgroundImage = `url("${imgUrl}")`;
        } else {
            imgDiv.classList.add("fallback");
            imgDiv.textContent = "Aucune image";
        }

        const factionTag = document.createElement("div");
        factionTag.className = "card-faction-tag";
        factionTag.textContent = card.faction;
        imgDiv.appendChild(factionTag);

        // Corps
        const bodyDiv = document.createElement("div");
        bodyDiv.className = "card-body";

        const titleRow = document.createElement("div");
        titleRow.className = "card-title-row";

        const title = document.createElement("div");
        title.className = "card-title";
        title.textContent = card.name;

        const costSpan = document.createElement("div");
        costSpan.className = "card-cost";
        costSpan.textContent = `Coût ${card.cost}`;

        titleRow.appendChild(title);
        titleRow.appendChild(costSpan);

        const typeDiv = document.createElement("div");
        typeDiv.className = "card-type";
        typeDiv.textContent = `${card.type}`;

        const keywordsDiv = document.createElement("div");
        keywordsDiv.className = "card-keywords";
        if (card.keywords && card.keywords.length > 0) {
            keywordsDiv.textContent = card.keywords.join(" • ");
        }

        const effectDiv = document.createElement("div");
        effectDiv.className = "card-effect";
        effectDiv.textContent = card.effect || "";

        const footer = document.createElement("div");
        footer.className = "card-footer";

        const powerDiv = document.createElement("div");
        powerDiv.className = "card-power";
        powerDiv.textContent = `ATK ${card.power ?? "-"}`;

        footer.appendChild(powerDiv);

        if (showAddButton) {
            const addBtn = document.createElement("button");
            addBtn.className = "add-to-deck";
            addBtn.textContent = "Ajouter au deck";
            addBtn.addEventListener("click", () => {
                addToDeck(card.id);
            });
            footer.appendChild(addBtn);
        }

        bodyDiv.appendChild(titleRow);
        bodyDiv.appendChild(typeDiv);
        bodyDiv.appendChild(keywordsDiv);
        bodyDiv.appendChild(effectDiv);
        bodyDiv.appendChild(footer);

        cardDiv.appendChild(imgDiv);
        cardDiv.appendChild(bodyDiv);

        container.appendChild(cardDiv);
    });
}

// ========================
//   FACTIONS – "PAGES"
// ========================
function generateFactionButtons() {
    const factions = Array.from(
        new Set(allCards.map(c => c.faction))
    ).sort();

    factionPagesContainer.innerHTML = "";
    factions.forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = f;
        btn.addEventListener("click", () => {
            // On simule "page par faction"
            filterFaction.value = f;
            filterSearch.value = "";
            filterType.value = "";
            filterCostMin.value = "";
            filterCostMax.value = "";
            cardsTitle.textContent = `Faction : ${f}`;
            factionPagesContainer
                .querySelectorAll("button")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
        });
        factionPagesContainer.appendChild(btn);
    });
}

// ========================
//   DECK
// ========================
function addToDeck(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    // Définition des limites
    let maxCopies = 3; // limite par défaut

    // Si la carte a une limite explicite dans le JSON
    if (card.limit !== undefined) {
        maxCopies = card.limit;
    }

    // Si la carte est un héros légendaire → limite 1
    // (fonctionne même si limit n'est pas défini)
    if (card.type && card.type.toLowerCase().includes("héros légendaire")) {
        maxCopies = 1;
    }

    // Vérifie si on a atteint la limite
    if (!deck[cardId]) {
        deck[cardId] = 0;
    }

    if (deck[cardId] >= maxCopies) {
        alert(`Vous ne pouvez pas ajouter plus de ${maxCopies} exemplaire(s) de cette carte.`);
        return;
    }

    // Ajout dans le deck
    deck[cardId] += 1;
    saveDeckToStorage();
    renderDeck();
}


function removeFromDeck(cardId) {
    if (!deck[cardId]) return;
    deck[cardId] -= 1;
    if (deck[cardId] <= 0) {
        delete deck[cardId];
    }
    saveDeckToStorage();
    renderDeck();
}

function clearDeck() {
    if (!confirm("Vider le deck ?")) return;
    deck = {};
    saveDeckToStorage();
    renderDeck();
}

function renderDeck() {
    deckList.innerHTML = "";

    const entries = Object.entries(deck); // [ [cardId, count], ... ]
    let totalCount = 0;

    entries.forEach(([cardId, count]) => {
        totalCount += count;
        const card = allCards.find(c => c.id === cardId);
        if (!card) return;

        const li = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.className = "deck-card-name";
        nameSpan.textContent = card.name;

        const badge = document.createElement("span");
        badge.className = "deck-count-badge";
        badge.textContent = `x${count}`;

        const removeBtn = document.createElement("button");
        removeBtn.className = "deck-remove-btn";
        removeBtn.textContent = "-1";
        removeBtn.addEventListener("click", () => removeFromDeck(cardId));

        li.appendChild(nameSpan);
        li.appendChild(badge);
        li.appendChild(removeBtn);

        deckList.appendChild(li);
    });

    deckCountSpan.textContent = totalCount;

    // Vue "Mon deck" (onglet 2)
    const fullDeckCards = entries
        .map(([cardId, count]) => {
            const card = allCards.find(c => c.id === cardId);
            if (!card) return null;
            return { card, count };
        })
        .filter(Boolean);

    deckCardGrid.innerHTML = "";
    const deckExpanded = [];
    fullDeckCards.forEach(({ card, count }) => {
        for (let i = 0; i < count; i++) {
            deckExpanded.push(card);
        }
    });
    renderCards(deckExpanded, deckCardGrid, false);
}

function saveDeckToStorage() {
    localStorage.setItem("aow_deck", JSON.stringify(deck));
}

function loadDeckFromStorage() {
    const raw = localStorage.getItem("aow_deck");
    if (!raw) return;
    try {
        deck = JSON.parse(raw) || {};
    } catch {
        deck = {};
    }
}

// ========================
//   EXPORT / IMPORT DECK
// ========================
function exportDeck() {
    const data = {
        format: "AndemiumOfWarpDeck",
        version: 1,
        deck
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck_andemium.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importDeckFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.deck) throw new Error("Format invalide");
            deck = data.deck;
            saveDeckToStorage();
            renderDeck();
            alert("Deck importé avec succès !");
        } catch (err) {
            alert("Erreur à l'import du deck.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// ========================
//   ONGLET NAVIGATION
// ========================
function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabs = {
        cards: document.getElementById("tab-cards"),
        deck: document.getElementById("tab-deck")
    };

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const tabName = btn.dataset.tab;
            Object.entries(tabs).forEach(([name, el]) => {
                el.classList.toggle("active", name === tabName);
            });
        });
    });

    // Affiche le deck correctement quand on va sur l’onglet
    document.querySelector('[data-tab="deck"]').addEventListener("click", () => {
        renderDeck();
    });
}
