/* ==========================================================================
   UF Corporation - Global Web Interactivity (main.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            navMenu.classList.toggle('open');
        });

        // Close menu when clicking links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('open');
                navMenu.classList.remove('open');
            });
        });
    }

    // 2. Active Navigation Highlight on Scroll
    const sections = document.querySelectorAll('section');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // 3. Product Catalog Tab Switcher
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to current
            btn.classList.add('active');
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    // 4. Product Quote Actions
    const quoteBtns = document.querySelectorAll('.btn-quote');
    quoteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productName = btn.getAttribute('data-product');
            const contactService = document.getElementById('contact-service');
            const contactMessage = document.getElementById('contact-message');

            // Map product name to matching dropdown value
            if (contactService) {
                if (productName.includes('Baritina')) {
                    contactService.value = 'blindaje_baritina';
                } else if (productName.includes('Plomo') && !productName.includes('Mandil')) {
                    contactService.value = 'blindaje_plomo';
                } else if (productName.includes('Vidrio')) {
                    contactService.value = 'blindaje_plomo';
                } else if (productName.includes('Mandil') || productName.includes('EPP') || productName.includes('Lentes') || productName.includes('Tiroides')) {
                    contactService.value = 'epp_plomado';
                }
            }

            // Prefill message details
            if (contactMessage) {
                contactMessage.value = `Hola UF Corporation, deseo solicitar una cotización formal e información técnica para el producto: *${productName}*. \n\nFavor de indicarme disponibilidad de stock, tiempos de entrega y especificaciones de protección bajo la norma IPEN.`;
            }
        });
    });

    // 5. Contact Form Submission WhatsApp Trigger
    const contactForm = document.getElementById('main-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Extract values
            const name = document.getElementById('contact-name').value;
            const institution = document.getElementById('contact-institution').value;
            const email = document.getElementById('contact-email').value;
            const phone = document.getElementById('contact-phone').value;
            const city = document.getElementById('contact-city').value;
            const roomTypeSelect = document.getElementById('contact-room-type');
            const roomTypeText = roomTypeSelect.options[roomTypeSelect.selectedIndex].text;
            const serviceSelect = document.getElementById('contact-service');
            const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
            const message = document.getElementById('contact-message').value;

            // Structure WhatsApp message
            let waText = `*NUEVO LEAD - UF CORPORATION*\n\n`;
            waText += `*Nombre:* ${name}\n`;
            waText += `*Establecimiento:* ${institution}\n`;
            waText += `*Email:* ${email}\n`;
            waText += `*Teléfono:* ${phone}\n`;
            waText += `*Ciudad:* ${city}\n`;
            waText += `*Tipo de Instalación:* ${roomTypeText}\n`;
            waText += `*Servicio de Interés:* ${serviceText}\n\n`;
            waText += `*Detalles del Proyecto:*\n${message}`;

            const encodedWaText = encodeURIComponent(waText);
            const waNumber = '51987654321'; // UF Corporation sales phone

            // Redirect to WhatsApp web/app
            window.open(`https://wa.me/${waNumber}?text=${encodedWaText}`, '_blank');
        });
    }

    // 6. Lead Magnet Form Submission
    const leadMagnetForm = document.getElementById('lead-magnet-form');
    const lmFormWrapper = document.getElementById('lead-magnet-form-wrapper');
    if (leadMagnetForm && lmFormWrapper) {
        leadMagnetForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Extract values
            const name = document.getElementById('lm-name').value;
            const email = document.getElementById('lm-email').value;
            const phone = document.getElementById('lm-phone').value;

            // Trigger simulated download (could be replaced with a real file link)
            const downloadUrl = '#'; // e.g. '/assets/Kit_Cumplimiento_IPEN_2026_UF.pdf'
            
            // Replace form contents with success message
            lmFormWrapper.innerHTML = `
                <div class="lead-magnet-success">
                    <div class="success-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="36" height="36">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                        </svg>
                    </div>
                    <h3>¡Suscripción Exitosa!</h3>
                    <p>Hola <strong>${name}</strong>, hemos registrado tus datos. El Kit de Cumplimiento IPEN IR.001.2026 ha sido enviado a <strong>${email}</strong>.</p>
                    <a href="${downloadUrl}" class="btn btn-primary btn-glow btn-full btn-evaluar-color btn-evaluar-glow" id="btn-download-pdf-direct">
                        Descargar PDF Directo
                    </a>
                </div>
            `;

            // Optional: simulate direct browser download click
            const btnDirectDownload = document.getElementById('btn-download-pdf-direct');
            if (btnDirectDownload) {
                btnDirectDownload.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    alert('Se ha iniciado la descarga simulada del archivo: Kit_Cumplimiento_IPEN_2026_UF.pdf');
                });
            }
        });
    }
});
