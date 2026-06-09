import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../App.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHouses();
    }, []);
    async function renewHouse(id) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error } = await supabase
            .from('poker_houses')
            .update({
            status: 'active',
            expires_at: expiresAt.toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert('Erro ao renovar assinatura');
            return;
        }

        loadHouses();
    }

    async function loadHouses() {
        const { data, error } = await supabase
            .from('poker_houses')
            .select(`
                id,
                name,
                role,
                status,
                expires_at,
                monthly_fee,
                created_at,
                user_id
                `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            alert('Erro ao carregar casas de poker');
            return;
        }

        setHouses(data || []);
        setLoading(false);
    }

    return (
        <main className="app">
            <header className="header">
                <div className="title">
                    <h1>♠ Dashboard Admin</h1>
                    <p>Casas de poker cadastradas</p>
                </div>

                <button className="btn btn-reset" 
                onClick={async () => {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    navigate('/');
                }}>
                    Sair
                </button>
            </header>

            <section className="card">
                <h2 className="side-title">Casas cadastradas</h2>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <div className="players-box">
                        {houses.map((house) => (
                            <div className="player-row" key={house.id}>
                                <strong>{house.name}</strong>
                                <span>Perfil: {house.role}</span>
                                <span>
                                    Criada em:{' '}
                                    {new Date(house.created_at).toLocaleDateString('pt-BR')}
                                </span>
                                <span>
                                    Status:{' '}
                                    <strong
                                        style={{
                                        color:
                                            house.status === 'active'
                                            ? '#22c55e'
                                            : house.status === 'pending'
                                            ? '#f59e0b'
                                            : house.status === 'expired'
                                            ? '#ef4444'
                                            : '#94a3b8',
                                        }}
                                    >
                                        {house.status || 'sem status'}
                                    </strong>
                                </span>
                                <span>
                                    Vence em:
                                    {house.expires_at
                                        ? new Date(house.expires_at).toLocaleDateString('pt-BR')
                                        : '-'}
                                </span>
                                <button
                                    className="btn btn-start"
                                    onClick={() => renewHouse(house.id)}
                                    >
                                    Liberar +30 dias
                                </button>
                                <button
                                    className="btn btn-next"
                                    onClick={() => navigate('/admin/1')}
                                >
                                    Abrir
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}