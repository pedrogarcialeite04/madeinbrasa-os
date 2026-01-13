import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        let data = req.body;
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

        // --- POST: Ações ---
        if (method === 'POST') {
            
            // CORREÇÃO AQUI: Tratamento robusto do ID para exclusão
            if (data.action === 'delete') {
                const rawId = data.id;
                // Força converter para número inteiro
                const idToDelete = parseInt(rawId); 

                if (!idToDelete || isNaN(idToDelete)) {
                    return res.status(400).json({ error: 'ID inválido ou não numérico' });
                }

                // Adicionado .eq('user_id', ...) para garantir permissão e precisão
                const { error } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', idToDelete)
                    .eq('user_id', 'madeinbrasa');

                if (error) throw error;
                return res.status(200).json({ msg: 'Apagado com sucesso' });
            }

            if (data.action === 'login') {
                if (data.user === 'madeinbrasa' && data.pass === '123') {
                    return res.status(200).json({ authorized: true });
                } else {
                    return res.status(401).json({ authorized: false });
                }
            }

            if (data.action === 'edit') {
                const { id, desc, val, cat, date, type } = data;
                const { error } = await supabase
                    .from('transactions')
                    .update({ desc, val, cat, date, type })
                    .eq('id', id);
                
                if (error) throw error;
                return res.status(200).json({ msg: 'Atualizado' });
            }

            // Adicionar
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