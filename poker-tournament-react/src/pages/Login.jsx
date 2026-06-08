import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../App.css';

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [houseName, setHouseName] = useState('');
    const [isRegister, setIsRegister] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        if (isRegister) {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                alert(authError.message);
                return;
            }

            const userId = authData.user?.id;

            if (userId) {
                await supabase.from('poker_houses').insert({
                    user_id: userId,
                    name: houseName || 'Casa de Poker',
                });
            }

            alert('Cadastro criado. Agora faça login.');
            setIsRegister(false);
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert('Login inválido');
            return;
        }

        const userId = data.user.id;

        const { data: house, error: houseError } = await supabase
            .from('poker_houses')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        console.log('USER ID LOGADO:', userId);
        console.log('HOUSE:', house);
        console.log('HOUSE ERROR:', houseError);
        if (houseError) {   
            console.error(houseError);
            alert('Erro ao buscar casa de poker');
            return;
        }

        if (!house) {
            alert('Casa de poker não encontrada');
            return;
        }
        if (
            house.status !== 'active' &&
            house.status !== 'trial'
        ) {
            alert('Assinatura inativa');
            return;
        }
        if (house.role !== 'admin') {
            if (house.status !== 'active' && house.status !== 'trial') {
                alert('Assinatura pendente ou desativada. Entre em contato com o administrador.');
                return;
            }

            if (house.expires_at && new Date(house.expires_at) < new Date()) {
                alert('Assinatura vencida. Entre em contato com o administrador.');
                return;
            }
        }

        localStorage.setItem('house', JSON.stringify(house));
        if (house.role === 'admin') {
            navigate('/dashboard');
        } else if (house.role === 'owner') {
            navigate('/house');
        }
    }

    return (
        <main className="display-page">
            <section className="card" style={{ maxWidth: 420, width: '100%' }}>
                <h1 style={{ color: '#facc15', textAlign: 'center' }}>
                    ♠ Poker Player
                </h1>

                <form onSubmit={handleSubmit} className="settings">
                    {isRegister && (
                        <label>
                            Nome da casa
                            <input
                                value={houseName}
                                onChange={(e) => setHouseName(e.target.value)}
                                placeholder="Ex: Aju Poker Club"
                            />
                        </label>
                    )}

                    <label>
                        E-mail
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@casa.com"
                        />
                    </label>

                    <label>
                        Senha
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Sua senha"
                        />
                    </label>

                    <button className="btn btn-start" type="submit">
                        {isRegister ? 'Criar conta' : 'Entrar'}
                    </button>
                </form>

                <button
                    className="btn btn-next"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => setIsRegister(!isRegister)}
                >
                    {isRegister ? 'Já tenho conta' : 'Criar nova casa'}
                </button>
            </section>
        </main>
    );
}