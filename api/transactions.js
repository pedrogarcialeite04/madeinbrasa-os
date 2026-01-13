import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. CORS (Permissões de acesso)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); // Apenas GET e POST são necessários agora
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // --- TRATAMENTO DE DADOS (CRUCIAL) ---
        let data = req.body;
        
        // Se a Vercel entregar como texto, forçamos virar JSON
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        data = data || {}; 

        const method = req.method;

        // --- GET: Listar ---
        if (method === 'GET') {
            const { data: rows, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'madeinbrasa') 
                .order('id', { ascending: false });

            if (error) throw error;
            return res.status(200).json(rows);
        }

        // --- POST: Todas as Ações de Modificação ---
        if (method === 'POST') {
            
            // AÇÃO 1: APAGAR (A CORREÇÃO DEFINITIVA)
            if (data.action === 'delete') {
                const { id } = data;
                if (!id) return res.status(400).json({ error: 'ID não fornecido' });

                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) throw error;
                return res.status(200).json({ msg: 'Apagado com sucesso' });
            }

            // AÇÃO 2: LOGIN
            if (data.action === 'login') {
                // Senha fixa para garantir acesso
                if (data.user === 'madeinbrasa' && data.pass === '123') {
                    return res.status(200).json({ authorized: true });
                } else {
                    return res.status(401).json({ authorized: false });
                }
            }

            // AÇÃO 3: EDITAR
            if (data.action === 'edit') {
                const { id, desc, val, cat, date, type } = data;
                const { error } = await supabase
                    .from('transactions')
                    .update({ desc, val, cat, date, type })
                    .eq('id', id);
                
                if (error) throw error;
                return res.status(200).json({ msg: 'Atualizado' });
            }

            // AÇÃO 4: ADICIONAR (Padrão)
            const { desc, val, cat, date, type } = data;
            if (desc && val !== undefined) {
                const { error } = await supabase
                    .from('transactions')
                    .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
                
                if (error) throw error;
                return res.status(200).json({ msg: 'Adicionado' });
            }
        }

        return res.status(404).json({ error: 'Método não suportado' });

    } catch (error) {
        console.error("Erro Fatal:", error);
        return res.status(500).json({ error: error.message });
    }
}