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
    const loadingProgress = document.getElementById('loading-progress');
    const progressBarFill = document.getElementById('progress-bar-fill');
    
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadHtmlBtn = document.getElementById('download-html-btn');
    
    const themeToggleBtn = document.getElementById('theme-toggle');
    const toggleChartsBtn = document.getElementById('toggle-charts-btn');
    
    // Sort/Group
    const groupSelect = document.getElementById('group-select');
    const sortSelect = document.getElementById('sort-select');
    
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
    
    const tableTotalQtyEl = document.getElementById('table-total-qty');
    const tableTotalUsdEl = document.getElementById('table-total-usd');
    const tableTotalMxnEl = document.getElementById('table-total-mxn');

    const notFoundSection = document.getElementById('not-found-section');
    const notFoundList = document.getElementById('not-found-list');
    const accountingTableBody = document.querySelector('#accounting-table tbody');
    const dashboardSection = document.getElementById('dashboard-section');
    const decklistGrid = document.getElementById('decklist-grid');

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

    // QTY Controls
    searchQtyMinus.addEventListener('click', () => {
        if(searchQty > 1) { searchQty--; searchQtyDisplay.innerText = searchQty; }
    });
    searchQtyPlus.addEventListener('click', () => {
        if(searchQty < 99) { searchQty++; searchQtyDisplay.innerText = searchQty; }
    });

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
        if(loadingProgress) loadingProgress.innerText = 'Calculating...';
        if(progressBarFill) progressBarFill.style.width = '0%';
        
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
            if(loadingProgress) loadingProgress.innerText = 'Calculating...';
            if(progressBarFill) progressBarFill.style.width = '0%';
            
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
            let syncText = deckData.map(c => `${c.qty} ${c.name}`).join('\n');
            if (notFoundCards.length > 0) {
                syncText += '\n\n' + notFoundCards.map(n => `1 ${n}`).join('\n');
            }
            decklistInput.value = syncText.trim();
            
            deckSection.classList.add('hidden');
            inputSection.classList.remove('hidden');
        });
    }

    groupSelect.addEventListener('change', () => updateAppUI());
    sortSelect.addEventListener('change', () => updateAppUI());

    // Helper: Collect required tokens
    async function getRequiredTokens() {
        let tokenIds = new Set();
        let tokens = [];

        deckData.forEach(card => {
            if (card.all_parts) {
                card.all_parts.forEach(part => {
                    if ((part.component === 'token' || part.component === 'emblem') && !tokenIds.has(part.id)) {
                        tokenIds.add(part.id);
                        tokens.push({ id: part.id, name: part.name, uri: part.uri, image: null });
                    }
                });
            }
        });
        
        for (let token of tokens) {
            try {
                const res = await fetch(token.uri);
                const tokenData = await res.json();
                let imgUri = tokenData.image_uris ? tokenData.image_uris.normal : '';
                if (!imgUri && tokenData.card_faces && tokenData.card_faces[0].image_uris) imgUri = tokenData.card_faces[0].image_uris.normal;
                token.image = imgUri;
            } catch (e) {}
        }
        return tokens;
    }

    // TXT DOWNLOAD
    if (downloadTxtBtn) {
        downloadTxtBtn.addEventListener('click', async () => {
            let rate = currentExchangeRate;
            let txt = `================================================================================\n`;
            txt += `                    SCION OF THE SOULS - OFFICIAL QUOTATION                 V41\n`;
            txt += `================================================================================\n`;
            txt += `WhatsApp: 55 3455 5002\n`;
            txt += `Address:  Avenida Pedro Henríquez Ureña 521, 04369 Coyoacán, CDMX\n`;
            txt += `Rate:     1 USD = $${rate.toFixed(2)} MXN\n`;
            txt += `================================================================================\n\n`;

            let grandUsd = 0;
            let totalQty = 0;
            
            // Group cards by type
            const groups = {};
            const groupMode = groupSelect.value;
            const sortMode = sortSelect.value;
            
            let sortedData = sortCards([...deckData], sortMode);

            sortedData.forEach(card => {
                let key = getGroupKey(card, groupMode);
                if (!groups[key]) groups[key] = [];
                groups[key].push(card);
            });

            let orderedKeys = Object.keys(groups).sort();
            // Force Custom Order for Type
            if (groupMode === 'Type') orderedKeys = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands', 'Other'].filter(k => groups[k]);

            orderedKeys.forEach(groupName => {
                const groupCards = groups[groupName];
                const typeCardsTotal = groupCards.reduce((sum, c) => sum + c.qty, 0);
                
                txt += `--- ${groupName.toUpperCase()} (${typeCardsTotal}) ---\n`;
                
                groupCards.forEach(card => {
                    let p = card.selectedPrice || 1.00;
                    totalQty += card.qty;
                    grandUsd += p * card.qty;
                    
                    let verStr = card.selectedVersionName || '';
                    let setMatch = verStr.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
                    let exp = setMatch ? setMatch[1] : 'N/A';
                    let num = setMatch ? setMatch[2] : 'N/A';
                    let finish = verStr.includes('Foil') ? 'Foil' : (verStr.includes('Etched') ? 'Etched' : 'Normal');
                    
                    let lineUsd = p * card.qty;
                    let lineMxn = lineUsd * rate;
                    
                    let leftPart = `${card.qty}x ${card.name}`;
                    if(leftPart.length > 38) leftPart = leftPart.substring(0, 35) + '...';
                    leftPart = leftPart.padEnd(40, ' ');
                    
                    let middlePart = `[${exp} #${num} - ${finish}]`;
                    middlePart = middlePart.padEnd(25, ' ');
                    
                    let rightPart = `$${lineUsd.toFixed(2)} USD ($${lineMxn.toFixed(2)} MXN)`;
                    
                    txt += `${leftPart}${middlePart}${rightPart}\n`;
                });
                txt += `\n`;
            });

            let grandMxn = grandUsd * rate;
            txt += `================================================================================\n`;
            txt += `GRAND TOTAL (${totalQty} CARDS):`.padEnd(65, ' ') + `$${grandUsd.toFixed(2)} USD ($${grandMxn.toFixed(2)} MXN)\n`;
            txt += `================================================================================\n`;

            let reqTokens = await getRequiredTokens();
            if (reqTokens.length > 0) {
                txt += `\n*** REQUIRED TOKENS (Reference only - NOT included in quoted price) ***\n`;
                reqTokens.forEach(t => txt += `- ${t.name}\n`);
            }

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
        downloadHtmlBtn.addEventListener('click', async () => {
            let rate = currentExchangeRate;
            let grandUsd = 0;
            let totalQty = 0;
            
            let tableRows = '';
            let imageGrid = '';
            
            let sortedData = sortCards([...deckData], sortSelect.value);

            sortedData.forEach(card => {
                let p = card.selectedPrice || 1.00;
                grandUsd += p * card.qty;
                totalQty += card.qty;
                
                let verStr = card.selectedVersionName || '';
                let setMatch = verStr.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
                let exp = setMatch ? setMatch[1] : 'N/A';
                
                let finish = 'Normal';
                if(verStr.includes('Foil')) finish = 'Foil';
                if(verStr.includes('Etched')) finish = 'Etched';
                
                let setIcon = exp !== 'N/A' ? `<i class="ss ss-${exp.toLowerCase()}" style="margin-right: 4px; color: #475569;"></i>` : '';

                tableRows += `
                    <tr>
                        <td style="text-align:center; font-weight:bold;">${card.qty}</td>
                        <td>${card.name}</td>
                        <td>${setIcon}${exp}</td>
                        <td>${finish}</td>
                        <td style="text-align:right;">$${p.toFixed(2)}</td>
                        <td style="text-align:right;">$${(p * card.qty).toFixed(2)}</td>
                        <td style="text-align:right;">$${(p * card.qty * rate).toFixed(2)}</td>
                    </tr>
                `;

                let imgUri = card.image_uris ? card.image_uris.normal : '';
                if (!imgUri && card.card_faces && card.card_faces[0].image_uris) imgUri = card.card_faces[0].image_uris.normal;
                
                if(imgUri) {
                    imageGrid += `
                        <div style="position:relative; width: 180px; margin-bottom: 20px;">
                            <img src="${imgUri}" crossorigin="anonymous" style="width:100%; border-radius:10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                            <div style="position:absolute; top:-10px; right:-10px; background:#0284c7; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white;">${card.qty}</div>
                        </div>
                    `;
                }
            });

            let reqTokens = await getRequiredTokens();
            let tokensHtml = '';
            if (reqTokens.length > 0) {
                let tokenImagesHtml = '';
                for(const t of reqTokens) {
                    if(t.image) {
                        tokenImagesHtml += `<div style="width: 140px;"><img src="${t.image}" crossorigin="anonymous" style="width:100%; border-radius:8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"></div>`;
                    } else {
                        tokenImagesHtml += `<div style="background: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; color: #b45309; border: 1px solid #fcd34d;">${t.name}</div>`;
                    }
                }
            
                tokensHtml = `
                    <div style="margin-top: 40px; padding: 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;">
                        <h3 style="margin-top:0; color: #b45309; font-size: 16px;">Required Tokens</h3>
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #92400e; font-weight: bold;">(Reference Only. These tokens are NOT included in the quoted price.)</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            ${tokenImagesHtml}
                        </div>
                    </div>
                `;
            }

            let grandMxn = grandUsd * rate;

            let htmlContent = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scion of the Souls - Quotation</title>
                <link href="https://cdn.jsdelivr.net/npm/keyrune@latest/css/keyrune.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 28px; }
                    .header p { margin: 5px 0; color: #475569; font-size: 14px; }
                    .contact { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                    th { background: #0f172a; color: white; padding: 12px; text-align: left; }
                    th:last-child, th:nth-last-child(2), th:nth-last-child(3) { text-align: right; }
                    td { padding: 12px; border-bottom: 1px solid #cbd5e1; }
                    tfoot td { background: #f1f5f9; font-weight: bold; font-size: 16px; }
                    .gallery { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 40px; border-top: 2px dashed #cbd5e1; padding-top: 30px;}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SCION OF THE SOULS <span style='font-size: 12px; color: #94a3b8;'>V41</span></h1>
                        <p>Card Quotation & Order Summary</p>
                    </div>
                    <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 25px; border-radius: 4px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <span style="font-size: 24px;">💻</span>
                        <div>
                            <strong style="color: #0369a1; display: block; margin-bottom: 4px; font-size: 15px;">Optimal Viewing Experience</strong>
                            <span style="color: #0c4a6e; font-size: 13px; line-height: 1.4; display: block;">To ensure all card images load perfectly, please open this file on a <strong>desktop computer (PC or Mac)</strong>. Mobile browsers natively block local files from displaying external images for security reasons.</span>
                        </div>
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
                                <th>Finish</th>
                                <th style="text-align:right;">Unit USD</th>
                                <th style="text-align:right;">Total USD</th>
                                <th style="text-align:right;">Total MXN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="text-align:center; font-weight:bold;">${totalQty}</td>
                                <td colspan="4" style="text-align:right;">GRAND TOTAL:</td>
                                <td style="text-align:right; color:#0284c7;">$${grandUsd.toFixed(2)}</td>
                                <td style="text-align:right; color:#0284c7;">$${grandMxn.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="gallery">
                        ${imageGrid}
                    </div>

                    ${tokensHtml}
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
        
        let totalCards = parsedList.length;
        let processedCards = 0;
        
        for (let i = 0; i < parsedList.length; i += chunkSize) {
            const chunk = parsedList.slice(i, i + chunkSize);
            for (const originalCard of chunk) {
                processedCards++;
                let percent = Math.round((processedCards / totalCards) * 100);
                let remainingCards = totalCards - processedCards;
                let estimatedSeconds = Math.ceil(remainingCards * 0.35); // Approx 350ms per card via API
                
                if (loadingProgress) {
                    loadingProgress.innerText = `Processing: ${processedCards} of ${totalCards} cards | Est. Time Remaining: ~${estimatedSeconds}s`;
                }
                if (progressBarFill) {
                    progressBarFill.style.width = `${percent}%`;
                }

                let cleanName = originalCard.name.split('/')[0].replace(/\s*\(.*\).*$/, '').trim();
                try {
                    // Polite delay to prevent Scryfall 429 Rate Limit Errors
                    await new Promise(resolve => setTimeout(resolve, 120));

                    const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=%21\"${encodeURIComponent(cleanName)}\"+unique%3Aprints`);
                    const searchData = await searchRes.json();
                    
                    if(searchData.object === "error") throw new Error("Not found");

                    let versions = [];
                    let primaryCard = searchData.data[0];

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

    function sortCards(cards, sortMode) {
        return cards.sort((a, b) => {
            if(sortMode === 'Name') return a.name.localeCompare(b.name);
            if(sortMode === 'Mana Value') return (a.cmc || 0) - (b.cmc || 0);
            if(sortMode === 'Price') return (b.selectedPrice || 0) - (a.selectedPrice || 0);
            if(sortMode === 'Color') {
                let ca = (a.colors && a.colors.length > 0) ? a.colors[0] : 'Z';
                let cb = (b.colors && b.colors.length > 0) ? b.colors[0] : 'Z';
                return ca.localeCompare(cb);
            }
            if(sortMode === 'Rarity') {
                const rMap = {'common':1, 'uncommon':2, 'rare':3, 'mythic':4};
                return (rMap[b.rarity] || 0) - (rMap[a.rarity] || 0);
            }
            return 0;
        });
    }

    function getGroupKey(card, groupMode) {
        if(groupMode === 'Type') {
            let t = (card.type_line || '').split('—')[0].toLowerCase();
            if (t.includes('creature')) return 'Creatures';
            if (t.includes('instant')) return 'Instants';
            if (t.includes('sorcery')) return 'Sorceries';
            if (t.includes('artifact')) return 'Artifacts';
            if (t.includes('enchantment')) return 'Enchantments';
            if (t.includes('planeswalker')) return 'Planeswalkers';
            if (t.includes('land') || tLine.includes('forest') || tLine.includes('island') || tLine.includes('swamp') || tLine.includes('mountain') || tLine.includes('plains')) return 'Lands';
            return 'Other';
        }
        if(groupMode === 'SubType') {
            if(!card.type_line.includes('—')) return 'No Subtype';
            return card.type_line.split('—')[1].trim().split(' ')[0] || 'Unknown';
        }
        if(groupMode === 'Rarity') return (card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)) || 'Other';
        if(groupMode === 'Color' || groupMode === 'Color Identity') {
            let colors = groupMode === 'Color' ? card.colors : card.color_identity;
            if(!colors || colors.length === 0) return 'Colorless';
            if(colors.length > 1) return 'Multicolor';
            const cMap = {'W': 'White', 'U': 'Blue', 'B': 'Black', 'R': 'Red', 'G': 'Green'};
            return cMap[colors[0]] || 'Other';
        }
        if(groupMode === 'Mana Value') return `MV ${Math.floor(card.cmc || 0)}`;
        if(groupMode === 'Set') return card.set_name || 'Unknown';
        if(groupMode === 'Artist') return card.artist || 'Unknown';
        return 'All Cards';
    }

    function updateAppUI() {
        let totalQty = 0;
        let totalUsd = 0;

        deckData.forEach(card => {
            totalQty += card.qty;
            totalUsd += (card.selectedPrice || 1.00) * card.qty;
        });
        
        let totalMxn = totalUsd * currentExchangeRate;

        // Big UI elements
        grandTotalUsdEl.innerText = `$${totalUsd.toFixed(2)}`;
        grandTotalMxnEl.innerText = `$${totalMxn.toFixed(2)}`;
        
        // Table Footers
        tableTotalQtyEl.innerText = totalQty;
        tableTotalUsdEl.innerText = `$${totalUsd.toFixed(2)}`;
        tableTotalMxnEl.innerText = `$${totalMxn.toFixed(2)}`;

        renderMissingCards();
        renderAccountingTable();
        renderDashboard();
        renderDecklist(deckData, document.getElementById('group-select').value, document.getElementById('sort-select').value);
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
        
        // Sort for table presentation
        let sortedData = sortCards([...deckData], sortSelect.value);
        
        sortedData.forEach(card => {
            let p = card.selectedPrice || 1.00;
            let tr = document.createElement('tr');
            
            let verStr = card.selectedVersionName || '';
            let setMatch = verStr.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
            let exp = setMatch ? setMatch[1] : 'N/A';
            
            let finish = 'Normal';
            if(verStr.includes('Foil')) finish = 'Foil';
            if(verStr.includes('Etched')) finish = 'Etched';
            
            let setIcon = exp !== 'N/A' ? `<i class="ss ss-${exp.toLowerCase()}" style="margin-right: 4px; color: var(--text-muted);"></i>` : '';

            tr.innerHTML = `
                <td>${card.qty}</td>
                <td>${card.name}</td>
                <td>${setIcon}${exp}</td>
                <td>${finish}</td>
                <td style="text-align:right;">$${p.toFixed(2)}</td>
                <td style="text-align:right;">$${(p * card.qty).toFixed(2)}</td>
                <td style="text-align:right;">$${(p * card.qty * currentExchangeRate).toFixed(2)}</td>
            `;
            accountingTableBody.appendChild(tr);
        });
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

    function renderDecklist(cards, groupMode, sortMode) {
        const grid = document.getElementById('decklist-grid');
        grid.innerHTML = '';

        const typeIcons = {
            'Creatures': 'ms-creature',
            'Instants': 'ms-instant',
            'Sorceries': 'ms-sorcery',
            'Artifacts': 'ms-artifact',
            'Enchantments': 'ms-enchantment',
            'Planeswalkers': 'ms-planeswalker',
            'Lands': 'ms-land',
            'Other': 'ms-dfc'
        };

        const groups = {};
        let sortedCards = sortCards([...cards], sortMode);

        sortedCards.forEach(card => {
            let key = getGroupKey(card, groupMode);
            if (!groups[key]) groups[key] = [];
            groups[key].push(card);
        });

        let orderedKeys = Object.keys(groups).sort();
        if (groupMode === 'Type') orderedKeys = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands', 'Other'].filter(k => groups[k]);
        if (groupMode === 'Color' || groupMode === 'Color Identity') orderedKeys = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless', 'Other'].filter(k => groups[k]);
        if (groupMode === 'Rarity') orderedKeys = ['Common', 'Uncommon', 'Rare', 'Mythic', 'Other'].filter(k => groups[k]);
        if (groupMode === 'Mana Value') orderedKeys = Object.keys(groups).sort((a,b) => parseInt(a.replace('MV ', '')) - parseInt(b.replace('MV ', '')));

        const colorIcons = { 'White': 'ms-w ms-cost', 'Blue': 'ms-u ms-cost', 'Black': 'ms-b ms-cost', 'Red': 'ms-r ms-cost', 'Green': 'ms-g ms-cost', 'Multicolor': 'ms-multicolor ms-cost', 'Colorless': 'ms-c ms-cost' };
        orderedKeys.forEach(groupName => {
            const groupCards = groups[groupName];
            const totalCards = groupCards.reduce((sum, c) => sum + c.qty, 0);
            
            let iconHtml = '';
            if (groupMode === 'Type') {
                let iconClass = typeIcons[groupName] || 'ms-dfc';
                iconHtml = `<i class="ms ${iconClass} header-type-icon" style="margin-right:6px;"></i>`;
            } else if (groupMode === 'Color' || groupMode === 'Color Identity') {
                let iconClass = colorIcons[groupName] || 'ms-dfc';
                iconHtml = `<i class="ms ${iconClass} header-type-icon" style="margin-right:6px; box-shadow: -1px 1px 0 #000; border-radius: 50%;"></i>`;
            }
            
            const col = document.createElement('div');
            col.className = 'column';
            col.innerHTML = `<h2><span>${iconHtml}${groupName.toUpperCase()} (${totalCards})</span></h2>`;
            
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

                let unitPrice = card.selectedPrice || 1.00;
                let subtotalUsd = unitPrice * card.qty;
                let subtotalMxn = subtotalUsd * currentExchangeRate;
                
                // Get set code for icon
                let setMatch = card.selectedVersionName.match(/^([A-Z0-9]+)\s+\(#([^)]+)\)/);
                let expCode = setMatch ? setMatch[1].toLowerCase() : '';
                let setIconHtml = expCode ? `<i class="ss ss-${expCode} ss-fw set-icon-span" style="font-size: 16px; margin-left: 5px; color: var(--text-muted);" title="${expCode.toUpperCase()}"></i>` : '';
                
                const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

                item.innerHTML = `
                    <div class="card-item-left">
                        <button class="remove-card-btn" data-cardname="${card.name}" title="Remove Card">${trashIcon}</button>
                        <div class="qty-controls">
                            <button type="button" class="qty-btn minus-btn">-</button>
                            <span class="qty-display">${card.qty}</span>
                            <button type="button" class="qty-btn plus-btn">+</button>
                        </div>
                        <span class="card-name" title="Tap to view image">${card.name}</span>
                        <div class="card-cost">${costHtml}</div>
                        ${setIconHtml}
                    </div>
                    <div class="card-pricing-info">
                        <div class="unit-price-badge" style="font-size: 11px; color: var(--text-muted); text-align: right; line-height: 1.2;">
                            Unit:<br>$${unitPrice.toFixed(2)}
                        </div>
                        <select class="version-select" data-cardname="${card.name}">
                            ${versionOptions}
                        </select>
                        <div class="card-price-display">
                            <span style="font-size:14px;">$${subtotalUsd.toFixed(2)}</span><br>
                            <span style="font-size:10px; opacity:0.8;">($${subtotalMxn.toFixed(2)} MXN)</span>
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
