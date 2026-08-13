/* ==========================================================================
   UF Corporation - Autodiagnóstico IPEN Wizard Controller (diagnostic.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        currentStep: 1,
        totalSteps: 6,
        answers: {},
        leadName: '',
        leadInstitution: '',
        leadCity: '',
        leadPhone: '',
        leadRoomType: '',
        leadSituation: ''
    };

    // DOM Elements
    const steps = document.querySelectorAll('.wizard-step');
    const stepNums = document.querySelectorAll('.step-num');
    const progressFill = document.getElementById('progress-fill');
    const resultsBreakdown = document.getElementById('results-breakdown');
    const riskValueText = document.getElementById('risk-value');
    const riskTitle = document.getElementById('risk-title');
    const riskSummary = document.getElementById('risk-summary');
    const riskRingBar = document.getElementById('risk-ring-bar');
    const btnRestart = document.getElementById('btn-restart-diag');
    const btnWhatsApp = document.getElementById('btn-whatsapp-diag');
    const leadForm = document.getElementById('wizard-lead-form');

    // Questions key mapping (Steps 1 to 5)
    const questionsKeys = {
        1: 'licencia_ipen',
        2: 'dosimetria',
        3: 'control_calidad',
        4: 'blindaje_memoria',
        5: 'opr'
    };

    // Wire up option buttons for Steps 1-5
    steps.forEach(step => {
        const options = step.querySelectorAll('.btn-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = option.getAttribute('data-value');
                state.answers[questionsKeys[state.currentStep]] = value;
                nextStep();
            });
        });
    });

    // Wire up Lead Form submission (Step 6)
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Capture lead info
            state.leadName = document.getElementById('wiz-name').value;
            state.leadInstitution = document.getElementById('wiz-institution').value;
            state.leadCity = document.getElementById('wiz-city').value;
            state.leadPhone = document.getElementById('wiz-phone').value;
            
            const roomTypeSelect = document.getElementById('wiz-room-type');
            state.leadRoomType = roomTypeSelect.value;
            const roomTypeText = roomTypeSelect.options[roomTypeSelect.selectedIndex]?.text || state.leadRoomType;
            
            const situationSelect = document.getElementById('wiz-situation');
            state.leadSituation = situationSelect.value;
            const situationText = situationSelect.options[situationSelect.selectedIndex]?.text || state.leadSituation;
            
            // Build WhatsApp message
            const answersMap = {
                licencia_ipen: {
                    si: 'Sí, está vigente',
                    tramite: 'Está vencida / En trámite',
                    no: 'No, operamos sin licencia'
                },
                dosimetria: {
                    si: 'Sí, todos tienen lectura mensual',
                    incompleto: 'Solo algunos / Compartimos dosímetro',
                    no: 'No tenemos servicio de dosimetría'
                },
                control_calidad: {
                    si: 'Sí, al día',
                    vencido: 'Vencido / Más de 1 año',
                    no: 'No tenemos certificado QC'
                },
                blindaje_memoria: {
                    si: 'Sí, contamos con ella',
                    no_medida: 'Solo baritina/plomo, sin memoria firmada',
                    no: 'No sabemos / No tenemos blindaje'
                },
                opr: {
                    si: 'Sí, contratado',
                    tramite: 'En proceso de contratación',
                    no: 'No tenemos OPR'
                }
            };

            const ans1 = answersMap.licencia_ipen[state.answers.licencia_ipen] || state.answers.licencia_ipen || 'No especificado';
            const ans2 = answersMap.dosimetria[state.answers.dosimetria] || state.answers.dosimetria || 'No especificado';
            const ans3 = answersMap.control_calidad[state.answers.control_calidad] || state.answers.control_calidad || 'No especificado';
            const ans4 = answersMap.blindaje_memoria[state.answers.blindaje_memoria] || state.answers.blindaje_memoria || 'No especificado';
            const ans5 = answersMap.opr[state.answers.opr] || state.answers.opr || 'No especificado';

            const message = `Hola UF Corp, acabo de completar el Autodiagnóstico de Cumplimiento IPEN.\n\n*Datos de Contacto:*\n- Nombre: ${state.leadName}\n- Establecimiento: ${state.leadInstitution}\n- Ciudad/Provincia: ${state.leadCity}\n- Teléfono: ${state.leadPhone}\n- Tipo de Instalación: ${roomTypeText}\n- Situación: ${situationText}\n\n*Respuestas del Autodiagnóstico:*\n1. Licencia IPEN: ${ans1}\n2. Dosimetría: ${ans2}\n3. Control de Calidad QC: ${ans3}\n4. Blindaje y Memoria: ${ans4}\n5. Oficial de Protección (OPR): ${ans5}`;
            
            const whatsappUrl = `https://api.whatsapp.com/send?phone=51933666362&text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp in new window/tab
            window.open(whatsappUrl, '_blank');

            // Advance to show results
            nextStep();
        });
    }

    // Reset button handler
    if (btnRestart) {
        btnRestart.addEventListener('click', resetWizard);
    }

    function nextStep() {
        if (state.currentStep < state.totalSteps) {
            // Mark current step as completed in indicator
            const currentIndicator = document.querySelector(`.step-num:nth-child(${state.currentStep})`);
            if (currentIndicator) {
                currentIndicator.classList.remove('active');
                currentIndicator.classList.add('completed');
            }

            // Move to next step
            state.currentStep++;
            
            // Activate new step in indicator
            const nextIndicator = document.querySelector(`.step-num:nth-child(${state.currentStep})`);
            if (nextIndicator) {
                nextIndicator.classList.add('active');
            }

            // Update Progress Bar Fill
            updateProgressBar();

            // Toggle active slide
            showStep(state.currentStep);
        } else {
            // Render results
            showResults();
        }
    }

    function updateProgressBar() {
        const percent = ((state.currentStep - 1) / state.totalSteps) * 100;
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
    }

    function showStep(stepIndex) {
        steps.forEach(step => {
            step.classList.remove('active');
        });
        const activeStep = document.querySelector(`.wizard-step[data-step="${stepIndex}"]`);
        if (activeStep) {
            activeStep.classList.add('active');
        }
    }

    function resetWizard() {
        state.currentStep = 1;
        state.answers = {};
        state.leadName = '';
        state.leadInstitution = '';
        state.leadCity = '';
        state.leadPhone = '';
        state.leadRoomType = '';
        state.leadSituation = '';
        
        if (leadForm) {
            leadForm.reset();
        }
        
        // Reset indicators
        stepNums.forEach(num => {
            num.classList.remove('active', 'completed');
        });
        if (stepNums[0]) {
            stepNums[0].classList.add('active');
        }

        // Reset progress bar
        if (progressFill) {
            progressFill.style.width = '16.6%';
        }

        // Reset step content
        showStep(1);
    }

    function calculateRisk() {
        let riskScore = 0;
        
        // Question 1: Licencia IPEN (Max 30)
        if (state.answers.licencia_ipen === 'no') {
            riskScore += 30;
        } else if (state.answers.licencia_ipen === 'tramite') {
            riskScore += 15;
        }

        // Question 2: Dosimetria (Max 20)
        if (state.answers.dosimetria === 'no') {
            riskScore += 20;
        } else if (state.answers.dosimetria === 'incompleto') {
            riskScore += 10;
        }

        // Question 3: Control Calidad QC (Max 20)
        if (state.answers.control_calidad === 'no') {
            riskScore += 20;
        } else if (state.answers.control_calidad === 'vencido') {
            riskScore += 10;
        }

        // Question 4: Blindaje/Memoria (Max 15)
        if (state.answers.blindaje_memoria === 'no') {
            riskScore += 15;
        } else if (state.answers.blindaje_memoria === 'duda') {
            riskScore += 10;
        }

        // Question 5: Oficial Proteccion Radiologica OPR (Max 15)
        if (state.answers.opr === 'no' || state.answers.opr === 'encargado') {
            riskScore += 15;
        }

        return Math.min(riskScore, 100);
    }

    function showResults() {
        // Hide wizard progress, keep visual layout clean
        if (progressFill) {
            progressFill.style.width = '100%';
        }
        
        // Mark all steps as complete in UI
        stepNums.forEach(num => {
            num.classList.add('completed');
        });

        // Activate result slide (which is data-step 7)
        showStep(7);

        const risk = calculateRisk();
        animateRiskGauge(risk);

        // Analyze and display recommendations
        generateAnalysis(risk);
    }

    function animateRiskGauge(risk) {
        if (riskValueText) {
            // Animate number text
            let current = 0;
            const duration = 1000; // 1s
            const interval = 20; // 20ms
            const step = (risk / (duration / interval));

            const counter = setInterval(() => {
                current += step;
                if (current >= risk) {
                    riskValueText.textContent = `${risk}%`;
                    clearInterval(counter);
                } else {
                    riskValueText.textContent = `${Math.round(current)}%`;
                }
            }, interval);
        }

        // Animate SVG path (circumference = 2 * PI * r = 2 * 3.14159 * 50 = 314)
        if (riskRingBar) {
            const circumference = 314;
            const offset = circumference - (risk / 100) * circumference;
            riskRingBar.style.strokeDashoffset = offset;

            // Set color based on risk
            if (risk > 60) {
                riskRingBar.style.stroke = 'var(--color-critical)';
                riskTitle.className = 'risk-title text-glow-red';
            } else if (risk > 20) {
                riskRingBar.style.stroke = 'var(--color-warning)';
                riskTitle.className = 'risk-title';
                riskTitle.style.color = 'var(--color-warning)';
                riskTitle.style.textShadow = '0 0 15px var(--color-warning-glow)';
            } else {
                riskRingBar.style.stroke = 'var(--color-success)';
                riskTitle.className = 'risk-title';
                riskTitle.style.color = 'var(--color-success)';
                riskTitle.style.textShadow = '0 0 15px var(--color-success-glow)';
            }
        }
    }

    function generateAnalysis(risk) {
        let title = '';
        let summary = '';
        let breakdownHTML = '';
        let whatsappProblems = [];

        // Main headers
        if (risk > 60) {
            title = 'Riesgo Crítico de Clausura';
            summary = 'Su establecimiento opera con faltas normativas de alta gravedad. Una inspección del IPEN o DIRIS resultará en la paralización inmediata de sus servicios y multas administrativas severas.';
        } else if (risk > 20) {
            title = 'Riesgo Preventivo / Observaciones';
            summary = 'Cuenta con cierta infraestructura, pero carece de documentación oficial actualizada (Memoria de cálculo, control de calidad QC o dosimetría integral) para renovar u obtener su licencia sin rebotes.';
        } else {
            title = 'Cumplimiento Óptimo y Seguro';
            summary = 'Felicidades. Su instalación cumple con la mayoría de lineamientos radiológicos de la norma IR.001.2026. Mantenga sus controles vigentes.';
        }

        if (riskTitle) riskTitle.textContent = title;
        if (riskSummary) riskSummary.textContent = summary;

        // Breakdown detailed cards
        // 1. Licencia IPEN
        if (state.answers.licencia_ipen === 'no') {
            whatsappProblems.push('Operación sin licencia IPEN');
            breakdownHTML += `
                <div class="breakdown-card critical-alert">
                    <div class="alert-indicator-dot critical"></div>
                    <div>
                        <h4>Urgente: Operación sin Licencia IPEN</h4>
                        <p>Es ilegal emitir radiación sin licencia. IPEN clausura de inmediato. UF Corp elabora su expediente completo, realiza el levantamiento físico y gestiona el trámite llave en mano ante IPEN/DIRIS.</p>
                    </div>
                </div>
            `;
        } else if (state.answers.licencia_ipen === 'tramite') {
            whatsappProblems.push('Licencia IPEN en trámite/vencida');
            breakdownHTML += `
                <div class="breakdown-card warning-alert">
                    <div class="alert-indicator-dot warning"></div>
                    <div>
                        <h4>Alerta: Licencia Vencida o en Trámite</h4>
                        <p>Los inspectores ya no aceptan el cargo de "en trámite" si su licencia venció. UF Corp acelera la revisión y subsana cualquier observación para evitar multas de DIRIS.</p>
                    </div>
                </div>
            `;
        }

        // 2. Dosimetria
        if (state.answers.dosimetria === 'no') {
            whatsappProblems.push('Sin dosimetría de personal');
            breakdownHTML += `
                <div class="breakdown-card critical-alert">
                    <div class="alert-indicator-dot critical"></div>
                    <div>
                        <h4>Urgente: Personal sin Dosímetros</h4>
                        <p>Pone en riesgo penal al director por salud ocupacional. Implementamos su dosimetría personal acreditada con lectura mensual inmediata y envío a todo el Perú.</p>
                    </div>
                </div>
            `;
        } else if (state.answers.dosimetria === 'incompleto') {
            whatsappProblems.push('Dosimetría incompleta o compartida');
            breakdownHTML += `
                <div class="breakdown-card warning-alert">
                    <div class="alert-indicator-dot warning"></div>
                    <div>
                        <h4>Alerta: Registro Dosimétrico Incompleto</h4>
                        <p>Compartir dosímetros es una infracción grave. Cada tecnólogo/odontólogo debe contar con su propio dosímetro nominal. Regularice su personal.</p>
                    </div>
                </div>
            `;
        }

        // 3. Control de Calidad QC
        if (state.answers.control_calidad === 'no') {
            whatsappProblems.push('Sin control de calidad QC de equipos');
            breakdownHTML += `
                <div class="breakdown-card critical-alert">
                    <div class="alert-indicator-dot critical"></div>
                    <div>
                        <h4>Urgente: Sin Control de Calidad de Rayos X/Tomógrafo</h4>
                        <p>El IPEN exige certificado QC emitido por empresa acreditada para dar la licencia. Programamos una inspección de control de calidad bajo la nueva norma.</p>
                    </div>
                </div>
            `;
        } else if (state.answers.control_calidad === 'vencido') {
            whatsappProblems.push('Control de calidad QC vencido');
            breakdownHTML += `
                <div class="breakdown-card warning-alert">
                    <div class="alert-indicator-dot warning"></div>
                    <div>
                        <h4>Alerta: Control de Calidad Vencido</h4>
                        <p>El control QC tiene vigencia de un año. Debe renovarse de inmediato para evitar que suspendan su licencia individual u operativa.</p>
                    </div>
                </div>
            `;
        }

        // 4. Blindaje
        if (state.answers.blindaje_memoria === 'no') {
            whatsappProblems.push('Falta blindaje o blindaje dañado');
            breakdownHTML += `
                <div class="breakdown-card critical-alert">
                    <div class="alert-indicator-dot critical"></div>
                    <div>
                        <h4>Urgente: Sin Blindaje Técnico</h4>
                        <p>Riesgo alto de irradiación a pasillos o consultorios anexos. Realizamos el cálculo de blindaje y cotizamos baritina de alta densidad o planchas de plomo.</p>
                    </div>
                </div>
            `;
        } else if (state.answers.blindaje_memoria === 'duda') {
            whatsappProblems.push('Instalación sin Memoria de Cálculo certificada');
            breakdownHTML += `
                <div class="breakdown-card warning-alert">
                    <div class="alert-indicator-dot warning"></div>
                    <div>
                        <h4>Alerta: Blindaje sin Firma de Físico Médico</h4>
                        <p>Aunque tenga baritina, si no tiene Memoria de Cálculo firmada por Físico Médico colegiado, el IPEN rechazará su expediente. Regularice su cálculo.</p>
                    </div>
                </div>
            `;
        }

        // 5. OPR
        if (state.answers.opr === 'no' || state.answers.opr === 'encargado') {
            whatsappProblems.push('Falta de OPR formal o licencia individual');
            breakdownHTML += `
                <div class="breakdown-card warning-alert">
                    <div class="alert-indicator-dot warning"></div>
                    <div>
                        <h4>Alerta: Oficial de Protección Radiológica no Regularizado</h4>
                        <p>Se exige un OPR con licencia individual IPEN y resolución interna. Ofrecemos asesoría externa fraccionada o capacitación para que su tecnólogo obtenga su licencia.</p>
                    </div>
                </div>
            `;
        }

        // If no problems, show clean compliance
        if (breakdownHTML === '') {
            breakdownHTML = `
                <div class="breakdown-card success-alert">
                    <div class="alert-indicator-dot success"></div>
                    <div>
                        <h4>Cumplimiento Correcto</h4>
                        <p>Su centro cuenta con las bases sólidas de protección radiológica. Si requiere mantenimiento, dosimetría continua o auditorías de control de calidad anuales, UF Corporation está a su servicio.</p>
                    </div>
                </div>
            `;
        }

        resultsBreakdown.innerHTML = breakdownHTML;

        // Customise WhatsApp Link
        const name = state.leadName || 'Interesado';
        const institution = state.leadInstitution || 'Establecimiento';
        const city = state.leadCity || 'Sin especificar';
        const phone = state.leadPhone || '';
        const roomType = state.leadRoomType || 'Sin especificar';
        const situation = state.leadSituation || 'Sin especificar';

        let message = `Hola UF Corporation, he realizado el Autodiagnóstico IPEN en su web.\n\n`;
        message += `*DATOS DE LA INSTALACIÓN:*\n`;
        message += `- *Contacto:* ${name}\n`;
        message += `- *Establecimiento:* ${institution}\n`;
        message += `- *Ciudad:* ${city}\n`;
        message += `- *Teléfono:* ${phone}\n`;
        message += `- *Tipo de Sala:* ${roomType}\n`;
        message += `- *Situación Actual:* ${situation}\n\n`;
        message += `*Nivel de Riesgo:* ${risk}%\n`;
        if (whatsappProblems.length > 0) {
            message += `*Problemas Detectados:*\n`;
            whatsappProblems.forEach(p => {
                message += `- ${p}\n`;
            });
            message += `\nSolicito asesoría y cotización para regularizar mi instalación bajo la nueva norma IR.001.2026.`;
        } else {
            message += `Cumplimos las normativas pero deseamos cotizar servicios de control de calidad/dosimetría continua.`;
        }

        const encodedMessage = encodeURIComponent(message);
        if (btnWhatsApp) {
            btnWhatsApp.href = `https://wa.me/51933666362?text=${encodedMessage}`;
        }
    }
});
