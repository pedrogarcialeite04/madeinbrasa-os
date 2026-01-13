// ... (Mantenha o código das partículas de fogo aqui em cima igual estava) ...

// --- SISTEMA CONECTADO AO BACKEND ---
let db = []; 
let mode = 'income';
let deleteId = null;
let chart = null;
let weekOffset = 0;
let viewMonth = false;

// URL da API
const API_URL = '/api/transactions';

// Define a data de hoje no input assim que abre
document.getElementById('date').valueAsDate = new Date();
setCategory('Carne', 'Carnes / Insumos');

// Inicia a tela com a data de hoje para não ficar "Carregando..."
renderizarTela(); 

/// --- LOGIN SEGURO (VIA BACKEND) ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('userInput').value;
    const p = document.getElementById('passInput').value;
    const btn = document.querySelector('#loginForm button');
    const originalText = btn.innerText;

    // Feedback visual para o cliente saber que está processando
    btn.innerText = 'VERIFICANDO...';
    btn.style.opacity = '0.7';

    try {
        // Envia para o servidor checar
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'login', 
                user: u, 
                pass: p 
            })
        });

        const result = await response.json();

        if (response.ok && result.authorized) {
            // SUCESSO
            document.querySelector('.user-name').innerText = "MADE IN BRASA";
            iniciarSistema();
        } else {
            // ERRO
            alert('ACESSO NEGADO: Credenciais inválidas.');
            btn.innerText = originalText;
            btn.style.opacity = '1';
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro de conexão. Tente novamente.');
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
        
        // Garante que a data apareça certa imediatamente
        renderizarTela();
        
        setTimeout(() => dash.style.opacity = '1', 50);
        update(); // Busca os dados do banco
    }, 800);
}

// --- FUNÇÕES DE API ---
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

    // 1. Tratamento de valor: Troca vírgula por ponto para o sistema entender
    let rawVal = valInput.value;
    if(rawVal) rawVal = rawVal.replace(',', '.'); 
    
    const val = parseFloat(rawVal);
    const desc = descInput.value;
    const cat = catInput.value;
    const date = dateInput.value;

    // 2. Validação com Feedback Visual
    if (!desc || isNaN(val) || !date || !cat) {
        alert("Preencha todos os campos corretamente!\nO valor deve ser numérico.");
        return;
    }

    const payload = { desc, val, cat, date, type: mode };
    
    // Feedback visual no botão
    const btnSave = document.getElementById('btnSave');
    const btnText = document.getElementById('btnText');
    const originalText = btnText.innerText;
    
    btnText.innerText = 'Salvando...';
    btnSave.disabled = true; // Evita duplo clique

    try {
        let response;
        if (editId) {
            response = await fetch(API_URL, { 
                method: 'PUT', 
                body: JSON.stringify({ ...payload, id: editId }) 
            });
            cancelEdit();
        } else {
            response = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });
        }

        if (response.ok) {
            // Limpa o formulário apenas se deu certo
            if (!editId) {
                descInput.value = '';
                valInput.value = '';
                // Mantém a categoria e data para facilitar múltiplos lançamentos
            }
            await update(); // Atualiza a lista
        } else {
            const err = await response.json();
            alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
        }

    } catch (error) {
        console.error(error);
        alert('Erro de conexão. Verifique sua internet.');
    } finally {
        // Restaura o botão
        btnText.innerText = originalText;
        btnSave.disabled = false;
    }
}

function delTx(id) { deleteId = id; document.getElementById('modalOverlay').style.display = 'flex'; }

async function confirmDelete() {
    if(deleteId) {
        await fetch(API_URL, { method: 'DELETE', body: JSON.stringify({ id: deleteId }) });
        closeModal();
        update();
    }
}

// --- UI FUNCTIONS ---
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
    // Atualiza o texto do botão
    const btn = document.querySelector('.toggle-view-btn');
    btn.innerHTML = viewMonth ? 'VER SEMANA' : 'VER MÊS'; 
    renderizarTela(); 
}

function renderizarTela() {
    const list = document.getElementById('list');
    
    // Se não tiver lista (ainda na tela de login), não faz nada para não dar erro
    if(!list) return;

    list.innerHTML = '';
    let inc = 0, exp = 0;
    
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
    const curWeek = getWeek(baseDate);
    const curMonth = baseDate.getMonth();
    const curYear = baseDate.getFullYear();

    // Atualiza o texto do período e remove o "Carregando"
    const periodText = viewMonth ? 
        `MÊS ${curMonth+1}/${curYear}` : `SEMANA ${curWeek} - ${curYear}`;
    document.getElementById('periodDisplay').innerText = periodText;

    let hasItems = false;

    // Se db estiver vazio (ainda carregando), não quebra
    if(db && db.length > 0) {
        db.forEach(item => {
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
                div.innerHTML = `
                    <div>
                        <div style="font-weight:700; color:#fff;">${item.desc}</div>
                        <div style="font-size:0.8rem; color:#888;">${item.cat} • ${parts[2]}/${parts[1]}/${parts[0]}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-weight:700; color:${item.type==='income'?'#2ecc71':'#ef4444'}">
                            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.val)}
                        </span>
                        <i class="fa-solid fa-pen" style="color:#666; cursor:pointer;" onclick="editTx(${item.id})"></i>
                        <i class="fa-solid fa-trash" style="color:#666; cursor:pointer;" onclick="delTx(${item.id})"></i>
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
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Entrada', 'Saída'],
            datasets: [{
                data: [inc || 1, exp || 0], // Evita gráfico vazio
                backgroundColor: ['#2ecc71', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: {display:false} } }
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