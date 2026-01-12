const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const method = event.httpMethod;
        const data = event.body ? JSON.parse(event.body) : {};

        // --- NOVO: VERIFICAÇÃO DE LOGIN (SEGURANÇA) ---
        // Se o pedido tiver a ação 'login', verificamos as credenciais
        if (method === 'POST' && data.action === 'login') {
            const serverUser = process.env.APP_USER; // Pega do cofre do Netlify
            const serverPass = process.env.APP_PASS;

            if (data.user === serverUser && data.pass === serverPass) {
                return { 
                    statusCode: 200, 
                    headers, 
                    body: JSON.stringify({ authorized: true }) 
                };
            } else {
                return { 
                    statusCode: 401, 
                    headers, 
                    body: JSON.stringify({ authorized: false }) 
                };
            }
        }
        // ------------------------------------------------

        // GET - LISTAR
        if (method === 'GET') {
            const { data: rows, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'madeinbrasa') 
                .order('id', { ascending: false });

            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(rows) };
        }

        // POST - ADICIONAR (Mantido igual)
        if (method === 'POST') {
            const { desc, val, cat, date, type } = data;
            const { error } = await supabase
                .from('transactions')
                .insert([{ desc, val, cat, date, type, user_id: 'madeinbrasa' }]);
            
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify({ msg: 'Adicionado' }) };
        }

        // DELETE e PUT continuam iguais...
        if (method === 'DELETE') {
            const { id } = data;
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify({ msg: 'Deletado' }) };
        }

        if (method === 'PUT') {
            const { id, desc, val, cat, date, type } = data;
            const { error } = await supabase.from('transactions').update({ desc, val, cat, date, type }).eq('id', id);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify({ msg: 'Atualizado' }) };
        }

        return { statusCode: 404, headers, body: 'Rota não encontrada' };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};