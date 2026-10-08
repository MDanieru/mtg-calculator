document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const backBtn = document.getElementById('back-btn');
    const inputSection = document.getElementById('input-section');
    const deckSection = document.getElementById('deck-section');
    const loadingText = document.getElementById('loading');
    const hoverImg = document.getElementById('card-hover-image');
    const totalCountEl = document.getElementById('total-card-count');
    const displayDeckName = document.getElementById('display-deck-name');
    const toggleBreakdownBtn = document.getElementById('toggle-breakdown-btn');
    const dashboardSection = document.getElementById('dashboard-section');
    const downloadBtn = document.getElementById('download-btn');
    
    const deckNameInput = document.getElementById('deck-name-input');
    const decklistInput = document.getElementById('decklist-input');
    const fileInput = document.getElementById('file-input');
    const searchInput = document.getElementById('card-search-input');
    const qtyInput = document.getElementById('card-qty-input');
    const addCardBtn = document.getElementById('add-single-card-btn');
    const autocompleteResults = document.getElementById('autocomplete-results');
    const exchangeRateInput = document.getElementById('exchange-rate-input');
    const grandTotalUsdEl = document.getElementById('grand-total-usd');
    const grandTotalMxnEl = document.getElementById('grand-total-mxn');
    
    const showcaseSection = document.getElementById('commander-showcase');
    
    let deckData = [];
    let charts = [];
    let searchTimeout = null;

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                decklistInput.value = evt.target.result;
                if (!deckNameInput.value) {
                    deckNameInput.value = file.name.replace('.txt', '').replace(/-/g, ' ');
                }
            };
            reader.readAsText(file);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);
            if (query.length < 2) {
                autocompleteResults.classList.add('hidden');
                autocompleteResults.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        autocompleteResults.innerHTML = '';
                        data.data.slice(0, 8).forEach(cardName => {
                            const item = document.createElement('div');
                            item.className = 'autocomplete-item';
                            item.innerText = cardName;
                            item.addEventListener('click', () => {
                                searchInput.value = cardName;
                                autocompleteResults.classList.add('hidden');
                            });
                            autocompleteResults.appendChild(item);
                        });
                        autocompleteResults.classList.remove('hidden');
                    } else {
                        autocompleteResults.classList.add('hidden');
                    }
                } catch (err) {
                    console.error("Autocomplete error:", err);
                }
            }, 300);
        });
    }

    document.addEventListener('click', (e) => {
        if (searchInput && autocompleteResults && !searchInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
            autocompleteResults.classList.add('hidden');
        }
    });

    if (addCardBtn) {
        addCardBtn.addEventListener('click', () => {
            const cName = searchInput.value.trim();
            const cQty = parseInt(qtyInput.value) || 1;
            if (!cName) return;

            let currentText = decklistInput.value;
            if (currentText && !currentText.endsWith('\n')) currentText += '\n';
            currentText += `${cQty} ${cName}\n`;
            decklistInput.value = currentText;

            searchInput.value = '';
            qtyInput.value = '1';
        });
    }

    if (exchangeRateInput) {
        exchangeRateInput.addEventListener('input', () => {
            updateGrandTotals();
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const rawMain = decklistInput.value;
            if (!rawMain || !rawMain.trim()) {
                alert("Please paste or upload a decklist.");
                return;
            }

            loadingText.classList.remove('hidden');
            generateBtn.disabled = true;

            try {
                const parsedList = parseDecklist(rawMain);
                deckData = await fetchScryfallAndPricingData(parsedList);
                
                loadingText.classList.add('hidden');
                generateBtn.disabled = false;
                
                inputSection.classList.add('hidden');
                deckSection.classList.remove('hidden');
                
                let customName = deckNameInput.value.trim() || 'CUSTOM COMMANDER DECK';
                displayDeckName.innerText = customName;

                updateAppUI();
            } catch (err) {
                console.error("Error generating deck:", err);
                loadingText.classList.add('hidden');
                generateBtn.disabled = false;
                alert("An error occurred while fetching card data. Check your connection.");
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            deckSection.classList.add('hidden');
            inputSection.classList.remove('hidden');
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            updateAppUI();
        });
    }

    if (toggleBreakdownBtn) {
        toggleBreakdownBtn.addEventListener('click', () => {
            dashboardSection.classList.toggle('hidden');
            if (dashboardSection.classList.contains('hidden')) {
                toggleBreakdownBtn.innerText = 'SHOW DECK BREAKDOWN';
            } else {
                toggleBreakdownBtn.innerText = 'HIDE DECK BREAKDOWN';
            }
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            let dName = deckNameInput.value.trim() || 'Deck Quote';
            let rate = parseFloat(exchangeRateInput.value) || 17;
            
            let txt = `DECK QUOTE: ${dName}\n`;
            txt += `Exchange Rate: 1 USD = $${rate.toFixed(2)} MXN\n`;
            txt += `=========================================================================================\n\n`;
            
            let grandUsd = 0;
            
            const formatLine = (qty, name, versionStr, priceUsd) => {
                let lineUsd = priceUsd * qty;
                let lineMxn = lineUsd * rate;
                let leftPart = `${qty}x ${name}`;
                let rightPart = `[${versionStr}]\t-\t$${lineUsd.toFixed(2)} USD ($${lineMxn.toFixed(2)} MXN)`;
                let padding = Math.max(2, 48 - leftPart.length);
                return leftPart + ' '.repeat(padding) + rightPart;
            };

            const commanders = deckData.filter(c => c.isCommander);
            if (commanders.length > 0) {
                txt += "COMMANDER:\n";
                commanders.forEach(card => {
                    let p = card.selectedPrice || 1.00;
                    grandUsd += p * card.qty;
                    txt += formatLine(card.qty, card.name, card.selectedVersionName || 'Non-foil', p) + '\n';
                });
                txt += "\n";
            }
            
            txt += "DECK:\n";
            deckData.filter(c => !c.isCommander).forEach(card => {
                let p = card.selectedPrice || 1.00;
                grandUsd += p * card.qty;
                txt += formatLine(card.qty, card.name, card.selectedVersionName || 'Non-foil', p) + '\n';
            });

            let grandMxn = grandUsd * rate;
            txt += `\n=========================================================================================\n`;
            txt += `TOTAL: $${grandUsd.toFixed(2)} USD ($${grandMxn.toFixed(2)} MXN)\n`;

            const blob = new Blob([txt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = dName.toLowerCase().replace(/\s+/g, '-') + '-quote.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function parseDecklist(text) {
        const lines = text.split('\n');
        const list = [];
        const regex = /^(?:(\d+)\s*x?\s+)?(.+)$/i;
        let isCmdSection = false;

        const categories = [
            'deck', 'mainboard', 'creature', 'creatures', 'instant', 'instants', 
            'sorcery', 'sorceries', 'instants & sorceries', 'artifact', 'artifacts', 
            'enchantment', 'enchantments', 'planeswalker', 'planeswalkers', 
            'artifacts, enchantments & planeswalkers', 'land', 'lands', 'other'
        ];

        lines.forEach(line => {
            let trimLine = line.trim();
            if (!trimLine) return;

            let lowerLine = trimLine.toLowerCase();
            
            if (lowerLine === 'commander' || lowerLine === 'commanders') {
                isCmdSection = true;
                return;
            }

            if (categories.includes(lowerLine)) {
                isCmdSection = false;
                return;
            }

            const match = trimLine.match(regex);
            if (match && match[2]) {
                let qty = match[1] ? parseInt(match[1]) : 1;
                let name = match[2].trim();
                list.push({ qty: qty, name: name, isCommander: isCmdSection });
            }
        });
        return list;
    }

    async function fetchScryfallAndPricingData(parsedList) {
        let allCards = [];
        const chunkSize = 50; 
        
        for (let i = 0; i < parsedList.length; i += chunkSize) {
            const chunk = parsedList.slice(i, i + chunkSize);
            
            for (const originalCard of chunk) {
                let cleanName = originalCard.name.split('/')[0].replace(/\s*\(.*\).*$/, '').trim();
                try {
                    const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=%21\"${encodeURIComponent(cleanName)}\"+unique%3Aprints`);
                    const searchData = await searchRes.json();
                    
                    let versions = [];
                    if (searchData.data && searchData.data.length > 0) {
                        searchData.data.forEach(print => {
                            let pUsd = print.prices && print.prices.usd ? parseFloat(print.prices.usd) : null;
                            let pFoil = print.prices && print.prices.usd_foil ? parseFloat(print.prices.usd_foil) : null;
                            let pEtched = print.prices && print.prices.usd_etched ? parseFloat(print.prices.usd_etched) : null;
                            
                            let setName = print.set_name;
                            let setId = print.set.toUpperCase();
                            let collectorNum = print.collector_number;
                            
                            let treatments = [];
                            if (print.border_color === 'borderless' || print.full_art) treatments.push('Borderless');
                            if (print.promo_types && print.promo_types.includes('textured')) treatments.push('Showcase');
                            if (print.frame_effects && print.frame_effects.includes('showcase')) treatments.push('Showcase');
                            if (print.promo_types && print.promo_types.includes('promopack')) treatments.push('Promo Pack');
                            if (print.promo_types && print.promo_types.includes('prerelease')) treatments.push('Prerelease');
                            
                            let treatmentStr = treatments.length > 0 ? ` (${treatments.join(', ')})` : '';

                            if (pUsd !== null) {
                                versions.push({
                                    versionDisplay: `${setName} - Non-foil${treatmentStr} (#${collectorNum})`,
                                    versionName: `${setId} (#${collectorNum}) - Non-foil`,
                                    price: pUsd,
                                    image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null)
                                });
                            }
                            if (pFoil !== null) {
                                let foilLabel = 'Foil';
                                if (print.finishes && print.finishes.includes('compleat')) foilLabel = 'Compleat Foil';
                                else if (print.finishes && print.finishes.includes('surge')) foilLabel = 'Surge Foil';
                                
                                versions.push({
                                    versionDisplay: `${setName} - ${foilLabel}${treatmentStr} (#${collectorNum})`,
                                    versionName: `${setId} (#${collectorNum}) - ${foilLabel}`,
                                    price: pFoil,
                                    image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null)
                                });
                            }
                            if (pEtched !== null) {
                                versions.push({
                                    versionDisplay: `${setName} - Etched Foil${treatmentStr} (#${collectorNum})`,
                                    versionName: `${setId} (#${collectorNum}) - Etched Foil`,
                                    price: pEtched,
                                    image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null)
                                });
                            }
                        });
                    }

                    const directRes = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`);
                    const primaryCard = await directRes.json();

                    if (primaryCard && primaryCard.name) {
                        let cardCopy = Object.assign({}, primaryCard);
                        cardCopy.qty = originalCard.qty;
                        cardCopy.isCommander = originalCard.isCommander;
                        cardCopy.availableVersions = versions.length > 0 ? versions : [{ versionDisplay: 'Default - Non-foil (#1)', versionName: 'DEF (#1) - Non-foil', price: 1.00, image_uris: primaryCard.image_uris }];
                        cardCopy.selectedVersionIndex = 0;
                        cardCopy.selectedPrice = cardCopy.availableVersions[0].price;
                        cardCopy.selectedVersionName = cardCopy.availableVersions[0].versionName;
                        allCards.push(cardCopy);
                    } else {
                        throw new Error("Not found");
                    }
                } catch (e) {
                    allCards.push({
                        name: originalCard.name,
                        qty: originalCard.qty,
                        isCommander: originalCard.isCommander,
                        cmc: 0,
                        color_identity: [],
                        type_line: "Unknown",
                        mana_cost: "",
                        rarity: "common",
                        availableVersions: [{ versionDisplay: 'Default - Non-foil (#1)', versionName: 'DEF (#1) - Non-foil', price: 1.00, image_uris: null }],
                        selectedVersionIndex: 0,
                        selectedPrice: 1.00,
                        selectedVersionName: 'DEF (#1) - Non-foil',
                        image_uris: { normal: "https://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg" }
                    });
                }
            }
        }
        return allCards;
    }

    function updateAppUI() {
        let totalCount = deckData.reduce((sum, c) => sum + c.qty, 0);
        totalCountEl.innerText = `${totalCount} / 0`;
        renderCommander(deckData.filter(c => c.isCommander));
        renderDashboard(deckData);
        renderDecklist(deckData, document.getElementById('sort-select').value);
        renderTokens(deckData);
        updateGrandTotals();
    }

    function updateGrandTotals() {
        if (!exchangeRateInput || !grandTotalUsdEl || !grandTotalMxnEl) return;
        let rate = parseFloat(exchangeRateInput.value) || 17;
        let totalUsd = 0;
        deckData.forEach(card => {
            let p = card.selectedPrice || 1.00;
            totalUsd += p * card.qty;
        });
        let totalMxn = totalUsd * rate;

        grandTotalUsdEl.innerText = `$${totalUsd.toFixed(2)} USD`;
        grandTotalMxnEl.innerText = `$${totalMxn.toFixed(2)} MXN`;
    }

    function parseManaCost(costString) {
        if (!costString) return '';
        let html = '';
        const symbols = costString.match(/\{([^}]+)\}/g);
        if (symbols) {
            symbols.forEach(sym => {
                let char = sym.replace('{', '').replace('}', '').toLowerCase();
                char = char.replace('/', '');
                html += `<i class="ms ms-${char} ms-cost"></i>`;
            });
        }
        return html;
    }

    function renderCommander(commanders) {
        showcaseSection.innerHTML = '';
        if (commanders.length === 0) {
            showcaseSection.classList.add('hidden');
            return;
        }

        showcaseSection.classList.remove('hidden');
        commanders.forEach(card => {
            let imgUri = card.image_uris ? card.image_uris.normal : '';
            if (!imgUri && card.card_faces) imgUri = card.card_faces[0].image_uris.normal;
            
            const img = document.createElement('img');
            img.src = imgUri;
            img.alt = card.name;
            showcaseSection.appendChild(img);
        });
    }

    function renderDecklist(cards, sortMode) {
        const grid = document.getElementById('decklist-grid');
        grid.innerHTML = '';

        const groups = {};

        cards.forEach(card => {
            let key = 'Other';
            let tLine = (card.type_line || '').toLowerCase();

            if (sortMode === 'type') {
                if (tLine.includes('creature')) key = 'Creature';
                else if (tLine.includes('instant')) key = 'Instant';
                else if (tLine.includes('sorcery')) key = 'Sorcery';
                else if (tLine.includes('artifact')) key = 'Artifact';
                else if (tLine.includes('enchantment')) key = 'Enchantment';
                else if (tLine.includes('planeswalker')) key = 'Planeswalker';
                else if (tLine.includes('land') || tLine.includes('forest') || tLine.includes('island') || tLine.includes('swamp') || tLine.includes('mountain') || tLine.includes('plains')) key = 'Land';
            } else if (sortMode === 'color') {
                let cColors = card.color_identity || card.colors || [];
                if (cColors.length === 0) key = 'Colorless';
                else if (cColors.length > 1) key = 'Multicolor';
                else {
                    const cMap = {'W': 'White', 'U': 'Blue', 'B': 'Black', 'R': 'Red', 'G': 'Green'};
                    key = cMap[cColors[0]];
                }
            } else if (sortMode === 'cost') {
                if (tLine.includes('land') || tLine.includes('forest') || tLine.includes('island') || tLine.includes('swamp') || tLine.includes('mountain') || tLine.includes('plains')) key = 'Land';
                else key = `${Math.floor(card.cmc || 0)}`;
            } else if (sortMode === 'rarity') {
                const rMap = {'common': 'Common', 'uncommon': 'Uncommon', 'rare': 'Rare', 'mythic': 'Mythic Rare'};
                key = rMap[card.rarity] || 'Other';
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(card);
        });

        let orderedKeys = Object.keys(groups).sort();
        if (sortMode === 'type') orderedKeys = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land', 'Other'].filter(k => groups[k]);
        if (sortMode === 'color') orderedKeys = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless', 'Other'].filter(k => groups[k]);
        if (sortMode === 'rarity') orderedKeys = ['Common', 'Uncommon', 'Rare', 'Mythic Rare', 'Other'].filter(k => groups[k]);
        if (sortMode === 'cost') {
            orderedKeys = Object.keys(groups).sort((a,b) => {
                if (a === 'Land') return 1;
                if (b === 'Land') return -1;
                return parseInt(a) - parseInt(b);
            });
        }

        orderedKeys.forEach(groupName => {
            const groupCards = groups[groupName];
            const totalCards = groupCards.reduce((sum, c) => sum + c.qty, 0);
            
            const col = document.createElement('div');
            col.className = 'column';
            col.innerHTML = `<h2><span>${groupName}</span> <span>${totalCards} CARDS</span></h2>`;
            
            groupCards.forEach(card => {
                const item = document.createElement('div');
                item.className = 'card-item';
                
                let rawCost = card.mana_cost;
                if (!rawCost && card.card_faces && card.card_faces.length > 0) {
                    rawCost = card.card_faces[0].mana_cost || '';
                }
                let costHtml = parseManaCost(rawCost);

                let versionOptions = '';
                card.availableVersions.forEach((ver, idx) => {
                    let sel = idx === card.selectedVersionIndex ? 'selected' : '';
                    versionOptions += `<option value="${idx}" ${sel}>${ver.versionDisplay} ($${ver.price.toFixed(2)})</option>`;
                });

                let currentLinePrice = (card.selectedPrice * card.qty);
                let rate = parseFloat(exchangeRateInput ? exchangeRateInput.value : 17) || 17;
                let currentLineMxn = currentLinePrice * rate;
                
                item.innerHTML = `
                    <div class="card-item-left">
                        <button class="remove-card-btn" data-cardname="${card.name}" title="Remove Card">🗑️</button>
                        <input type="number" class="card-qty-input-row" value="${card.qty}" min="1" max="999" data-cardname="${card.name}"> 
                        <span class="card-name">${card.name}</span>
                        <div class="card-cost">${costHtml}</div>
                    </div>
                    <div class="card-pricing-info">
                        <select class="version-select" data-cardname="${card.name}">
                            ${versionOptions}
                        </select>
                        <div class="card-price-display">
                            $${currentLinePrice.toFixed(2)} USD<br>
                            <span style="font-size:10px; opacity:0.7;">($${currentLineMxn.toFixed(2)} MXN)</span>
                        </div>
                    </div>
                `;

                // Handle delete button
                const removeBtn = item.querySelector('.remove-card-btn');
                removeBtn.addEventListener('click', () => {
                    deckData = deckData.filter(c => c.name !== card.name);
                    updateAppUI();
                });

                // Handle quantity change
                const qtyInputRow = item.querySelector('.card-qty-input-row');
                qtyInputRow.addEventListener('change', (ev) => {
                    let newQty = parseInt(ev.target.value) || 1;
                    if (newQty < 1) newQty = 1;
                    if (newQty > 999) newQty = 999;
                    card.qty = newQty;
                    updateAppUI();
                });

                // Handle version change
                const selectEl = item.querySelector('.version-select');
                selectEl.addEventListener('change', (ev) => {
                    let idx = parseInt(ev.target.value);
                    let vObj = card.availableVersions[idx];

                    card.selectedVersionIndex = idx;
                    card.selectedPrice = vObj.price;
                    card.selectedVersionName = vObj.versionName;
                    
                    if (vObj.image_uris) {
                        card.image_uris = vObj.image_uris;
                    }
                    updateAppUI();
                });
                
                // Eventos visuales anclados UNICAMENTE al nombre de la carta
                const cardNameEl = item.querySelector('.card-name');

                cardNameEl.addEventListener('mouseenter', () => {
                    let imgUri = card.image_uris ? card.image_uris.normal : '';
                    if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
                    hoverImg.src = imgUri;
                    hoverImg.style.transform = 'none';
                    hoverImg.classList.remove('hidden');
                });
                cardNameEl.addEventListener('mousemove', (e) => {
                    let xPos = e.clientX + 20;
                    let imgH = hoverImg.offsetHeight || 340; 
                    let yPos = e.clientY - (imgH / 2);
                    
                    if (yPos < 10) yPos = 10;
                    if (yPos + imgH > window.innerHeight) {
                        yPos = window.innerHeight - imgH - 10;
                    }

                    hoverImg.style.left = xPos + 'px';
                    hoverImg.style.top = yPos + 'px';
                });
                cardNameEl.addEventListener('mouseleave', () => {
                    hoverImg.classList.add('hidden');
                });

                // Touch events para movil
                cardNameEl.addEventListener('touchstart', (e) => {
                    let imgUri = card.image_uris ? card.image_uris.normal : '';
                    if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
                    hoverImg.src = imgUri;
                    
                    hoverImg.style.left = '50%';
                    hoverImg.style.top = '50%';
                    hoverImg.style.transform = 'translate(-50%, -50%)';
                    hoverImg.classList.remove('hidden');
                }, {passive: true});
                
                cardNameEl.addEventListener('touchend', () => {
                    hoverImg.classList.add('hidden');
                    hoverImg.style.transform = 'none';
                });

                col.appendChild(item);
            });
            grid.appendChild(col);
        });
    }

    function renderTokens(cards) {
        const tokenDisplay = document.getElementById('tokens-display');
        tokenDisplay.innerHTML = '';
        
        let tokenIds = new Set();
        let tokens = [];

        cards.forEach(card => {
            if (card.all_parts) {
                card.all_parts.forEach(part => {
                    if ((part.component === 'token' || part.component === 'emblem') && !tokenIds.has(part.id)) {
                        tokenIds.add(part.id);
                        tokens.push(part);
                    }
                });
            }
        });

        if (tokens.length === 0) {
            document.getElementById('tokens-section').classList.add('hidden');
            return;
        }
        
        document.getElementById('tokens-section').classList.remove('hidden');

        tokens.forEach(async tokenRef => {
            try {
                const res = await fetch(tokenRef.uri);
                const tokenData = await res.json();
                
                let img1 = tokenData.image_uris ? tokenData.image_uris.normal : '';
                let img2 = '';
                
                if (tokenData.card_faces && tokenData.card_faces.length > 1 && tokenData.card_faces[0].image_uris) {
                    img1 = tokenData.card_faces[0].image_uris.normal;
                    img2 = tokenData.card_faces[1].image_uris.normal;
                }

                const tCard = document.createElement('div');
                tCard.className = 'token-card';
                
                let flipBtnHtml = img2 ? `<button class="flip-btn" onclick="this.previousElementSibling.src = this.previousElementSibling.src === '${img1}' ? '${img2}' : '${img1}'">⟳</button>` : '';

                tCard.innerHTML = `
                    <img src="${img1}" alt="${tokenData.name}">
                    ${flipBtnHtml}
                    <h4>${tokenData.name}</h4>
                    <p style="color: #ea3601; font-size: 12px; margin-top: 10px;">TREATMENT<br><span style="color: white">Default</span></p>
                `;
                tokenDisplay.appendChild(tCard);
            } catch (e) {
                console.error("Failed to load token", e);
            }
        });
    }

    function renderDashboard(cards) {
        charts.forEach(c => c.destroy());
        charts = [];

        let cmcCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
        let typeCounts = { Creature:0, Instant:0, Sorcery:0, Artifact:0, Land:0 };
        let colorCounts = { White:0, Black:0, Red:0, Green:0, Blue:0, Multicolor:0, Colorless:0 };
        
        cards.forEach(card => {
            let tLine = card.type_line || '';
            let cColors = card.color_identity || card.colors || [];
            let cmc = card.cmc || 0;

            if (!tLine.toLowerCase().includes('land')) {
                let c = Math.floor(cmc);
                if (c >= 9) c = 9;
                if (cmcCounts[c] !== undefined) cmcCounts[c] += card.qty;
                else cmcCounts[c] = card.qty;
            }

            if (tLine.toLowerCase().includes('creature')) typeCounts.Creature += card.qty;
            else if (tLine.toLowerCase().includes('instant')) typeCounts.Instant += card.qty;
            else if (tLine.toLowerCase().includes('sorcery')) typeCounts.Sorcery += card.qty;
            else if (tLine.toLowerCase().includes('artifact')) typeCounts.Artifact += card.qty;
            else if (tLine.toLowerCase().includes('land')) typeCounts.Land += card.qty;

            if (cColors.length === 0) colorCounts.Colorless += card.qty;
            else if (cColors.length > 1) colorCounts.Multicolor += card.qty;
            else {
                if (cColors.includes('W')) card.qty ? colorCounts.White += card.qty : 0;
                if (cColors.includes('B')) colorCounts.Black += card.qty;
                if (cColors.includes('R')) colorCounts.Red += card.qty;
                if (cColors.includes('G')) colorCounts.Green += card.qty;
                if (cColors.includes('U')) colorCounts.Blue += card.qty;
            }
        });

        const chartOptionsPie = { 
            responsive: true,
            maintainAspectRatio: false, 
            cutout: '65%', 
            layout: { padding: 10 },
            plugins: { legend: { display: false }, tooltip: { enabled: true } } 
        };
        const chartOptionsBar = { 
            responsive: true,
            maintainAspectRatio: false, 
            layout: { padding: { top: 20, bottom: 5 } },
            plugins: { legend: { display: false } }, 
            scales: { 
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }, 
                y: { display: false } 
            } 
        };

        const ctxCurve = document.getElementById('manaCurveChart').getContext('2d');
        charts.push(new Chart(ctxCurve, {
            type: 'bar',
            data: {
                labels: Object.keys(cmcCounts),
                datasets: [{
                    data: Object.values(cmcCounts),
                    backgroundColor: '#e5e7e6',
                    borderRadius: 20
                }]
            },
            options: chartOptionsBar
        }));

        const ctxColor = document.getElementById('colorPieChart').getContext('2d');
        charts.push(new Chart(ctxColor, {
            type: 'doughnut',
            data: {
                labels: Object.keys(colorCounts),
                datasets: [{
                    data: Object.values(colorCounts),
                    backgroundColor: ['#fcf1cd', '#d3d3d3', '#f6a687', '#a2cca2', '#b3d1ff', '#f5d064', '#e5e7e6'],
                    borderWidth: 0
                }]
            },
            options: chartOptionsPie
        }));

        const ctxType = document.getElementById('typePieChart').getContext('2d');
        charts.push(new Chart(ctxType, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#a2cca2', '#d3d3d3', '#b3d1ff', '#62dbd6', '#fcf1cd'],
                    borderWidth: 0
                }]
            },
            options: chartOptionsPie
        }));
    }
});
