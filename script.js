// --- EFEITOS VISUAIS (PARTÍCULAS) ---
function criarParticulas() {
    const container = document.getElementById('ember-container');
    if(!container) return;
    
    // Limpa anteriores se houver
    container.innerHTML = '';
    
    for(let i=0; i<30; i++) spawnParticle(container);
}

function spawnParticle(container) {
    const el = document.createElement('div');
    el.classList.add('fire-particle');
    el.style.left = Math.random() * 100 + 'vw';
    const size = Math.random() * 10 + 5; 
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.animationDuration = (Math.random() * 3 + 2) + 's';
    el.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(el);
    el.addEventListener('animationend', () => {
        el.remove();
        spawnParticle(container);
    });
}
window.addEventListener('load', criarParticulas);

// --- SISTEMA ---
let db = []; 
let mode = 'income';
let deleteId = null;
let chart = null;
let weekOffset = 0;
let viewMonth = false;

// URL da API (Na Vercel, o arquivo api/transactions.js vira essa rota)
const API_URL = '/api/transactions';

document.getElementById('date').valueAsDate = new Date();
setCategory('Carne', 'Carnes / Insumos');

// Inicia
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
            headers: { 'Content-Type': 'application/json' }, 
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
        alert('Erro de conexão. Verifique a internet.');
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
        dash.style.display = 'grid'; 
        renderizarTela();
        setTimeout(() => dash.style.opacity = '1', 50);
        update(); 
    }, 800);
}

// --- DADOS ---
async function update() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            db = data;
        } else {
            db = [];
            console.error("Erro: Servidor não retornou uma lista", data);
        }
        renderizarTela(); 
    } catch (error) {
        console.error("Erro ao carregar:", error);
        // Não limpamos o DB aqui para não perder dados se for só falha de internet
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
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const payload = { desc, val, cat, date, type: mode };
    const btnText = document.getElementById('btnText');
    const originalText = btnText.innerText;

    // --- OPTIMISTIC UI (Atualiza a tela ANTES do servidor) ---
    if (!Array.isArray(db)) db = [];

    // Se NÃO for edição, adiciona visualmente na hora
    if(!editId) {
        const tempItem = { 
            id: 'temp' + Date.now(), 
            desc, val, cat, date, type: mode 
        };
        db.unshift(tempItem); 
        renderizarTela(); 
        
        // Limpa campos
        descInput.value = '';
        valInput.value = '';
        descInput.focus();
    }
    // ---------------------------------------------------------

    btnText.innerText = '...';

    try {
        const method = editId ? 'PUT' : 'POST';
        // Se for edição, precisamos enviar o ID junto
        const bodyData = editId ? { ...payload, id: editId } : payload;

        const response = await fetch(API_URL, { 
            method: method, 
            headers: { 'Content-Type': 'application/json' }, // OBRIGATÓRIO PARA VERCEL
            body: JSON.stringify(bodyData) 
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro no servidor');
        }

        if(editId) cancelEdit();
        await update(); // Sincroniza ID real do banco
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar: ' + error.message);
        // Se der erro, recarrega para remover o item falso da tela
        update(); 
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
        // Remove visualmente
        if (Array.isArray(db)) {
            db = db.filter(item => item.id !== deleteId);
        }
        renderizarTela();
        closeModal();

        try {
            await fetch(API_URL, { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deleteId }) 
            });
            // Opcional: update() para garantir sincronia, mas visualmente já sumiu
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir.");
            update(); // Traz de volta se deu erro
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
    // O input date precisa de YYYY-MM-DD
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
    
    // Volta a data para hoje
    document.getElementById('date').valueAsDate = new Date();
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
    const safeDb = Array.isArray(db) ? db : [];
    
    // Ordena por ID decrescente
    const sortedDb = [...safeDb].sort((a, b) => b.id > a.id ? 1 : -1);

    if(sortedDb.length > 0) {
        sortedDb.forEach(item => {
            // === PROTEÇÃO CONTRA CRASH (O "Conserto" do Erro Split) ===
            if (!item.date || typeof item.date !== 'string') {
                return; // Se o item não tiver data válida, ignora ele e não trava o site
            }

            const parts = item.date.split('-'); 
            // Garante que a data tem 3 partes (Ano-Mes-Dia)
            if(parts.length < 3) return;

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

    // === GRÁFICO CORRIGIDO (R$ no Tooltip) ===
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
                                // Formata para R$ 1.250,00 dentro do gráfico
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