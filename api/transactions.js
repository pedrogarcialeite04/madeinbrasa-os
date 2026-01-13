import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. CORS - Permite o site falar com o backend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // --- CORREÇÃO BLINDADA DE DADOS ---
        let data = req.body;

        // Se veio como texto, tenta converter para JSON
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("Erro ao converter JSON:", e);
                data = {}; 
            }
        }
        
        // Garante que é um objeto
        data = data || {}; 
        
        const method = req.method;
        console.log("Método:", method, "Dados:", data); // Log para ajudar a Vercel a debugar

        // --- LOGIN (Hardcoded) ---
        if (method === 'POST' && data.action === 'login') {
            const serverUser = 'madeinbrasa';
            const serverPass = '123'; 

            if (data.user === serverUser && data.pass === serverPass) {
                return res.status(200).json({ authorized: true });
            } else {
                return res.status(401).json({ authorized: false });
            }
        }

        // --- LANÇAR (POST sem ser login) ---
        if (method === 'POST') {
            const { desc, val, cat, date, type } = data;

            // Validação de segurança: Se não tiver descrição ou valor, não faz nada
            if (!desc || val === undefined) {
                 return res.status(400).json({ error: 'Dados incompletos' });
            }

            const { error } = await supabase
                .from('transactions')
                .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
            
            if (error) throw error;
            return res.status(200).json({ msg: 'Adicionado com sucesso' });
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

        // --- DELETE ---
        if (method === 'DELETE') {
            const { id } = data;
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Deletado' });
        }

        // --- PUT (Editar) ---
        if (method === 'PUT') {
            const { id, desc, val, cat, date, type } = data;
            const { error } = await supabase.from('transactions').update({ desc, val, cat, date, type }).eq('id', id);
            if (error) throw error;
            return res.status(200).json({ msg: 'Atualizado' });
        }

        return res.status(404).json({ error: 'Rota não encontrada' });

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({ error: error.message });
    }
}