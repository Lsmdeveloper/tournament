import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../App.css';

export default function HouseDashboard() {
  const navigate = useNavigate();

  const [house, setHouse] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const storedHouse = JSON.parse(localStorage.getItem('house'));

    if (!storedHouse) {
      navigate('/');
      return;
    }

    setHouse(storedHouse);

    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('house_id', storedHouse.id)
      .order('created_at', { ascending: false });

    setTournaments(data || []);
    setLoading(false);
  }

  async function createTournament() {
    const name = prompt('Nome do torneio');

    if (!name) return;

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        house_id: house.id,
        name,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert('Erro ao criar torneio');
      return;
    }

    navigate(`/admin/${data.id}`);
  }

  return (
    <main className="app">
      <div className="header">
        <div className="title">
          <h1>♠ {house?.name}</h1>
          <p>Painel da Casa</p>
        </div>

        <button
          className="btn btn-reset"
          onClick={() => {
            localStorage.clear();
            navigate('/');
          }}
        >
          Sair
        </button>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2 className="side-title">Ações</h2>

          <div className="controls">
            <button
              className="btn btn-start"
              onClick={createTournament}
            >
              Novo Torneio
            </button>

            <button
                className="btn btn-next"
                onClick={() => navigate('/players')}
                >
                Jogadores
            </button>

            <button
              className="btn btn-break"
              onClick={() => alert('Em desenvolvimento')}
            >
              Ranking
            </button>

            <button
              className="btn btn-pause"
              onClick={() => alert('Em desenvolvimento')}
            >
              Financeiro
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="side-title">Informações</h2>

          <div className="settings">
            <div>
              <strong>Status:</strong> {house?.status}
            </div>

            <div>
              <strong>Vencimento:</strong>{' '}
              {house?.expires_at
                ? new Date(house.expires_at).toLocaleDateString('pt-BR')
                : '-'}
            </div>

            <div>
              <strong>Mensalidade:</strong> R$ {house?.monthly_fee}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="side-title">Torneios</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : tournaments.length === 0 ? (
          <p>Nenhum torneio criado.</p>
        ) : (
          <div className="players-box">
            {tournaments.map((tournament) => (
              <div
                className="player-row"
                key={tournament.id}
              >
                <strong>{tournament.name}</strong>

                <span>
                  Status: {tournament.status}
                </span>

                <span>
                  {new Date(
                    tournament.created_at
                  ).toLocaleDateString('pt-BR')}
                </span>

                <button
                  className="btn btn-next"
                  onClick={() =>
                    navigate(`/admin/${tournament.id}`)
                  }
                >
                  Abrir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}