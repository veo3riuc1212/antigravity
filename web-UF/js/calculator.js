/* ==========================================================================
   UF Corporation - Shielding Sizing Calculator Controller (calculator.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const roomTypeSelect = document.getElementById('calc-room-type');
    const areaRange = document.getElementById('calc-area');
    const areaValDisplay = document.getElementById('calc-area-val');
    const thicknessSelect = document.getElementById('calc-thickness-baritina');
    
    const resLeadEquiv = document.getElementById('res-lead-equiv');
    const resBariteBags = document.getElementById('res-barite-bags');
    const resBariteNote = document.getElementById('res-barite-note');
    const resLeadSheets = document.getElementById('res-lead-sheets');
    const btnQuoteCalc = document.getElementById('btn-quote-calc');

    // Sizing Parameters
    const BARITE_KG_PER_M2_PER_CM = 22; // 22kg of baritina per m² per cm of thickness
    const BAG_WEIGHT_KG = 25; // standard bag weight
    const LEAD_SHEET_AREA = 2.0; // standard lead sheet dimension (2.0m x 1.0m)
    const WASTE_FACTOR = 1.05; // 5% waste/overlap margin

    // Initialization
    if (areaRange && areaValDisplay) {
        areaRange.addEventListener('input', () => {
            areaValDisplay.textContent = `${areaRange.value} m²`;
            calculateShielding();
        });
    }

    if (roomTypeSelect) {
        roomTypeSelect.addEventListener('change', calculateShielding);
    }

    if (thicknessSelect) {
        thicknessSelect.addEventListener('change', calculateShielding);
    }

    if (btnQuoteCalc) {
        btnQuoteCalc.addEventListener('click', (e) => {
            e.preventDefault();
            fillContactFormFromCalc();
        });
    }

    // Run calculation once on load
    calculateShielding();

    function calculateShielding() {
        if (!roomTypeSelect || !areaRange || !thicknessSelect) return;

        const selectedOption = roomTypeSelect.options[roomTypeSelect.selectedIndex];
        const leadThickness = parseFloat(selectedOption.getAttribute('data-pb'));
        const area = parseFloat(areaRange.value);
        const bariteThickness = parseFloat(thicknessSelect.value);

        // 1. Output Lead Equivalence
        if (resLeadEquiv) {
            resLeadEquiv.textContent = `${leadThickness.toFixed(1)} mm Pb`;
        }

        // 2. Output Baritina UF bags
        // Formula: Sacks = Ceil( (Area * Thickness * 22 * WasteFactor) / 25 )
        const bariteBagsCalculated = Math.ceil((area * bariteThickness * BARITE_KG_PER_M2_PER_CM * WASTE_FACTOR) / BAG_WEIGHT_KG);
        if (resBariteBags) {
            resBariteBags.textContent = bariteBagsCalculated;
        }
        if (resBariteNote) {
            resBariteNote.textContent = `Tarrajeado a ${bariteThickness.toFixed(1)} cm de espesor.`;
        }

        // 3. Output Lead Sheets count
        // Formula: Sheets = Ceil( (Area * WasteFactor) / SheetArea )
        const leadSheetsCalculated = Math.ceil((area * WASTE_FACTOR) / LEAD_SHEET_AREA);
        if (resLeadSheets) {
            resLeadSheets.textContent = leadSheetsCalculated;
        }
    }

    function fillContactFormFromCalc() {
        const roomType = roomTypeSelect.options[roomTypeSelect.selectedIndex].text;
        const area = areaRange.value;
        const bariteBags = resBariteBags.textContent;
        const leadSheets = resLeadSheets.textContent;
        const leadThickness = resLeadEquiv.textContent;

        const contactService = document.getElementById('contact-service');
        const contactMessage = document.getElementById('contact-message');

        // Automatically select the most relevant service in dropdown
        if (contactService) {
            if (leadSheets > 0) {
                contactService.value = 'blindaje_plomo';
            } else {
                contactService.value = 'blindaje_baritina';
            }
        }

        // Pre-fill details in message
        if (contactMessage) {
            contactMessage.value = `Hola, he utilizado la calculadora de blindaje preliminar en su web. \n\n` +
                                   `Requiero cotizar el blindaje para una sala de: \n` +
                                   `- Tipo de Sala: ${roomType}\n` +
                                   `- Área total a blindar: ${area} m²\n\n` +
                                   `El estimador indica que se requieren aproximadamente:\n` +
                                   `- Opción A (Baritina): ${bariteBags} sacos de Baritina UF.\n` +
                                   `- Opción B (Planchas de Plomo): ${leadSheets} planchas de plomo (${leadThickness}).\n\n` +
                                   `Por favor, envíenme una cotización formal y los detalles para la Memoria de Cálculo firmada por su Físico Médico.`;
        }

        // Scroll smoothly to contact section
        const contactSection = document.getElementById('contacto');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
});
