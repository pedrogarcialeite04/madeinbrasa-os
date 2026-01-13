import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. Permite que o site converse com o servidor (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Responde rápido se for verificação do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        let data = req.body;

        // Garante que o dado seja um Objeto JSON, mesmo se vier como Texto
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        data = data || {}; 
        
        const method = req.method;

        // --- GET: Listar itens ---
        if (method === 'GET') {
            const { data: rows, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'madeinbrasa') 
                .order('id', { ascending: false });

            if (error) throw error;
            return res.status(200).json(rows);
        }

        // --- POST: Realizar ações (Adicionar, Login, Apagar, Editar) ---
        if (method === 'POST') {
            
            // 1. LOGIN
            if (data.action === 'login') {
                if (data.user === 'madeinbrasa' && data.pass === '123') {
                    return res.status(200).json({ authorized: true });
                } else {
                    return res.status(401).json({ authorized: false });
                }
            }

            // 2. APAGAR (A Solução Definitiva)
            // Usamos POST com action 'delete' para garantir que o ID chegue
            if (data.action === 'delete') {
                const { id } = data;
                if (!id) return res.status(400).json({ error: 'ID faltando' });

                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) throw error;
                return res.status(200).json({ msg: 'Deletado com sucesso' });
            }

            // 3. EDITAR
            if (data.action === 'edit') {
                const { id, desc, val, cat, date, type } = data;
                const { error } = await supabase
                    .from('transactions')
                    .update({ desc, val, cat, date, type })
                    .eq('id', id);
                
                if (error) throw error;
                return res.status(200).json({ msg: 'Atualizado' });
            }

            // 4. ADICIONAR (Padrão)
            const { desc, val, cat, date, type } = data;
            // Validação simples
            if (desc && val !== undefined) {
                const { error } = await supabase
                    .from('transactions')
                    .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
                
                if (error) throw error;
                return res.status(200).json({ msg: 'Adicionado' });
            }
        }

        return res.status(404).json({ error: 'Ação não encontrada' });

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({ error: error.message });
    }
}