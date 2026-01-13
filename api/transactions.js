import { createClient } from '@supabase/supabase-js';

// Inicializa o Supabase (garante que as variáveis existem)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. Configuração de CORS (Permitir acesso do navegador)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido se for só verificação do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // --- A CORREÇÃO MÁGICA ESTÁ AQUI ---
        // Se o dado vier como texto (string), nós forçamos virar Objeto (JSON)
        let data = req.body;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Se falhar, assume vazio para não quebrar o script
                data = {};
            }
        }
        // Se já vier como objeto (às vezes a Vercel faz isso), usa ele mesmo
        data = data || {}; 
        // ------------------------------------

        const method = req.method;

        // --- LOGIN (Hardcoded para funcionar AGORA) ---
        if (method === 'POST' && data.action === 'login') {
            const serverUser = 'madeinbrasa';
            const serverPass = '123'; // Senha fixa para destravar você

            // Compara os dados já tratados
            if (data.user === serverUser && data.pass === serverPass) {
                return res.status(200).json({ authorized: true });
            } else {
                return res.status(401).json({ authorized: false });
            }
        }

        // --- ROTAS DO BANCO DE DADOS ---

        // GET - Listar
        if (method === 'GET') {
            const { data: rows, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'madeinbrasa') 
                .order('id', { ascending: false });

            if (error) throw error;
            return res.status(200).json(rows);
        }

        // POST - Adicionar
        if (method === 'POST') {
            const { desc, val, cat, date, type } = data;
            // Validação simples
            if (!val && val !== 0) return res.status(400).json({ error: 'Valor inválido' });

            const { error } = await supabase
                .from('transactions')
                .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
            
            if (error) throw error;
            return res.status(200).json({ msg: 'Adicionado' });
        }

        // DELETE - Apagar
        if (method === 'DELETE') {
            const { id } = data;
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Deletado' });
        }

        // PUT - Atualizar
        if (method === 'PUT') {
            const { id, desc, val, cat, date, type } = data;
            const { error } = await supabase.from('transactions').update({ desc, val, cat, date, type }).eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Atualizado' });
        }

        return res.status(404).json({ error: 'Rota não encontrada' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}