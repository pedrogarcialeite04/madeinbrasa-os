// --- EFEITOS VISUAIS (PARTÍCULAS DE FOGO) ---
function criarParticulas() {
    const container = document.getElementById('ember-container');
    if(!container) return;
    
    // Cria 30 partículas iniciais
    for(let i=0; i<30; i++) {
        spawnParticle(container);
    }
}

function spawnParticle(container) {
    const el = document.createElement('div');
    el.classList.add('fire-particle');
    
    // Posição aleatória na largura da tela
    el.style.left = Math.random() * 100 + 'vw';
    // Tamanho aleatório
    const size = Math.random() * 10 + 5; 
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    // Duração da animação aleatória
    el.style.animationDuration = (Math.random() * 3 + 2) + 's';
    // Atraso aleatório
    el.style.animationDelay = Math.random() * 5 + 's';

    container.appendChild(el);

    // Quando terminar a animação, remove e cria outra para loop infinito
    el.addEventListener('animationend', () => {
        el.remove();
        spawnParticle(container);
    });
}

// Inicia as partículas assim que carregar
window.addEventListener('load', criarParticulas);

// --- SISTEMA ---
let db = []; 
let mode = 'income';
let deleteId = null;
let chart = null;
let weekOffset = 0;
let viewMonth = false;

// URL da API
const API_URL = '/api/transactions';

// Define a data de hoje
document.getElementById('date').valueAsDate = new Date();
setCategory('Carne', 'Carnes / Insumos');

// Inicia tela
renderizarTela(); 

// --- LOGIN ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('userInput').value;
    const p = document.getElementById('passInput').value;
    const btn = document.querySelector('#loginForm button');
    const originalText = btn.innerText;

    btn.innerText = '...';
    btn.style.opacity = '0.7';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', user: u, pass: p })
        });
        const result = await response.json();

        if (response.ok && result.authorized) {
            document.querySelector('.user-name').innerText = "MADE IN BRASA";
            iniciarSistema();
        } else {
            alert('Senha incorreta.');
            btn.innerText = originalText;
            btn.style.opacity = '1';
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão.');
        btn.innerText = originalText;
        btn.style.opacity = '1';
    }
});

function iniciarSistema() {
    const sec = document.getElementById('login-section');
    sec.style.opacity = '0';
    sec.style.transform = 'scale(1.5)';
    
    setTimeout(() => {
        sec.style.display = 'none';
        const dash = document.getElementById('dashboard-section');
        dash.style.display = 'grid'; // Grid no PC, CSS ajusta pra mobile
        renderizarTela();
        setTimeout(() => dash.style.opacity = '1', 50);
        update(); 
    }, 800);
}

// --- DADOS ---
async function update() {
    try {
        const response = await fetch(API_URL);
        db = await response.json();
        renderizarTela(); 
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

async function addTx() {
    const descInput = document.getElementById('desc');
    const valInput = document.getElementById('val');
    const catInput = document.getElementById('cat');
    const dateInput = document.getElementById('date');
    const editId = document.getElementById('editIndex').value;

    let rawVal = valInput.value;
    if(rawVal) rawVal = rawVal.replace(',', '.'); 
    const val = parseFloat(rawVal);
    const desc = descInput.value;
    const cat = catInput.value;
    const date = dateInput.value;

    if (!desc || isNaN(val) || !date || !cat) {
        alert("Preencha todos os campos!");
        return;
    }

    const payload = { desc, val, cat, date, type: mode };
    const btnText = document.getElementById('btnText');
    const originalText = btnText.innerText;

    // OPTIMISTIC UI: Adiciona na hora
    if(!editId) {
        const tempItem = { 
            id: 'temp' + Date.now(), 
            desc, val, cat, date, type: mode 
        };
        db.unshift(tempItem); 
        renderizarTela(); 
        
        descInput.value = '';
        valInput.value = '';
        descInput.focus();
    }

    btnText.innerText = '...';

    try {
        if(editId) {
            await fetch(API_URL, { method: 'PUT', body: JSON.stringify({ ...payload, id: editId }) });
            cancelEdit();
        } else {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        }
        await update(); 
    } catch (error) {
        console.error(error);
        alert('Erro de conexão ao salvar.');
    } finally {
        btnText.innerText = originalText;
    }
}

function delTx(id) { 
    deleteId = id; 
    document.getElementById('modalOverlay').style.display = 'flex'; 
}

async function confirmDelete() {
    if(deleteId) {
        // 1. Remove visualmente AGORA (sem esperar o servidor)
        db = db.filter(item => item.id !== deleteId);
        renderizarTela();
        closeModal();

        // 2. Avisa o servidor para apagar (em segundo plano)
        // NÃO chamamos update() aqui para evitar que o item "volte" antes de ser apagado lá
        try {
            await fetch(API_URL, { method: 'DELETE', body: JSON.stringify({ id: deleteId }) });
        } catch (error) {
            console.error("Erro ao excluir no servidor", error);
            // Se der erro real, aí sim recarregamos para mostrar que não apagou
            alert("Erro ao sincronizar exclusão.");
            update();
        }
    }
}

// --- UI ---
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; deleteId = null; }

function setMode(m) {
    mode = m;
    document.getElementById('btnInc').className = m==='income' ? 'switch-opt active inc' : 'switch-opt';
    document.getElementById('btnExp').className = m==='expense' ? 'switch-opt active exp' : 'switch-opt';
}

function toggleCatDropdown() {
    document.getElementById('catOptions').classList.toggle('open');
    document.getElementById('catTrigger').classList.toggle('active');
}
function setCategory(value, text) {
    document.getElementById('cat').value = value;
    document.getElementById('catText').innerText = text;
    document.getElementById('catOptions').classList.remove('open');
    document.getElementById('catTrigger').classList.remove('active');
}
window.onclick = function(event) {
    if (!event.target.closest('.custom-select-container')) {
        document.getElementById('catOptions').classList.remove('open');
        document.getElementById('catTrigger').classList.remove('active');
    }
}

function editTx(id) {
    const item = db.find(x => x.id === id);
    if(!item) return;
    document.getElementById('desc').value = item.desc;
    document.getElementById('val').value = item.val;
    document.getElementById('date').value = item.date;
    const catMap = { 'Carne': 'Carnes / Insumos', 'Bebida': 'Bebidas', 'Venda': 'Vendas', 'Fixo': 'Custo Fixo', 'Extra': 'Extra' };
    setCategory(item.cat, catMap[item.cat] || item.cat);
    document.getElementById('editIndex').value = id;
    setMode(item.type);
    document.getElementById('btnText').innerText = 'Atualizar';
    document.getElementById('btnCancel').style.display = 'flex';
}

function cancelEdit() {
    document.getElementById('editIndex').value = '';
    document.getElementById('desc').value = '';
    document.getElementById('val').value = '';
    document.getElementById('btnText').innerText = 'Lançar';
    document.getElementById('btnCancel').style.display = 'none';
    setCategory('Carne', 'Carnes / Insumos');
}

function changeWeek(n) { weekOffset += n; viewMonth = false; renderizarTela(); }
function toggleMonthView() { 
    viewMonth = !viewMonth; 
    const btn = document.querySelector('.toggle-view-btn');
    btn.innerHTML = viewMonth ? 'VER SEMANA' : 'VER MÊS'; 
    renderizarTela(); 
}

function renderizarTela() {
    const list = document.getElementById('list');
    if(!list) return;

    list.innerHTML = '';
    let inc = 0, exp = 0;
    
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
    const curWeek = getWeek(baseDate);
    const curMonth = baseDate.getMonth();
    const curYear = baseDate.getFullYear();

    const periodText = viewMonth ? 
        `MÊS ${curMonth+1}/${curYear}` : `SEMANA ${curWeek} - ${curYear}`;
    document.getElementById('periodDisplay').innerText = periodText;

    let hasItems = false;
    const sortedDb = [...db].sort((a, b) => b.id > a.id ? 1 : -1);

    if(sortedDb.length > 0) {
        sortedDb.forEach(item => {
            const parts = item.date.split('-'); 
            const itemDate = new Date(parts[0], parts[1]-1, parts[2]);
            const itemWeek = getWeek(new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()));
            
            let show = false;
            if(viewMonth) {
                if(itemDate.getMonth() === curMonth && itemDate.getFullYear() === curYear) show = true;
            } else {
                if(itemWeek === curWeek && itemDate.getFullYear() === curYear) show = true;
            }

            if(show) {
                hasItems = true;
                if(item.type === 'income') inc += item.val; else exp += item.val;
                
                const div = document.createElement('div');
                div.className = `tx-row ${item.type === 'income' ? 'inc' : 'exp'}`;
                if(String(item.id).startsWith('temp')) div.style.opacity = '0.5';

                div.innerHTML = `
                    <div>
                        <div style="font-weight:700; color:#fff;">${item.desc}</div>
                        <div style="font-size:0.8rem; color:#888;">${item.cat} • ${parts[2]}/${parts[1]}/${parts[0]}</div>
                    </div>
                    <div>
                        <span style="font-weight:700; font-size:1.1rem; color:${item.type==='income'?'#2ecc71':'#ef4444'}">
                            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.val)}
                        </span>
                        <div style="display:flex; gap:15px; margin-left:15px;">
                            <i class="fa-solid fa-pen" style="color:#666; cursor:pointer;" onclick="editTx(${item.id})"></i>
                            <i class="fa-solid fa-trash" style="color:#666; cursor:pointer;" onclick="delTx(${item.id})"></i>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            }
        });
    }

    if(!hasItems) {
        list.innerHTML = '<div style="text-align:center; color:#555; padding:20px;">Nenhum registro neste período.</div>';
    }

    document.getElementById('showInc').innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inc);
    document.getElementById('showExp').innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp);
    document.getElementById('showBal').innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inc - exp);

    const ctx = document.getElementById('myChart').getContext('2d');
    if(chart) chart.destroy();
    
    let dataValues = [inc, exp];
    let bgColors = ['#2ecc71', '#ef4444'];
    if(inc === 0 && exp === 0) { dataValues = [1]; bgColors = ['#333']; }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Entrada', 'Saída'],
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%', 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            } 
        }
    });
}

function getWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// 3D Tilt Login
const card = document.getElementById('loginCard');
document.addEventListener('mousemove', (e) => {
    if(document.getElementById('login-section').style.display === 'none') return;
    const x = (window.innerWidth / 2 - e.pageX) / 30;
    const y = (window.innerHeight / 2 - e.pageY) / 30;
    card.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
});