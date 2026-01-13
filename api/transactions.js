// Arquivo: api/transactions.js
import { createClient } from '@supabase/supabase-js';

// Inicializa o Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Permite conexões de qualquer lugar (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Se for apenas uma verificação do navegador (OPTIONS), responde OK
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const method = req.method;
        const data = req.body || {}; // Vercel já entrega o JSON pronto

        // --- LOGIN ---
        if (method === 'POST' && data.action === 'login') {
            const serverUser = process.env.APP_USER;
            const serverPass = process.env.APP_PASS;

            if (data.user === serverUser && data.pass === serverPass) {
                return res.status(200).json({ authorized: true });
            } else {
                return res.status(401).json({ authorized: false });
            }
        }

        // --- GET (Listar) ---
        if (method === 'GET') {
            const { data: rows, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'madeinbrasa') 
                .order('id', { ascending: false });

            if (error) throw error;
            return res.status(200).json(rows);
        }

        // --- POST (Adicionar) ---
        if (method === 'POST') {
            const { desc, val, cat, date, type } = data;
            const { error } = await supabase
                .from('transactions')
                .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
            
            if (error) throw error;
            return res.status(200).json({ msg: 'Adicionado' });
        }

        // --- DELETE (Apagar) ---
        if (method === 'DELETE') {
            const { id } = data;
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Deletado' });
        }

        // --- PUT (Atualizar) ---
        if (method === 'PUT') {
            const { id, desc, val, cat, date, type } = data;
            const { error } = await supabase.from('transactions').update({ desc, val, cat, date, type }).eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Atualizado' });
        }

        // Se chegou até aqui e não entrou em nenhum if
        return res.status(404).json({ error: 'Rota não encontrada' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}