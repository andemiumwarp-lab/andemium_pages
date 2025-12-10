let allCards = [];
let filteredCards = [];
let deck = {};

const cardsGrid = document.getElementById("cardsGrid");
const deckList = document.getElementById("deckList");
const deckCountSpan = document.getElementById("deckCount");
const cardsCountSpan = document.getElementById("cardsCount");
const cardsTitle = document.getElementById("cardsTitle");

const filterFaction = document.getElementById("filterFaction");
const filterType = document.getElementById("filterType");
const filterSearch = document.getElementById("filterSearch");

const factionPagesContainer = document.getElementById("factionPages");

const btnClearDeck = document.getElementById("btnClearDeck");
const btnExportDeck = document.getElementById("btnExportDeck");
const importDeckFile = document.getElementById("importDeckFile");

const deckCardGrid = document.getElementById("deckCardGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadDeckFromStorage();
    loadCards();

    filterFaction.addEventListener("change", applyFilters);
    filterType.addEventListener("change", applyFilters);
    filterSearch.addEventListener("input", applyFilters);

    btnClearDeck.addEventListener("click", clearDeck);
    btnExportDeck.addEventListener("click", exportDeck);
    importDeckFile.addEventListener("change", importDeckFromFile);

    setupTabs();
});

async function loadCards() {
    const res = await fetch("cards.json");
    allCards = await res.json();
    initFilters();
    applyFilters();
}

function initFilters() {
    const factions = [...new Set(allCards.map(c => c.faction))].sort();
    factions.forEach(f => {
        const opt = document.createElement("option");
        opt.textContent = f;
        filterFaction.appendChild(opt);
    });

    const types = [...new Set(allCards.map(c => c.type))].sort();
    types.forEach(t => {
        const opt = document.createElement("option");
        opt.textContent = t;
        filterType.appendChild(opt);
    });

    factionPagesContainer.innerHTML = "";
    factions.forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = f;
        btn.addEventListener("click", () => {
            filterFaction.value = f;
            applyFilters();
        });
        factionPagesContainer.appendChild(btn);
    });
}

function applyFilters() {
    const f = filterFaction.value;
    const t = filterType.value;
    const s = filterSearch.value.toLowerCase();

    filteredCards = allCards.filter(c =>
        (!f || c.faction === f) &&
        (!t || c.type === t) &&
        c.name.toLowerCase().includes(s)
    );

    cardsCountSpan.textContent = filteredCards.length + " carte(s)";
    renderCards(filteredCards, cardsGrid, true);
}

function renderCards(list, container, showAddButton = false) {
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p>Aucune carte trouvée.</p>";
        return;
    }

    list.forEach(card => {
        const div = document.createElement("div");
        div.className = "card";

        const img = document.createElement("div");
        img.className = "card-image";
        img.style.backgroundImage = `url('${card.image}')`;

        const body = document.createElement("div");
        body.className = "card-body";

        const title = document.createElement("div");
        title.textContent = card.name;

        const type = document.createElement("div");
        type.textContent = card.type;

        const limit = document.createElement("div");
        limit.className = "card-limit";
        limit.textContent = "Limite : " + getCardLimit(card);

        body.appendChild(title);
        body.appendChild(type);
        body.appendChild(limit);

        if (showAddButton) {
            const btn = document.createElement("button");
            btn.className = "add-to-deck";
            btn.textContent = "Ajouter";
            btn.addEventListener("click", () => addToDeck(card.id));
            body.appendChild(btn);
        }

        div.appendChild(img);
        div.appendChild(body);
        container.appendChild(div);
    });
}

function getCardLimit(card) {
    if (card.type && card.type.toLowerCase().includes("héros légendaire")) return 1;
    if (card.limit !== undefined) return card.limit;
    return 3;
}

function addToDeck(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const maxCopies = getCardLimit(card);

    if (!deck[cardId]) deck[cardId] = 0;

    if (deck[cardId] >= maxCopies) {
        alert(
            `Vous ne pouvez pas ajouter plus de ${maxCopies} exemplaire(s) de "${card.name}".`
        );
        return;
    }

    deck[cardId]++;
    saveDeckToStorage();
    renderDeck();
}

function renderDeck() {
    deckList.innerHTML = "";
    deckCardGrid.innerHTML = "";

    let total = 0;

    for (const [cardId, count] of Object.entries(deck)) {
        const card = allCards.find(c => c.id === cardId);
        if (!card) continue;

        total += count;

        const li = document.createElement("li");
        li.textContent = `${card.name}  x${count}/${getCardLimit(card)}`;
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
            <div>${card.name}</div>
            <div>${card.type}</div>
            <div class="card-limit">Limite : ${getCardLimit(card)}</div>
        </div>`;
    return div;
}

function clearDeck() {
    if (confirm("Vider le deck ?")) {
        deck = {};
        saveDeckToStorage();
        renderDeck();
    }
}

function saveDeckToStorage() {
    localStorage.setItem("deck_aow", JSON.stringify(deck));
}

function loadDeckFromStorage() {
    const raw = localStorage.getItem("deck_aow");
    if (raw) deck = JSON.parse(raw);
}

function exportDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck.json";
    a.click();
}

function importDeckFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        deck = JSON.parse(e.target.result);
        saveDeckToStorage();
        renderDeck();
    };
    reader.readAsText(file);
}

function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const tabs = document.querySelectorAll(".tab");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            tabs.forEach(t => t.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

            if (btn.dataset.tab === "deck") renderDeck();
        });
    });
}
