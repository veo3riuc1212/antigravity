// --- ESTADO INICIAL Y CONFIGURACIÓN ---
let state = {
    settings: {
        currency: 'PEN',
        formatDecimal: 'comma',
        googleDrive: {
            clientId: '',
            apiKey: '',
            accessToken: '',
            isConnected: false
        }
    },
    categories: {
        income: ['Ventas', 'Sueldo', 'Servicios', 'Intereses', 'Otros Ingresos'],
        expense: ['Alimentación', 'Transporte', 'Alquiler', 'Servicios Básicos', 'Suscripciones', 'Entretenimiento', 'Inversiones', 'Otros Gastos']
    },
    accounts: [
        { id: 'acc-1', name: 'Efectivo / Caja', type: 'efectivo', currency: 'PEN', initialBalance: 100.00, minAlert: 20.00 },
        { id: 'acc-2', name: 'Cuenta Bancaria (BCP)', type: 'banco', currency: 'PEN', initialBalance: 1500.00, minAlert: 200.00 },
        { id: 'acc-3', name: 'Yape / Plin BCP', type: 'billetera', currency: 'PEN', initialBalance: 250.00, minAlert: 50.00 }
    ],
    transactions: [],
    transfers: [],
    budgets: {} // Formato: { "YYYY-MM": { "Categoría": monto_limite, ... } }
};

// Paleta de Colores para Categorías y Gráficos
const CHART_COLORS = [
    '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#84cc16'
];

// --- FUNCIONES DE PERSISTENCIA Y CARGA ---
function loadState() {
    const savedState = localStorage.getItem('finanzly_data');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            // Asegurar que existan las claves básicas
            state = { ...state, ...parsed };
        } catch (e) {
            console.error("Error al cargar los datos desde LocalStorage", e);
        }
    } else {
        // Cargar algunos datos demo si está vacío para mejor UX
        seedDemoData();
    }
}

function saveState() {
    localStorage.setItem('finanzly_data', JSON.stringify(state));
    showToast("Cambios guardados en LocalStorage");
    
    // Si Drive está conectado, intentar sincronizar en segundo plano
    if (state.settings.googleDrive.isConnected && state.settings.googleDrive.accessToken) {
        syncWithGoogleDrive(false);
    }
}

function seedDemoData() {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
    
    // Fechas de este mes
    const d1 = new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0];
    const d2 = new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0];
    const d3 = new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split('T')[0];
    const d4 = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];

    state.transactions = [
        { id: 't-1', type: 'income', amount: 3500.00, date: d1, category: 'Sueldo', accountId: 'acc-2', description: 'Pago de planilla mensual', method: 'transferencia', reference: 'PLN-9023', tags: ['mensual'] },
        { id: 't-2', type: 'expense', amount: 150.00, date: d2, category: 'Alimentación', accountId: 'acc-3', description: 'Compras en supermercado', method: 'billetera', reference: '', tags: ['comida'] },
        { id: 't-3', type: 'expense', amount: 80.00, date: d3, category: 'Servicios Básicos', accountId: 'acc-2', description: 'Recibo de luz del mes', method: 'transferencia', reference: 'LUZ-2026', tags: ['servicios', 'fijo'] },
        { id: 't-4', type: 'expense', amount: 50.00, date: d4, category: 'Suscripciones', accountId: 'acc-2', description: 'Membresía Netflix', method: 'tarjeta', reference: '', tags: ['entretenimiento'] }
    ];

    state.budgets[currentMonthStr] = {
        'Alimentación': 600.00,
        'Servicios Básicos': 200.00,
        'Suscripciones': 100.00
    };
    
    localStorage.setItem('finanzly_data', JSON.stringify(state));
}

// --- UTILERÍAS ---
function generateUUID() {
    return 'u-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

function formatCurrency(amount, currencyCode) {
    const code = currencyCode || state.settings.currency || 'PEN';
    let symbol = 'S/. ';
    if (code === 'USD') symbol = '$ ';
    if (code === 'EUR') symbol = '€ ';
    
    // Formato regional en español (decimales con punto o coma según configuración)
    const formatted = parseFloat(amount).toFixed(2);
    if (state.settings.formatDecimal === 'comma') {
        return symbol + formatted.replace('.', ',');
    }
    return symbol + formatted;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// --- LOGICA DE NAVEGACION ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-' + targetTab).classList.add('active');

        // Actualizar título de la página
        updatePageHeader(targetTab);
        
        // Renderizar pestaña seleccionada
        renderTab(targetTab);
    });
});

function updatePageHeader(tab) {
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    
    if (tab === 'dashboard') {
        title.textContent = 'Resumen General';
        subtitle.textContent = 'Vista rápida de tu estado financiero';
    } else if (tab === 'movements') {
        title.textContent = 'Movimientos';
        subtitle.textContent = 'Ingresos, gastos y transferencias registradas';
    } else if (tab === 'accounts') {
        title.textContent = 'Cuentas y Saldos';
        subtitle.textContent = 'Administra tus cuentas bancarias y efectivo';
    } else if (tab === 'budgets') {
        title.textContent = 'Presupuesto Mensual';
        subtitle.textContent = 'Fija objetivos de gastos y monitorea el progreso';
    } else if (tab === 'reports') {
        title.textContent = 'Reportes y Ajustes';
        subtitle.textContent = 'Exporta datos e integra servicios externos';
    }
}

// --- CÁLCULO DE SALDOS EN TIEMPO REAL ---
function calculateAccountBalances() {
    const balances = {};
    
    // Inicializar con balances iniciales
    state.accounts.forEach(acc => {
        balances[acc.id] = parseFloat(acc.initialBalance);
    });

    // Sumar/Restar transacciones normales
    state.transactions.forEach(t => {
        if (!balances.hasOwnProperty(t.accountId)) {
            balances[t.accountId] = 0; // Por si se borró la cuenta de la config pero tiene transacciones
        }
        
        const amt = parseFloat(t.amount);
        if (t.type === 'income') {
            balances[t.accountId] += amt;
        } else if (t.type === 'expense') {
            balances[t.accountId] -= amt;
        }
    });

    // Sumar/Restar transferencias directas entre cuentas
    state.transfers.forEach(tf => {
        if (balances.hasOwnProperty(tf.fromAccountId)) {
            balances[tf.fromAccountId] -= parseFloat(tf.amount);
        }
        if (balances.hasOwnProperty(tf.toAccountId)) {
            balances[tf.toAccountId] += parseFloat(tf.amount);
        }
    });

    return balances;
}

// --- RENDERIZADO DE PESTAÑAS ---
function renderTab(tab) {
    const balances = calculateAccountBalances();
    
    if (tab === 'dashboard') {
        renderDashboard(balances);
    } else if (tab === 'movements') {
        renderMovements(balances);
    } else if (tab === 'accounts') {
        renderAccounts(balances);
    } else if (tab === 'budgets') {
        renderBudgets();
    } else if (tab === 'reports') {
        renderReports();
    }
}

// --- RENDER DASHBOARD ---
function renderDashboard(balances) {
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM
    
    // Filtrar transacciones del mes
    const currentMonthTrans = state.transactions.filter(t => t.date.substring(0, 7) === currentMonth);
    
    let totalIncome = 0;
    let totalExpense = 0;

    currentMonthTrans.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'expense') totalExpense += t.amount;
    });

    // Saldo total acumulado de todas las cuentas en la moneda base
    let totalBalance = 0;
    state.accounts.forEach(acc => {
        // En un escenario real con múltiples monedas haríamos la conversión aquí.
        // Asumimos conversión 1:1 para simplificar o mostramos saldo en base.
        totalBalance += balances[acc.id] || 0;
    });

    document.getElementById('dash-total-balance').textContent = formatCurrency(totalBalance);
    document.getElementById('dash-total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('dash-total-expenses').textContent = formatCurrency(totalExpense);
    
    const netResult = totalIncome - totalExpense;
    const resultEl = document.getElementById('dash-net-result');
    resultEl.textContent = formatCurrency(netResult);
    if (netResult >= 0) {
        resultEl.className = 'metric-value text-success';
    } else {
        resultEl.className = 'metric-value text-danger';
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthLabel = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    document.getElementById('dash-income-desc').textContent = monthLabel;
    document.getElementById('dash-expenses-desc').textContent = monthLabel;
    document.getElementById('dash-result-desc').textContent = monthLabel;

    // Alertas
    renderDashboardAlerts(balances, currentMonth);

    // Gráficos
    renderHistoryChart();
    renderCategoriesChart(currentMonthTrans);

    // Recientes transacciones
    const recentTBody = document.getElementById('dash-recent-transactions');
    recentTBody.innerHTML = '';
    const sorted = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (sorted.length === 0) {
        recentTBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay movimientos registrados.</td></tr>';
    } else {
        sorted.forEach(t => {
            const acc = state.accounts.find(a => a.id === t.accountId);
            const accName = acc ? acc.name : 'Desconocida';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.date}</td>
                <td><span class="badge badge-${t.type}">${t.category}</span></td>
                <td>${accName}</td>
                <td>${t.description}</td>
                <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
            `;
            recentTBody.appendChild(row);
        });
    }

    // Resumen de cuentas
    const accListEl = document.getElementById('dash-accounts-list');
    accListEl.innerHTML = '';
    state.accounts.slice(0, 4).forEach(acc => {
        const item = document.createElement('div');
        item.className = 'account-summary-item';
        item.innerHTML = `
            <div class="acc-summary-info">
                <span class="acc-summary-name">${acc.name}</span>
                <span class="acc-summary-type">${acc.type}</span>
            </div>
            <span class="acc-summary-balance ${balances[acc.id] < (acc.minAlert || 0) ? 'text-danger' : ''}">
                ${formatCurrency(balances[acc.id] || 0, acc.currency)}
            </span>
        `;
        accListEl.appendChild(item);
    });
}

function renderDashboardAlerts(balances, currentMonth) {
    const alertsList = document.getElementById('alerts-list');
    const alertsContainer = document.getElementById('dashboard-alerts');
    alertsList.innerHTML = '';
    let alertsCount = 0;

    // 1. Alerta de Saldo Bajo
    state.accounts.forEach(acc => {
        const bal = balances[acc.id] || 0;
        if (acc.minAlert && bal < parseFloat(acc.minAlert)) {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item warning';
            alertItem.innerHTML = `⚠️ La cuenta <strong>${acc.name}</strong> tiene saldo de ${formatCurrency(bal, acc.currency)}, debajo del umbral de ${formatCurrency(acc.minAlert, acc.currency)}.`;
            alertsList.appendChild(alertItem);
            alertsCount++;
        }
    });

    // 2. Alerta de Presupuesto Excedido
    const budgetMonth = state.budgets[currentMonth];
    if (budgetMonth) {
        // Calcular gastos reales del mes por categoría
        const expensesByCategory = {};
        state.transactions
            .filter(t => t.type === 'expense' && t.date.substring(0, 7) === currentMonth)
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            });

        for (const [cat, limit] of Object.entries(budgetMonth)) {
            const spent = expensesByCategory[cat] || 0;
            if (spent > limit) {
                const alertItem = document.createElement('div');
                alertItem.className = 'alert-item';
                alertItem.innerHTML = `🚨 Has superado el presupuesto para la categoría <strong>${cat}</strong>. Presupuestado: ${formatCurrency(limit)}, Gastado: ${formatCurrency(spent)}.`;
                alertsList.appendChild(alertItem);
                alertsCount++;
            }
        }
    }

    if (alertsCount > 0) {
        alertsContainer.classList.remove('hidden');
    } else {
        alertsContainer.classList.add('hidden');
    }
}

// --- RENDER MOVIMIENTOS ---
let currentSort = { column: 'date', direction: 'desc' };

function renderMovements() {
    const tbody = document.getElementById('movements-list');
    const emptyEl = document.getElementById('movements-empty');
    tbody.innerHTML = '';

    // Filtrar transacciones
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const typeVal = document.getElementById('filter-type').value;
    const catVal = document.getElementById('filter-category').value;
    const accVal = document.getElementById('filter-account').value;
    const dateStartVal = document.getElementById('filter-date-start').value;
    const dateEndVal = document.getElementById('filter-date-end').value;

    let filtered = state.transactions.filter(t => {
        // Buscador de texto
        const matchSearch = !searchVal || 
            t.description.toLowerCase().includes(searchVal) || 
            t.category.toLowerCase().includes(searchVal) || 
            (t.reference && t.reference.toLowerCase().includes(searchVal)) || 
            t.tags.some(tag => tag.toLowerCase().includes(searchVal));
        
        // Filtro tipo
        const matchType = typeVal === 'all' || t.type === typeVal;
        
        // Filtro categoria
        const matchCat = catVal === 'all' || t.category === catVal;
        
        // Filtro cuenta
        const matchAcc = accVal === 'all' || t.accountId === accVal;
        
        // Filtro fechas
        const matchDateStart = !dateStartVal || t.date >= dateStartVal;
        const matchDateEnd = !dateEndVal || t.date <= dateEndVal;

        return matchSearch && matchType && matchCat && matchAcc && matchDateStart && matchDateEnd;
    });

    // Ordenar transacciones
    filtered.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        
        if (currentSort.column === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (currentSort.column === 'amount') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Popular filtros select
    populateFiltersDropdowns();

    if (filtered.length === 0) {
        emptyEl.classList.remove('hidden');
    } else {
        emptyEl.classList.add('hidden');
        filtered.forEach(t => {
            const acc = state.accounts.find(a => a.id === t.accountId);
            const accName = acc ? acc.name : 'Desconocida';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.date}</td>
                <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'Ingreso' : 'Gasto'}</span></td>
                <td><strong>${t.category}</strong></td>
                <td>${accName}</td>
                <td>
                    <div>${t.description}</div>
                    ${t.reference ? `<small class="text-muted">Ref: ${t.reference}</small>` : ''}
                    ${t.tags.length > 0 ? t.tags.map(tag => `<span class="badge badge-transfer" style="margin-left: 2px;">#${tag}</span>`).join('') : ''}
                </td>
                <td><span class="text-muted text-sm" style="text-transform: capitalize;">${t.method || 'otro'}</span></td>
                <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}" style="font-weight: 600;">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary mr-2 btn-edit-trans" data-id="${t.id}">✏️</button>
                    <button class="btn btn-sm btn-outline-secondary mr-2 btn-duplicate-trans" data-id="${t.id}">📋</button>
                    <button class="btn btn-sm btn-danger btn-delete-trans" data-id="${t.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Registrar Eventos de acciones
        document.querySelectorAll('.btn-edit-trans').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                openTransactionModal(b.getAttribute('data-id'));
            });
        });
        document.querySelectorAll('.btn-duplicate-trans').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                duplicateTransaction(b.getAttribute('data-id'));
            });
        });
        document.querySelectorAll('.btn-delete-trans').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTransaction(b.getAttribute('data-id'));
            });
        });
    }
}

function populateFiltersDropdowns() {
    const catSelect = document.getElementById('filter-category');
    const accSelect = document.getElementById('filter-account');
    
    const prevCat = catSelect.value;
    const prevAcc = accSelect.value;

    catSelect.innerHTML = '<option value="all">Todas las Categorías</option>';
    state.categories.income.concat(state.categories.expense).forEach(cat => {
        catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    accSelect.innerHTML = '<option value="all">Todas las Cuentas</option>';
    state.accounts.forEach(acc => {
        accSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`;
    });

    catSelect.value = prevCat;
    accSelect.value = prevAcc;
}

// Configurar Ordenación de Columnas
document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.column === col) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = col;
            currentSort.direction = 'asc';
        }
        renderMovements();
    });
});

// --- ACCIONES DE TRANSACCIONES ---
function openTransactionModal(id = null) {
    const modal = document.getElementById('modal-transaction');
    const form = document.getElementById('form-transaction');
    const titleEl = document.getElementById('modal-title');
    const idInput = document.getElementById('trans-id');

    // Popular inputs dinámicos de categorías y cuentas
    populateModalDropdowns();

    if (id) {
        titleEl.textContent = 'Editar Movimiento';
        const t = state.transactions.find(item => item.id === id);
        if (t) {
            idInput.value = t.id;
            document.getElementById('trans-type').value = t.type;
            document.getElementById('trans-amount').value = t.amount;
            document.getElementById('trans-date').value = t.date;
            document.getElementById('trans-category').value = t.category;
            document.getElementById('trans-account').value = t.accountId;
            document.getElementById('trans-method').value = t.method || 'otro';
            document.getElementById('trans-desc').value = t.description;
            document.getElementById('trans-reference').value = t.reference || '';
            document.getElementById('trans-tags').value = t.tags ? t.tags.join(', ') : '';
        }
    } else {
        titleEl.textContent = 'Registrar Movimiento';
        form.reset();
        idInput.value = '';
        document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.remove('hidden');
}

function populateModalDropdowns() {
    const typeSelect = document.getElementById('trans-type');
    const catSelect = document.getElementById('trans-category');
    const accSelect = document.getElementById('trans-account');
    
    function updateCats() {
        const type = typeSelect.value;
        catSelect.innerHTML = '';
        state.categories[type].forEach(cat => {
            catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    typeSelect.onchange = updateCats;
    
    accSelect.innerHTML = '';
    state.accounts.forEach(acc => {
        accSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.currency})</option>`;
    });

    updateCats();
}

document.getElementById('form-transaction').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('trans-id').value;
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const date = document.getElementById('trans-date').value;
    const category = document.getElementById('trans-category').value;
    const accountId = document.getElementById('trans-account').value;
    const method = document.getElementById('trans-method').value;
    const description = document.getElementById('trans-desc').value;
    const reference = document.getElementById('trans-reference').value;
    const tagsStr = document.getElementById('trans-tags').value;
    
    const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(t => t !== '') : [];

    const transactionData = {
        id: id || generateUUID(),
        type,
        amount,
        date,
        category,
        accountId,
        method,
        description,
        reference,
        tags,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        // Editar existente
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            state.transactions[index] = transactionData;
            showToast("Movimiento actualizado");
        }
    } else {
        // Crear nuevo
        transactionData.createdAt = new Date().toISOString();
        state.transactions.push(transactionData);
        showToast("Movimiento agregado");
    }

    document.getElementById('modal-transaction').classList.add('hidden');
    saveState();
    renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
});

function duplicateTransaction(id) {
    const source = state.transactions.find(t => t.id === id);
    if (source) {
        const copy = {
            ...source,
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0], // Forzar fecha de hoy al duplicar
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.transactions.push(copy);
        showToast("Movimiento duplicado");
        saveState();
        renderTab('movements');
    }
}

function deleteTransaction(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        showToast("Movimiento eliminado");
        saveState();
        renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
    }
}

// --- TAB: CUENTAS Y SALDOS ---
function renderAccounts(balances) {
    const accountsContainer = document.getElementById('accounts-cards-container');
    const fromSelect = document.getElementById('transfer-from');
    const toSelect = document.getElementById('transfer-to');
    
    accountsContainer.innerHTML = '';
    
    // Rellenar selectores de transferencia
    fromSelect.innerHTML = '<option value="">Selecciona origen</option>';
    toSelect.innerHTML = '<option value="">Selecciona destino</option>';

    state.accounts.forEach(acc => {
        const bal = balances[acc.id] || 0;
        const isLow = acc.minAlert && bal < parseFloat(acc.minAlert);
        
        // Tarjeta de Cuenta
        const card = document.createElement('div');
        card.className = `account-card-item ${isLow ? 'border-danger' : ''}`;
        card.innerHTML = `
            <div class="account-card-header">
                <div class="account-card-title">
                    <h4>${acc.name}</h4>
                    <span class="account-card-currency">Tipo: ${acc.type} | Moneda: ${acc.currency}</span>
                </div>
                <div class="account-card-actions">
                    <button class="btn btn-sm btn-outline-primary btn-edit-account" data-id="${acc.id}">✏️</button>
                    <button class="btn btn-sm btn-danger btn-delete-account" data-id="${acc.id}">🗑️</button>
                </div>
            </div>
            <div class="account-card-balance ${isLow ? 'text-danger' : ''}">
                ${formatCurrency(bal, acc.currency)}
            </div>
            <div class="account-card-meta">
                <span>Saldo Inicial: ${formatCurrency(acc.initialBalance, acc.currency)}</span>
                ${acc.minAlert ? `<span>Límite Mín: ${formatCurrency(acc.minAlert, acc.currency)}</span>` : '<span>Sin umbral</span>'}
            </div>
        `;
        accountsContainer.appendChild(card);

        // Opciones del selector de transferencia
        fromSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${formatCurrency(bal, acc.currency)})</option>`;
        toSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.currency})</option>`;
    });

    // Eventos
    document.querySelectorAll('.btn-edit-account').forEach(b => {
        b.addEventListener('click', () => {
            const accId = b.getAttribute('data-id');
            const acc = state.accounts.find(a => a.id === accId);
            if (acc) {
                document.getElementById('account-id').value = acc.id;
                document.getElementById('account-name').value = acc.name;
                document.getElementById('account-type').value = acc.type;
                document.getElementById('account-currency').value = acc.currency;
                document.getElementById('account-initial-balance').value = acc.initialBalance;
                document.getElementById('account-min-alert').value = acc.minAlert || '';
                
                document.getElementById('btn-save-account').textContent = 'Actualizar Cuenta';
                document.getElementById('btn-cancel-account').classList.remove('hidden');
            }
        });
    });

    document.querySelectorAll('.btn-delete-account').forEach(b => {
        b.addEventListener('click', () => {
            const accId = b.getAttribute('data-id');
            // Validar que la cuenta no tenga movimientos asociados
            const hasMovements = state.transactions.some(t => t.accountId === accId) ||
                                 state.transfers.some(tf => tf.fromAccountId === accId || tf.toAccountId === accId);
            
            if (hasMovements) {
                alert("No se puede eliminar esta cuenta porque tiene transacciones o transferencias asociadas. Reasígnalas primero.");
                return;
            }

            if (confirm("¿Estás seguro de que deseas eliminar esta cuenta?")) {
                state.accounts = state.accounts.filter(a => a.id !== accId);
                showToast("Cuenta eliminada");
                saveState();
                renderTab('accounts');
            }
        });
    });
}

// Cancelar edición de cuenta
document.getElementById('btn-cancel-account').addEventListener('click', () => {
    document.getElementById('form-account').reset();
    document.getElementById('account-id').value = '';
    document.getElementById('btn-save-account').textContent = 'Guardar Cuenta';
    document.getElementById('btn-cancel-account').classList.add('hidden');
});

// Guardar/Actualizar Cuenta
document.getElementById('form-account').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('account-id').value;
    const name = document.getElementById('account-name').value;
    const type = document.getElementById('account-type').value;
    const currency = document.getElementById('account-currency').value;
    const initialBalance = parseFloat(document.getElementById('account-initial-balance').value);
    const minAlertVal = document.getElementById('account-min-alert').value;
    const minAlert = minAlertVal ? parseFloat(minAlertVal) : null;

    if (id) {
        // Modificar
        const index = state.accounts.findIndex(a => a.id === id);
        if (index !== -1) {
            state.accounts[index] = { ...state.accounts[index], name, type, currency, initialBalance, minAlert };
            showToast("Cuenta actualizada");
        }
    } else {
        // Crear nueva
        state.accounts.push({
            id: generateUUID(),
            name, type, currency, initialBalance, minAlert
        });
        showToast("Cuenta creada");
    }

    document.getElementById('form-account').reset();
    document.getElementById('account-id').value = '';
    document.getElementById('btn-save-account').textContent = 'Guardar Cuenta';
    document.getElementById('btn-cancel-account').classList.add('hidden');

    saveState();
    renderTab('accounts');
});

// Registrar Transferencia entre Cuentas
document.getElementById('form-transfer').addEventListener('submit', (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transfer-from').value;
    const toId = document.getElementById('transfer-to').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const date = document.getElementById('transfer-date').value;
    const note = document.getElementById('transfer-note').value;

    if (fromId === toId) {
        alert("Las cuentas de origen y destino deben ser diferentes.");
        return;
    }

    const transfer = {
        id: generateUUID(),
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        date,
        note,
        createdAt: new Date().toISOString()
    };

    state.transfers.push(transfer);
    showToast("Transferencia registrada con éxito");
    document.getElementById('form-transfer').reset();
    document.getElementById('transfer-date').value = new Date().toISOString().split('T')[0];
    
    saveState();
    renderTab('accounts');
});

// --- TAB: PRESUPUESTO MENSUAL ---
function renderBudgets() {
    const monthSelect = document.getElementById('budget-month-select');
    if (!monthSelect.value) {
        monthSelect.value = new Date().toISOString().substring(0, 7);
    }
    const currentMonth = monthSelect.value;
    
    // Categorías de Gasto en el selector de ajustes
    const catSelect = document.getElementById('budget-category');
    catSelect.innerHTML = '';
    state.categories.expense.forEach(cat => {
        catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // Calcular gastos reales del mes seleccionado por categoría
    const expensesByCategory = {};
    state.transactions
        .filter(t => t.type === 'expense' && t.date.substring(0, 7) === currentMonth)
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    const progressList = document.getElementById('budget-progress-list');
    progressList.innerHTML = '';

    // Obtener presupuesto configurado para este mes
    const budgetMonth = state.budgets[currentMonth] || {};

    // Mostrar todas las categorías de gastos
    state.categories.expense.forEach(cat => {
        const spent = expensesByCategory[cat] || 0.00;
        const limit = budgetMonth[cat] || 0.00;
        
        let percent = limit > 0 ? (spent / limit) * 100 : 0;
        let barClass = 'normal';
        if (limit > 0) {
            if (percent > 100) barClass = 'danger';
            else if (percent > 80) barClass = 'warning';
        }

        const item = document.createElement('div');
        item.className = 'budget-progress-item';
        item.innerHTML = `
            <div class="budget-progress-label">
                <span>${cat}</span>
                <span class="budget-progress-numbers">
                    ${formatCurrency(spent)} / 
                    <span class="${limit === 0 ? 'text-muted' : ''}">${limit > 0 ? formatCurrency(limit) : 'Sin límite'}</span>
                </span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(percent, 100)}%"></div>
            </div>
        `;
        progressList.appendChild(item);
    });
}

// Escuchar cambios de mes en presupuestos
document.getElementById('budget-month-select').addEventListener('change', renderBudgets);

// Guardar límite presupuestario
document.getElementById('form-budget').addEventListener('submit', (e) => {
    e.preventDefault();
    const month = document.getElementById('budget-month-select').value;
    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);

    if (!state.budgets[month]) {
        state.budgets[month] = {};
    }

    state.budgets[month][category] = amount;
    showToast("Presupuesto guardado");
    document.getElementById('budget-amount').value = '';
    
    saveState();
    renderBudgets();
});

// Crear nueva categoría personalizada
document.getElementById('form-new-category').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('new-cat-type').value;
    const name = document.getElementById('new-cat-name').value.trim();

    if (!name) return;

    if (state.categories[type].includes(name)) {
        alert("La categoría ya existe.");
        return;
    }

    state.categories[type].push(name);
    showToast(`Categoría "${name}" agregada`);
    document.getElementById('new-cat-name').value = '';
    
    saveState();
    renderBudgets();
});

// Calcular Presupuesto Requerido / Sugerido
document.getElementById('btn-calc-required-budget').addEventListener('click', () => {
    const month = document.getElementById('budget-month-select').value;
    
    // Para calcular el presupuesto sugerido, tomamos el gasto promedio de los últimos 3 meses
    // O si no hay data histórica, sugerimos 1.2 veces el gasto de este mes como holgura básica.
    const uniqueMonths = [...new Set(state.transactions.map(t => t.date.substring(0, 7)))].sort();
    
    if (!state.budgets[month]) {
        state.budgets[month] = {};
    }

    // Calcular consumo del mes activo
    const currentMonthExpenses = {};
    state.transactions
        .filter(t => t.type === 'expense' && t.date.substring(0, 7) === month)
        .forEach(t => {
            currentMonthExpenses[t.category] = (currentMonthExpenses[t.category] || 0) + t.amount;
        });

    state.categories.expense.forEach(cat => {
        const spentThisMonth = currentMonthExpenses[cat] || 0;
        
        // Sacar promedio histórico excluyendo este mes
        let totalHistoricalSpent = 0;
        let countHistoricalMonths = 0;
        
        uniqueMonths.forEach(m => {
            if (m !== month) {
                const monthSpent = state.transactions
                    .filter(t => t.type === 'expense' && t.category === cat && t.date.substring(0, 7) === m)
                    .reduce((sum, t) => sum + t.amount, 0);
                if (monthSpent > 0) {
                    totalHistoricalSpent += monthSpent;
                    countHistoricalMonths++;
                }
            }
        });

        let recommended = 0;
        if (countHistoricalMonths > 0) {
            // Promedio + 10% de margen de seguridad
            recommended = (totalHistoricalSpent / countHistoricalMonths) * 1.1;
        } else {
            // 1.2x del gasto de este mes
            recommended = spentThisMonth * 1.2 || 100.00; // Valor default de $100 si no hay ningún gasto
        }

        state.budgets[month][cat] = parseFloat(recommended.toFixed(2));
    });

    showToast("Presupuesto requerido calculado y ajustado");
    saveState();
    renderBudgets();
});

// Copiar resumen de presupuesto
document.getElementById('btn-copy-budget-summary').addEventListener('click', () => {
    const month = document.getElementById('budget-month-select').value;
    const budgetMonth = state.budgets[month] || {};
    
    // Gastos del mes
    const expensesByCategory = {};
    state.transactions
        .filter(t => t.type === 'expense' && t.date.substring(0, 7) === month)
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    let text = `📋 RESUMEN DE PRESUPUESTO - MES: ${month}\n`;
    text += `=========================================\n`;

    state.categories.expense.forEach(cat => {
        const spent = expensesByCategory[cat] || 0;
        const limit = budgetMonth[cat] || 0;
        const status = limit > 0 ? (spent > limit ? '🚨 EXCEDIDO' : '✅ OK') : 'ℹ️ Sin Límite';
        text += `- ${cat}: ${formatCurrency(spent)} / ${limit > 0 ? formatCurrency(limit) : 'Sin Límite'} [${status}]\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        showToast("Resumen copiado al portapapeles");
    });
});

// --- TAB: REPORTES & DATOS ---
function renderReports() {
    // Cargar credenciales del estado
    document.getElementById('drive-client-id').value = state.settings.googleDrive.clientId || '';
    document.getElementById('drive-api-key').value = state.settings.googleDrive.apiKey || '';
    
    if (state.settings.googleDrive.isConnected) {
        document.getElementById('btn-drive-connect').textContent = '🔄 Re-sincronizar';
        document.getElementById('btn-drive-disconnect').classList.remove('hidden');
        document.querySelector('.status-indicator').className = 'status-indicator online';
        document.querySelector('.status-text').textContent = 'Sincronizado con Google Drive';
    } else {
        document.getElementById('btn-drive-connect').textContent = 'Conectar y Sincronizar';
        document.getElementById('btn-drive-disconnect').classList.add('hidden');
        document.querySelector('.status-indicator').className = 'status-indicator offline';
        document.querySelector('.status-text').textContent = 'Modo Local (Autoguardado)';
    }

    if (!document.getElementById('report-month-select').value) {
        document.getElementById('report-month-select').value = new Date().toISOString().substring(0, 7);
    }
}

// Generar Reporte de Texto Compartible
document.getElementById('btn-generate-text-report').addEventListener('click', () => {
    const month = document.getElementById('report-month-select').value;
    
    const monthlyTrans = state.transactions.filter(t => t.date.substring(0, 7) === month);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const catExpenses = {};
    const methodPayments = {};

    monthlyTrans.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
            catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
            methodPayments[t.method || 'otro'] = (methodPayments[t.method || 'otro'] || 0) + t.amount;
        }
    });

    let report = `📊 INFORME FINANCIERO MENSUAL: ${month}\n`;
    report += `=========================================\n`;
    report += `📈 Ingresos Totales:   ${formatCurrency(totalIncome)}\n`;
    report += `📉 Gastos Totales:     ${formatCurrency(totalExpense)}\n`;
    report += `⚖️ Resultado del Mes:   ${formatCurrency(totalIncome - totalExpense)}\n\n`;

    report += `Distribución de Gastos por Categoría:\n`;
    report += `-----------------------------------------\n`;
    const sortedCats = Object.entries(catExpenses).sort((a,b) => b[1] - a[1]);
    if (sortedCats.length === 0) {
        report += `(Sin gastos registrados este mes)\n`;
    } else {
        sortedCats.forEach(([cat, amt]) => {
            const pct = ((amt / totalExpense) * 100).toFixed(1);
            report += `- ${cat.padEnd(20)}: ${formatCurrency(amt)} (${pct}%)\n`;
        });
    }

    report += `\nMétodos de Pago Utilizados (Gastos):\n`;
    report += `-----------------------------------------\n`;
    Object.entries(methodPayments).forEach(([method, amt]) => {
        report += `- ${method.padEnd(20)}: ${formatCurrency(amt)}\n`;
    });

    document.getElementById('text-report-output').value = report;
});

// Copiar Reporte de Texto
document.getElementById('btn-copy-text-report').addEventListener('click', () => {
    const output = document.getElementById('text-report-output').value;
    if (!output) {
        alert("Primero genera el reporte mensual.");
        return;
    }

    navigator.clipboard.writeText(output).then(() => {
        showToast("Reporte mensual copiado");
    });
});

// --- IMPORTAR & EXPORTAR ---
document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `finanzly_db_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    showToast("Base de datos exportada en JSON");
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Fecha,Tipo,Monto,Categoria,Cuenta,Metodo,Descripcion,Referencia,Tags\n";

    state.transactions.forEach(t => {
        const acc = state.accounts.find(a => a.id === t.accountId);
        const accName = acc ? acc.name : 'Desconocida';
        const tags = t.tags ? t.tags.join(';') : '';
        const row = [
            t.id,
            t.date,
            t.type,
            t.amount,
            t.category,
            `"${accName}"`,
            t.method || 'otro',
            `"${t.description.replace(/"/g, '""')}"`,
            `"${(t.reference || '').replace(/"/g, '""')}"`,
            `"${tags}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", encodedUri);
    dlAnchorElem.setAttribute("download", `movimientos_finanzly_${new Date().toISOString().split('T')[0]}.csv`);
    dlAnchorElem.click();
    showToast("CSV de movimientos descargado");
});

document.getElementById('btn-import-data').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file-input');
    const strategy = document.getElementById('import-strategy').value;

    if (fileInput.files.length === 0) {
        alert("Por favor selecciona un archivo JSON para importar.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validar estructura básica
            if (!importedData.transactions || !importedData.accounts) {
                alert("Estructura de JSON inválida. Debe contener cuentas y transacciones.");
                return;
            }

            if (strategy === 'overwrite') {
                if (confirm("Esta acción reemplazará toda tu información local. ¿Deseas continuar?")) {
                    state = importedData;
                    saveState();
                    renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
                    alert("Importación exitosa. Se ha sobrescrito la base de datos.");
                }
            } else {
                // Fusionar (Merge) evitando duplicados por ID
                let addedTransactions = 0;
                let addedAccounts = 0;

                // Cuentas
                importedData.accounts.forEach(impAcc => {
                    if (!state.accounts.some(acc => acc.id === impAcc.id)) {
                        state.accounts.push(impAcc);
                        addedAccounts++;
                    }
                });

                // Transacciones
                importedData.transactions.forEach(impTrans => {
                    if (!state.transactions.some(t => t.id === impTrans.id)) {
                        state.transactions.push(impTrans);
                        addedTransactions++;
                    }
                });

                // Transferencias
                if (importedData.transfers) {
                    importedData.transfers.forEach(impTf => {
                        if (!state.transfers.some(tf => tf.id === impTf.id)) {
                            state.transfers.push(impTf);
                        }
                    });
                }

                // Presupuestos
                if (importedData.budgets) {
                    for (const [month, categories] of Object.entries(importedData.budgets)) {
                        if (!state.budgets[month]) {
                            state.budgets[month] = {};
                        }
                        state.budgets[month] = { ...state.budgets[month], ...categories };
                    }
                }

                saveState();
                renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
                alert(`Fusión completada con éxito. Cuentas nuevas: ${addedAccounts}, Transacciones nuevas: ${addedTransactions}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error al parsear el archivo JSON.");
        }
    };

    reader.readAsText(file);
});

// --- GOOGLE DRIVE SYNC (CLIENT SIDE IMPLEMENTATION) ---
let tokenClient;

function initGoogleDriveAuth() {
    const clientId = state.settings.googleDrive.clientId;
    if (!clientId) return;

    try {
        // Inicializar Google Identity Services Token Client
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    state.settings.googleDrive.accessToken = tokenResponse.access_token;
                    state.settings.googleDrive.isConnected = true;
                    saveState();
                    showToast("Google Drive conectado correctamente");
                    
                    // Ejecutar primera sincronización
                    syncWithGoogleDrive(true);
                }
            },
        });
    } catch (e) {
        console.error("Error inicializando cliente GIS de Google", e);
    }
}

// Guardar configuración de Drive e intentar conexión
document.getElementById('btn-drive-connect').addEventListener('click', () => {
    const clientId = document.getElementById('drive-client-id').value.trim();
    const apiKey = document.getElementById('drive-api-key').value.trim();

    if (!clientId) {
        alert("Por favor ingresa tu Google Client ID para poder sincronizar.");
        return;
    }

    state.settings.googleDrive.clientId = clientId;
    state.settings.googleDrive.apiKey = apiKey;
    saveState();

    initGoogleDriveAuth();

    // Solicitar token de acceso (Google Popup)
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        alert("Librería de Google no cargada. Revisa tu conexión a internet.");
    }
});

document.getElementById('btn-drive-disconnect').addEventListener('click', () => {
    if (confirm("¿Desconectar sincronización con Google Drive?")) {
        state.settings.googleDrive.isConnected = false;
        state.settings.googleDrive.accessToken = '';
        saveState();
        renderTab('reports');
        showToast("Google Drive desconectado");
    }
});

document.getElementById('btn-drive-sync').addEventListener('click', () => {
    if (!state.settings.googleDrive.isConnected) {
        // Redirigir a reportes/configuración
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const reportsBtn = document.querySelector('.nav-btn[data-tab="reports"]');
        reportsBtn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-reports').classList.add('active');
        updatePageHeader('reports');
        renderReports();
        alert("Configura tu Client ID en esta pestaña primero.");
        return;
    }
    syncWithGoogleDrive(true);
});

// Sincronizar archivo mi_app_finanzas.json en Google Drive
async function syncWithGoogleDrive(showSuccessAlert = false) {
    const token = state.settings.googleDrive.accessToken;
    if (!token) return;

    const btnSync = document.getElementById('btn-drive-sync');
    btnSync.disabled = true;
    btnSync.textContent = '⏳ Sincronizando...';

    try {
        // 1. Buscar si el archivo 'mi_app_finanzas.json' existe
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='mi_app_finanzas.json' and trashed=false&fields=files(id, name, modifiedTime)`;
        const searchResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (searchResponse.status === 401) {
            // Token expirado, solicitar uno nuevo silenciosamente o pedir login
            state.settings.googleDrive.isConnected = false;
            saveState();
            renderReports();
            btnSync.disabled = false;
            btnSync.innerHTML = '☁️ Sincronizar Drive';
            alert("La sesión de Google expiró. Por favor reconecta en Reportes.");
            return;
        }

        const searchData = await searchResponse.json();
        const files = searchData.files || [];

        if (files.length > 0) {
            // El archivo ya existe en Drive, hay que descargarlo y fusionarlo
            const fileId = files[0].id;
            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            
            const downloadResponse = await fetch(downloadUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const driveData = await downloadResponse.json();
            
            // Fusión inteligente para evitar duplicados
            let hasNewChanges = false;

            // Combinar transacciones
            driveData.transactions.forEach(driveT => {
                if (!state.transactions.some(localT => localT.id === driveT.id)) {
                    state.transactions.push(driveT);
                    hasNewChanges = true;
                }
            });

            // Combinar cuentas
            driveData.accounts.forEach(driveAcc => {
                if (!state.accounts.some(localAcc => localAcc.id === driveAcc.id)) {
                    state.accounts.push(driveAcc);
                    hasNewChanges = true;
                }
            });

            // Combinar transferencias
            if (driveData.transfers) {
                driveData.transfers.forEach(driveTf => {
                    if (!state.transfers.some(localTf => localTf.id === driveTf.id)) {
                        state.transfers.push(driveTf);
                        hasNewChanges = true;
                    }
                });
            }

            // Combinar presupuestos
            if (driveData.budgets) {
                for (const [month, categories] of Object.entries(driveData.budgets)) {
                    if (!state.budgets[month]) {
                        state.budgets[month] = {};
                        hasNewChanges = true;
                    }
                    for (const [cat, val] of Object.entries(categories)) {
                        if (state.budgets[month][cat] !== val) {
                            state.budgets[month][cat] = val;
                            hasNewChanges = true;
                        }
                    }
                }
            }

            // Subir de nuevo la versión fusionada final a Drive
            await uploadFileToGoogleDrive(fileId, token);
            
            if (hasNewChanges) {
                localStorage.setItem('finanzly_data', JSON.stringify(state));
                renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
            }
            
            if (showSuccessAlert) {
                showToast("Sincronización finalizada con éxito");
            }
        } else {
            // El archivo no existe, crearlo
            await createFileInGoogleDrive(token);
            if (showSuccessAlert) {
                showToast("Archivo creado en Drive y datos subidos");
            }
        }
        
        // Actualizar visualizaciones
        document.querySelector('.status-indicator').className = 'status-indicator online';
        document.querySelector('.status-text').textContent = 'Sincronizado con Google Drive';
    } catch (err) {
        console.error("Error en sincronización", err);
        showToast("Error al sincronizar con Google Drive");
    } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = '☁️ Sincronizar Drive';
    }
}

async function createFileInGoogleDrive(token) {
    const metadata = {
        name: 'mi_app_finanzas.json',
        mimeType: 'application/json'
    };

    const fileContent = JSON.stringify(state);
    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
    });
}

async function uploadFileToGoogleDrive(fileId, token) {
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
    });
}

// --- DIBUJO DE GRÁFICOS PERSONALIZADOS (CANVAS SIN LIBRERÍAS) ---

function renderCategoriesChart(monthTransactions) {
    const canvas = document.getElementById('chart-categories');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Calcular distribución
    const expenseTrans = monthTransactions.filter(t => t.type === 'expense');
    const catAmounts = {};
    let totalExpenses = 0;

    expenseTrans.forEach(t => {
        catAmounts[t.category] = (catAmounts[t.category] || 0) + t.amount;
        totalExpenses += t.amount;
    });

    ctx.clearRect(0, 0, width, height);

    if (totalExpenses === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Sin gastos este mes', width / 2, height / 2);
        return;
    }

    const sortedCats = Object.entries(catAmounts).sort((a,b) => b[1] - a[1]);
    
    // Dibujar dona (Pie Chart vacío en el centro)
    const centerX = width * 0.35;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.75;
    
    let startAngle = 0;
    
    sortedCats.forEach(([cat, amt], index) => {
        const sliceAngle = (amt / totalExpenses) * 2 * Math.PI;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = color;
        ctx.fill();
        
        startAngle += sliceAngle;
    });

    // Círculo del centro para efecto dona
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937'; // Igual que el fondo de la tarjeta
    ctx.fill();

    // Dibujar Leyenda
    const legendX = width * 0.65;
    let legendY = centerY - (sortedCats.length * 18) / 2 + 10;
    ctx.textAlign = 'left';
    ctx.font = '11px Inter';

    sortedCats.slice(0, 7).forEach(([cat, amt], index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length];
        const pct = ((amt / totalExpenses) * 100).toFixed(0);
        
        // Cuadro de color
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY - 8, 10, 10);
        
        // Texto
        ctx.fillStyle = '#f3f4f6';
        ctx.fillText(`${cat} (${pct}%)`, legendX + 15, legendY);
        
        legendY += 18;
    });
}

function renderHistoryChart() {
    const canvas = document.getElementById('chart-history');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Obtener los últimos 6 meses cronológicos
    const monthData = {};
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = d.toISOString().substring(0, 7);
        monthData[monthKey] = { label: d.toLocaleString('es-ES', { month: 'short' }), income: 0, expense: 0 };
    }

    // Agregar transacciones
    state.transactions.forEach(t => {
        const monthKey = t.date.substring(0, 7);
        if (monthData.hasOwnProperty(monthKey)) {
            if (t.type === 'income') {
                monthData[monthKey].income += t.amount;
            } else if (t.type === 'expense') {
                monthData[monthKey].expense += t.amount;
            }
        }
    });

    const months = Object.values(monthData);
    
    // Encontrar máximo valor
    let maxVal = 1000;
    months.forEach(m => {
        if (m.income > maxVal) maxVal = m.income;
        if (m.expense > maxVal) maxVal = m.expense;
    });
    // Redondear el máximo para escalas más limpias
    maxVal = Math.ceil(maxVal / 500) * 500;

    // Márgenes
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 25;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Dibujar Líneas Guía de Fondo (Y-axis grid)
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';

    const linesCount = 4;
    for (let i = 0; i <= linesCount; i++) {
        const val = (maxVal / linesCount) * i;
        const y = paddingTop + chartHeight - (chartHeight / linesCount) * i;
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        
        ctx.fillText(val >= 1000 ? (val/1000) + 'k' : val, paddingLeft - 8, y + 3);
    }

    // Dibujar Barras
    const colWidth = chartWidth / months.length;
    const barWidth = colWidth * 0.3;
    
    months.forEach((m, index) => {
        const xCenter = paddingLeft + (colWidth * index) + (colWidth / 2);
        
        // Calcular alturas
        const incHeight = (m.income / maxVal) * chartHeight;
        const expHeight = (m.expense / maxVal) * chartHeight;
        
        const yBase = paddingTop + chartHeight;

        // Barra Ingreso (Verde)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(xCenter - barWidth - 2, yBase - incHeight, barWidth, incHeight);

        // Barra Gasto (Rojo)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(xCenter + 2, yBase - expHeight, barWidth, expHeight);

        // Etiqueta del Mes
        ctx.fillStyle = '#f3f4f6';
        ctx.textAlign = 'center';
        ctx.font = '10px Inter';
        ctx.fillText(m.label.toUpperCase(), xCenter, yBase + 15);
    });

    // Leyenda superior derecha
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.fillRect(width - 120, 8, 8, 8);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillText('Ingresos', width - 75, 15);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 60, 8, 8, 8);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillText('Gastos', width - 15, 15);
}

// --- ACCIONES GENERALES ---
// Abrir modal rápida
document.getElementById('btn-quick-transaction').addEventListener('click', () => {
    openTransactionModal();
});

// Cerrar modales
document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('modal-transaction').classList.add('hidden');
});
document.getElementById('btn-cancel-modal').addEventListener('click', () => {
    document.getElementById('modal-transaction').classList.add('hidden');
});

// Selector de moneda global
document.getElementById('global-currency').addEventListener('change', (e) => {
    state.settings.currency = e.target.value;
    saveState();
    renderTab(document.querySelector('.nav-btn.active').getAttribute('data-tab'));
});

// Limpieza de filtros
document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-account').value = 'all';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    renderMovements();
});

// Escuchar filtros en tiempo real
document.getElementById('search-input').addEventListener('input', renderMovements);
document.getElementById('filter-type').addEventListener('change', renderMovements);
document.getElementById('filter-category').addEventListener('change', renderMovements);
document.getElementById('filter-account').addEventListener('change', renderMovements);
document.getElementById('filter-date-start').addEventListener('change', renderMovements);
document.getElementById('filter-date-end').addEventListener('change', renderMovements);

// Inicializar la aplicación al cargar
window.addEventListener('load', () => {
    loadState();
    
    // Setear selectors
    document.getElementById('global-currency').value = state.settings.currency || 'PEN';
    document.getElementById('budget-month-select').value = new Date().toISOString().substring(0, 7);
    document.getElementById('report-month-select').value = new Date().toISOString().substring(0, 7);
    document.getElementById('transfer-date').value = new Date().toISOString().split('T')[0];

    // Intentar inicializar Google Drive Auth si hay Client ID
    initGoogleDriveAuth();

    // Render por defecto
    renderTab('dashboard');
});
