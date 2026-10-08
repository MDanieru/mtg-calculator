document.addEventListener('DOMContentLoaded', () => {
    // Pages
    const inputSection = document.getElementById('input-section');
    const deckSection = document.getElementById('deck-section');
    
    // Buttons & Inputs List Editor
    const generateBtn = document.getElementById('generate-btn');
    const decklistInput = document.getElementById('decklist-input');
    const searchInput = document.getElementById('card-search-input');
    const autocompleteResults = document.getElementById('autocomplete-results');
    const addCardBtn = document.getElementById('add-single-card-btn');
    
    // List Editor Search QTY Controls
    const searchQtyMinus = document.getElementById('search-qty-minus');
    const searchQtyPlus = document.getElementById('search-qty-plus');
    const searchQtyDisplay = document.getElementById('search-qty-display');
    let searchQty = 1;

    // Quotation View Elements
    const backBtn = document.getElementById('back-btn');
    const loadingText = document.getElementById('loading');
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadHtmlBtn = document.getElementById('download-html-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const toggleChartsBtn = document.getElementById('toggle-charts-btn');
    
    // Exchange Rate Controls
    const rateMinus = document.getElementById('rate-minus');
    const ratePlus = document.getElementById('rate-plus');
    const rateDisplay = document.getElementById('rate-display');
    let currentExchangeRate = 17;

    // Add Another Card
    const searchInput2 = document.getElementById('card-search-input-2');
    const autocompleteResults2 = document.getElementById('autocomplete-results-2');
    const addCardBtn2 = document.getElementById('add-single-card-btn-2');

    // Display elements
    const grandTotalUsdEl = document.getElementById('grand-total-usd');
    const grandTotalMxnEl = document.getElementById('grand-total-mxn');
    const totalCardCountEl = document.getElementById('total-card-count');
    
    const tableTotalUsdEl = document.getElementById('table-total-usd');
    const tableTotalMxnEl = document.getElementById('table-total-mxn');

    const notFoundSection = document.getElementById('not-found-section');
    const notFoundList = document.getElementById('not-found-list');
    const accountingTableBody = document.querySelector('#accounting-table tbody');
    const dashboardSection = document.getElementById('dashboard-section');

    const visualGalleryGrid = document.getElementById('visual-gallery-grid');
    const tokensSection = document.getElementById('tokens-section');
    const tokensDisplay = document.getElementById('tokens-display');

    // Modal
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    
    let deckData = [];
    let notFoundCards = [];
    let searchTimeout = null;
    let charts = [];

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        if(document.body.classList.contains('light-theme')) {
            themeToggleBtn.innerText = '🌙 Dark Mode';
        } else {
            themeToggleBtn.innerText = '☀️ Light Mode';
        }
    });

    // Chart Toggle
    toggleChartsBtn.addEventListener('click', () => {
        dashboardSection.classList.toggle('hidden');
        if(dashboardSection.classList.contains('hidden')){
            toggleChartsBtn.innerText = '📊 Show Breakdown Charts';
        } else {
            toggleChartsBtn.innerText = '📊 Hide Breakdown Charts';
        }
    });

    // Modal Close
    imageModal.addEventListener('click', () => { imageModal.classList.add('hidden'); });

    // QTY Controls (List Editor Search)
    searchQtyMinus.addEventListener('click', () => {
        if(searchQty > 1) { searchQty--; searchQtyDisplay.innerText = searchQty; }
    });
    searchQtyPlus.addEventListener('click', () => {
        if(searchQty < 99) { searchQty++; searchQtyDisplay.innerText = searchQty; }
    });

    // Exchange Rate Controls
    rateMinus.addEventListener('click', () => {
        if(currentExchangeRate > 1) { 
            currentExchangeRate--; 
            rateDisplay.innerText = currentExchangeRate; 
            updateAppUI(); 
        }
    });
    ratePlus.addEventListener('click', () => {
        if(currentExchangeRate < 99) { 
            currentExchangeRate++; 
            rateDisplay.innerText = currentExchangeRate; 
            updateAppUI(); 
        }
    });

    function setupAutocomplete(inputEl, resultsEl) {
        inputEl.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);
            if (query.length < 2) {
                resultsEl.classList.add('hidden');
                resultsEl.innerHTML = '';
                return;
            }
            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        resultsEl.innerHTML = '';
                        data.data.slice(0, 6).forEach(cardName => {
                            const item = document.createElement('div');
                            item.className = 'autocomplete-item';
                            item.innerText = cardName;
                            item.addEventListener('click', () => {
                                inputEl.value = cardName;
                                resultsEl.classList.add('hidden');
                            });
                            resultsEl.appendChild(item);
                        });
                        resultsEl.classList.remove('hidden');
                    } else {
                        resultsEl.classList.add('hidden');
                    }
                } catch (err) {}
            }, 300);
        });
    }

    setupAutocomplete(searchInput, autocompleteResults);
    setupAutocomplete(searchInput2, autocompleteResults2);

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteResults.contains(e.target)) autocompleteResults.classList.add('hidden');
        if (!searchInput2.contains(e.target) && !autocompleteResults2.contains(e.target)) autocompleteResults2.classList.add('hidden');
    });

    // Add on List Editor
    addCardBtn.addEventListener('click', () => {
        const cName = searchInput.value.trim();
        if (!cName) return;

        let currentText = decklistInput.value;
        if (currentText && !currentText.endsWith('\n')) currentText += '\n';
        currentText += `${searchQty} ${cName}\n`;
        decklistInput.value = currentText;

        searchInput.value = '';
        searchQty = 1;
        searchQtyDisplay.innerText = searchQty;
    });

    // Quick Add on Quotation View
    addCardBtn2.addEventListener('click', async () => {
        const cName = searchInput2.value.trim();
        if(!cName) return;
        
        searchInput2.value = '';
        
        let existing = deckData.find(c => c.name.toLowerCase() === cName.toLowerCase());
        if(existing) {
            existing.qty += 1;
            updateAppUI();
            return;
        }

        loadingText.innerText = `Fetching ${cName}...`;
        loadingText.classList.remove('hidden');
        
        let result = await fetchScryfallAndPricingData([{qty: 1, name: cName}]);
        if(result.valid.length > 0) deckData.push(result.valid[0]);
        else alert("Card not found: " + cName);
        
        loadingText.classList.add('hidden');
        updateAppUI();
    });

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const rawMain = decklistInput.value;
            if (!rawMain || !rawMain.trim()) { alert("Please paste a list of cards."); return; }

            loadingText.innerText = "Connecting to database and fetching market prices... Please wait.";
            loadingText.classList.remove('hidden');
            generateBtn.disabled = true;

            try {
                const parsedList = parseDecklist(rawMain);
                let result = await fetchScryfallAndPricingData(parsedList);
                
                deckData = result.valid;
                notFoundCards = result.invalid;
                
                loadingText.classList.add('hidden');
                generateBtn.disabled = false;
                
                inputSection.classList.add('hidden');
                deckSection.classList.remove('hidden');

                updateAppUI();
            } catch (err) {
                loadingText.classList.add('hidden');
                generateBtn.disabled = false;
                alert("An error occurred while fetching card data. Check your connection.");
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // SYNC UPDATED LIST BACK TO TEXTAREA
            let syncText = deckData.map(c => `${c.qty} ${c.name}`).join('\n');
            decklistInput.value = syncText;
            
            deckSection.classList.add('hidden');
            inputSection.classList.remove('hidden');
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', () => updateAppUI());

    // TXT DOWNLOAD
    if (downloadTxtBtn) {
        downloadTxtBtn.addEventListener('click', () => {
            let rate = currentExchangeRate;
            let txt = `=====================================================================\n`;
            txt += `SCION OF THE SOULS - OFFICIAL QUOTATION\n`;
            txt += `WhatsApp: 55 3455 5002\n`;
            txt += `Address: Avenida Pedro Henríquez Ureña 521, 04369 Coyoacán, CDMX\n`;
            txt += `=====================================================================\n`;
            txt += `Exchange Rate: 1 USD = $${rate.toFixed(2)} MXN\n\n`;
            
            let grandUsd = 0;
            const formatLine = (qty, name, versionStr, priceUsd) => {
                let lineUsd = priceUsd * qty;
                let lineMxn = lineUsd * rate;
                let leftPart = `${qty}x ${name}`;
                let rightPart = `[${versionStr}]\t-\t$${lineUsd.toFixed(2)} USD ($${lineMxn.toFixed(2)} MXN)`;
                let padding = Math.max(2, 48 - leftPart.length);
                return leftPart + ' '.repeat(padding) + rightPart;
            };

            deckData.forEach(card => {
                let p = card.selectedPrice || 1.00;
                grandUsd += p * card.qty;
                
                let finish = 'Normal';
                if(card.selectedVersionName.includes('Foil')) finish = 'Foil';
                if(card.selectedVersionName.includes('Etched')) finish = 'Etched';

                txt += formatLine(card.qty, card.name, `${card.selectedVersionName}`, p) + '\n';
            });

            let grandMxn = grandUsd * rate;
            txt += `\n=====================================================================\nTOTAL: $${grandUsd.toFixed(2)} USD ($${grandMxn.toFixed(2)} MXN)\n`;

            const blob = new Blob([txt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Scion-Quote.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // HTML DOWNLOAD
    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', () => {
            let rate = currentExchangeRate;
            let grandUsd = 0;
            
            let tableRows = '';
            let imageGrid = '';

            deckData.forEach(card => {
                let p = card.selectedPrice || 1.00;
                grandUsd += p * card.qty;
                
                let verStr = card.selectedVersionName || '';
                let setMatch = verStr.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
                let exp = setMatch ? setMatch[1] : 'N/A';
                let num = setMatch ? setMatch[2] : 'N/A';
                
                let finish = 'Normal';
                if(verStr.includes('Foil')) finish = 'Foil';
                if(verStr.includes('Etched')) finish = 'Etched';

                tableRows += `
                    <tr>
                        <td style="text-align:center; font-weight:bold;">${card.qty}</td>
                        <td>${card.name}</td>
                        <td>${exp}</td>
                        <td>${num}</td>
                        <td>${finish}</td>
                        <td style="text-align:right;">$${(p * card.qty).toFixed(2)}</td>
                        <td style="text-align:right;">$${(p * card.qty * rate).toFixed(2)}</td>
                    </tr>
                `;

                let imgUri = card.image_uris ? card.image_uris.normal : '';
                if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
                
                if(imgUri) {
                    imageGrid += `
                        <div style="position:relative; width: 180px; margin-bottom: 20px;">
                            <img src="${imgUri}" style="width:100%; border-radius:10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                            <div style="position:absolute; top:-10px; right:-10px; background:#0284c7; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white;">${card.qty}</div>
                        </div>
                    `;
                }
            });

            let grandMxn = grandUsd * rate;

            let htmlContent = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scion of the Souls - Quotation</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 28px; }
                    .header p { margin: 5px 0; color: #475569; font-size: 14px; }
                    .contact { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                    th { background: #0f172a; color: white; padding: 12px; text-align: left; }
                    th:last-child, th:nth-last-child(2) { text-align: right; }
                    td { padding: 12px; border-bottom: 1px solid #cbd5e1; }
                    tfoot td { background: #f1f5f9; font-weight: bold; font-size: 16px; }
                    .gallery { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 40px; border-top: 2px dashed #cbd5e1; padding-top: 30px;}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SCION OF THE SOULS</h1>
                        <p>Card Quotation & Order Summary</p>
                    </div>
                    
                    <div class="contact">
                        <strong>WhatsApp:</strong> 55 3455 5002<br>
                        <strong>Address:</strong> Avenida Pedro Henríquez Ureña 521, 04369 Coyoacán, CDMX<br>
                        <strong>Exchange Rate:</strong> 1 USD = $${rate.toFixed(2)} MXN
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="text-align:center;">Qty</th>
                                <th>Card Name</th>
                                <th>Set</th>
                                <th>#</th>
                                <th>Finish</th>
                                <th style="text-align:right;">USD</th>
                                <th style="text-align:right;">MXN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="5" style="text-align:right;">GRAND TOTAL:</td>
                                <td style="text-align:right; color:#0284c7;">$${grandUsd.toFixed(2)}</td>
                                <td style="text-align:right; color:#0284c7;">$${grandMxn.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="gallery">
                        ${imageGrid}
                    </div>
                </div>
            </body>
            </html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Scion-Quote.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function parseDecklist(text) {
        const lines = text.split('\n');
        const map = new Map();
        const regex = /^(?:(\d+)\s*x?\s+)?(.+)$/i;
        const ignoreWords = ['commander', 'commanders', 'deck', 'mainboard', 'creature', 'creatures', 'instant', 'instants', 'sorcery', 'sorceries', 'artifact', 'artifacts', 'enchantment', 'enchantments', 'planeswalker', 'planeswalkers', 'land', 'lands', 'other'];

        lines.forEach(line => {
            let trimLine = line.trim();
            if (!trimLine) return;
            let lowerLine = trimLine.toLowerCase();
            if (ignoreWords.includes(lowerLine)) return;

            const match = trimLine.match(regex);
            if (match && match[2]) {
                let qty = match[1] ? parseInt(match[1]) : 1;
                let name = match[2].trim();
                let key = name.toLowerCase();

                if (map.has(key)) map.get(key).qty += qty;
                else map.set(key, { qty: qty, name: name });
            }
        });
        return Array.from(map.values());
    }

    async function fetchScryfallAndPricingData(parsedList) {
        let validCards = [];
        let invalidCards = [];
        const chunkSize = 50; 
        
        for (let i = 0; i < parsedList.length; i += chunkSize) {
            const chunk = parsedList.slice(i, i + chunkSize);
            for (const originalCard of chunk) {
                let cleanName = originalCard.name.split('/')[0].replace(/\s*\(.*\).*$/, '').trim();
                try {
                    const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=%21\"${encodeURIComponent(cleanName)}\"+unique%3Aprints`);
                    const searchData = await searchRes.json();
                    
                    if(searchData.object === "error") throw new Error("Not found");

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

                            if (pUsd !== null) versions.push({ versionDisplay: `${setName} - Non-foil${treatmentStr} (#${collectorNum})`, versionName: `${setId} (#${collectorNum}) - Non-foil`, price: pUsd, image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null) });
                            if (pFoil !== null) {
                                let foilLabel = 'Foil';
                                if (print.finishes && print.finishes.includes('compleat')) foilLabel = 'Compleat Foil';
                                else if (print.finishes && print.finishes.includes('surge')) foilLabel = 'Surge Foil';
                                versions.push({ versionDisplay: `${setName} - ${foilLabel}${treatmentStr} (#${collectorNum})`, versionName: `${setId} (#${collectorNum}) - ${foilLabel}`, price: pFoil, image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null) });
                            }
                            if (pEtched !== null) versions.push({ versionDisplay: `${setName} - Etched Foil${treatmentStr} (#${collectorNum})`, versionName: `${setId} (#${collectorNum}) - Etched Foil`, price: pEtched, image_uris: print.image_uris || (print.card_faces ? print.card_faces[0].image_uris : null) });
                        });
                    }

                    const directRes = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`);
                    const primaryCard = await directRes.json();

                    if (primaryCard && primaryCard.name) {
                        let cardCopy = Object.assign({}, primaryCard);
                        cardCopy.qty = originalCard.qty;
                        cardCopy.availableVersions = versions.length > 0 ? versions : [{ versionDisplay: 'Default - Non-foil (#1)', versionName: 'DEF (#1) - Non-foil', price: 1.00, image_uris: primaryCard.image_uris }];
                        cardCopy.selectedVersionIndex = 0;
                        cardCopy.selectedPrice = cardCopy.availableVersions[0].price;
                        cardCopy.selectedVersionName = cardCopy.availableVersions[0].versionName;
                        validCards.push(cardCopy);
                    } else invalidCards.push(originalCard.name);
                } catch (e) { invalidCards.push(originalCard.name); }
            }
        }
        return { valid: validCards, invalid: invalidCards };
    }

    function updateAppUI() {
        let totalCount = deckData.reduce((sum, c) => sum + c.qty, 0);
        totalCardCountEl.innerText = `${totalCount}`;

        updateGrandTotals();
        renderMissingCards();
        renderAccountingTable();
        renderDashboard();
        renderDecklist(deckData, document.getElementById('sort-select').value);
        renderVisualGallery();
        renderTokens();
    }

    function renderMissingCards() {
        if(notFoundCards.length > 0) {
            notFoundSection.classList.remove('hidden');
            notFoundList.innerHTML = '';
            notFoundCards.forEach(name => {
                let li = document.createElement('li');
                li.innerText = name;
                notFoundList.appendChild(li);
            });
        } else {
            notFoundSection.classList.add('hidden');
        }
    }

    function renderAccountingTable() {
        accountingTableBody.innerHTML = '';
        deckData.forEach(card => {
            let p = card.selectedPrice || 1.00;
            let tr = document.createElement('tr');
            
            let verStr = card.selectedVersionName || '';
            let setMatch = verStr.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
            let exp = setMatch ? setMatch[1] : 'N/A';
            let num = setMatch ? setMatch[2] : 'N/A';

            let finish = 'Normal';
            if(verStr.includes('Foil')) finish = 'Foil';
            if(verStr.includes('Etched')) finish = 'Etched';

            tr.innerHTML = `
                <td>${card.qty}</td>
                <td>${card.name}</td>
                <td>${exp}</td>
                <td>${num}</td>
                <td>${finish}</td>
                <td>$${(p * card.qty).toFixed(2)}</td>
                <td>$${(p * card.qty * currentExchangeRate).toFixed(2)}</td>
            `;
            accountingTableBody.appendChild(tr);
        });
    }

    function updateGrandTotals() {
        let totalUsd = 0;
        deckData.forEach(card => totalUsd += (card.selectedPrice || 1.00) * card.qty);
        let totalMxn = totalUsd * currentExchangeRate;

        grandTotalUsdEl.innerText = `$${totalUsd.toFixed(2)}`;
        grandTotalMxnEl.innerText = `$${totalMxn.toFixed(2)}`;
        tableTotalUsdEl.innerText = `$${totalUsd.toFixed(2)}`;
        tableTotalMxnEl.innerText = `$${totalMxn.toFixed(2)}`;
    }

    function renderDashboard() {
        if(deckData.length === 0) return;
        
        charts.forEach(c => c.destroy());
        charts = [];

        let cmcCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
        let typeCounts = { Creature:0, Instant:0, Sorcery:0, Artifact:0, Land:0 };
        let colorCounts = { White:0, Black:0, Red:0, Green:0, Blue:0, Multicolor:0, Colorless:0 };
        
        deckData.forEach(card => {
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
                if (cColors.includes('W')) colorCounts.White += card.qty;
                if (cColors.includes('B')) colorCounts.Black += card.qty;
                if (cColors.includes('R')) colorCounts.Red += card.qty;
                if (cColors.includes('G')) colorCounts.Green += card.qty;
                if (cColors.includes('U')) colorCounts.Blue += card.qty;
            }
        });

        const pieOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', layout: { padding: 5 }, plugins: { legend: { display: false } } };
        const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false } } };

        const ctxCurve = document.getElementById('manaCurveChart').getContext('2d');
        charts.push(new Chart(ctxCurve, { type: 'bar', data: { labels: Object.keys(cmcCounts), datasets: [{ data: Object.values(cmcCounts), backgroundColor: '#3b82f6', borderRadius: 4 }] }, options: barOpts }));

        const ctxColor = document.getElementById('colorPieChart').getContext('2d');
        charts.push(new Chart(ctxColor, { type: 'doughnut', data: { labels: Object.keys(colorCounts), datasets: [{ data: Object.values(colorCounts), backgroundColor: ['#fcf1cd', '#334155', '#ef4444', '#22c55e', '#3b82f6', '#f5d064', '#94a3b8'], borderWidth: 0 }] }, options: pieOpts }));

        const ctxType = document.getElementById('typePieChart').getContext('2d');
        charts.push(new Chart(ctxType, { type: 'doughnut', data: { labels: Object.keys(typeCounts), datasets: [{ data: Object.values(typeCounts), backgroundColor: ['#22c55e', '#334155', '#3b82f6', '#0ea5e9', '#fcf1cd'], borderWidth: 0 }] }, options: pieOpts }));
    }

    function parseManaCost(costString) {
        if (!costString) return '';
        let html = '';
        const symbols = costString.match(/\{([^}]+)\}/g);
        if (symbols) {
            symbols.forEach(sym => {
                let char = sym.replace('{', '').replace('}', '').toLowerCase().replace('/', '');
                html += `<i class="ms ms-${char} ms-cost"></i>`;
            });
        }
        return html;
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
        if (sortMode === 'cost') orderedKeys = Object.keys(groups).sort((a,b) => (a==='Land'?1:(b==='Land'?-1:parseInt(a)-parseInt(b))));

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
                if (!rawCost && card.card_faces && card.card_faces.length > 0) rawCost = card.card_faces[0].mana_cost || '';
                let costHtml = parseManaCost(rawCost);

                let versionOptions = '';
                card.availableVersions.forEach((ver, idx) => {
                    let sel = idx === card.selectedVersionIndex ? 'selected' : '';
                    versionOptions += `<option value="${idx}" ${sel}>${ver.versionDisplay} ($${ver.price.toFixed(2)})</option>`;
                });

                let currentLinePrice = (card.selectedPrice * card.qty);
                let currentLineMxn = currentLinePrice * currentExchangeRate;
                
                const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

                item.innerHTML = `
                    <div class="card-item-left">
                        <button class="remove-card-btn" data-cardname="${card.name}" title="Remove Card">${trashIcon}</button>
                        <div class="qty-controls">
                            <button class="qty-btn minus-btn">-</button>
                            <span class="qty-display">${card.qty}</span>
                            <button class="qty-btn plus-btn">+</button>
                        </div>
                        <span class="card-name" title="Tap to view image">${card.name}</span>
                        <div class="card-cost">${costHtml}</div>
                    </div>
                    <div class="card-pricing-info">
                        <select class="version-select" data-cardname="${card.name}">
                            ${versionOptions}
                        </select>
                        <div class="card-price-display">
                            $${currentLinePrice.toFixed(2)} USD<br>
                            <span style="font-size:10px; font-weight:normal; opacity:0.8;">($${currentLineMxn.toFixed(2)} MXN)</span>
                        </div>
                    </div>
                `;

                item.querySelector('.remove-card-btn').addEventListener('click', () => {
                    deckData = deckData.filter(c => c.name !== card.name);
                    updateAppUI();
                });

                item.querySelector('.minus-btn').addEventListener('click', () => {
                    if (card.qty > 1) { card.qty--; updateAppUI(); }
                });
                item.querySelector('.plus-btn').addEventListener('click', () => {
                    if (card.qty < 99) { card.qty++; updateAppUI(); }
                });

                const selectEl = item.querySelector('.version-select');
                selectEl.addEventListener('change', (ev) => {
                    let idx = parseInt(ev.target.value);
                    let vObj = card.availableVersions[idx];
                    card.selectedVersionIndex = idx;
                    card.selectedPrice = vObj.price;
                    card.selectedVersionName = vObj.versionName;
                    if (vObj.image_uris) card.image_uris = vObj.image_uris;
                    updateAppUI();
                });
                
                const cardNameEl = item.querySelector('.card-name');
                cardNameEl.addEventListener('click', () => {
                    let imgUri = card.image_uris ? card.image_uris.normal : '';
                    if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
                    
                    if(imgUri) {
                        modalImg.src = imgUri;
                        imageModal.classList.remove('hidden');
                    }
                });
                col.appendChild(item);
            });
            grid.appendChild(col);
        });
    }

    function renderVisualGallery() {
        visualGalleryGrid.innerHTML = '';
        deckData.forEach(card => {
            let imgUri = card.image_uris ? card.image_uris.normal : '';
            if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
            
            if(imgUri) {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'gallery-card';
                cardDiv.innerHTML = `
                    <div class="gallery-qty">${card.qty}</div>
                    <img src="${imgUri}" alt="${card.name}">
                `;
                cardDiv.addEventListener('click', () => {
                    modalImg.src = imgUri;
                    imageModal.classList.remove('hidden');
                });
                visualGalleryGrid.appendChild(cardDiv);
            }
        });
    }

    async function renderTokens() {
        tokensDisplay.innerHTML = '';
        let tokenIds = new Set();
        let tokens = [];

        deckData.forEach(card => {
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
            tokensSection.classList.add('hidden');
            return;
        }
        
        tokensSection.classList.remove('hidden');

        for (const tokenRef of tokens) {
            try {
                const res = await fetch(tokenRef.uri);
                const tokenData = await res.json();
                
                let imgUri = tokenData.image_uris ? tokenData.image_uris.normal : '';
                if (!imgUri && tokenData.card_faces && tokenData.card_faces[0].image_uris) imgUri = tokenData.card_faces[0].image_uris.normal;

                if(imgUri) {
                    const tCard = document.createElement('div');
                    tCard.className = 'gallery-card';
                    tCard.innerHTML = `<img src="${imgUri}" alt="${tokenData.name}">`;
                    tCard.addEventListener('click', () => {
                        modalImg.src = imgUri;
                        imageModal.classList.remove('hidden');
                    });
                    tokensDisplay.appendChild(tCard);
                }
            } catch (e) {}
        }
    }
});
