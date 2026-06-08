import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import '../App.css';

export default function Display() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadState() {
      const { data, error } = await supabase
        .from('tournament_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Erro ao carregar estado:', error);
        return;
      }

      setData(data.data);
    }

    loadState();

    const channel = supabase
      .channel('tournament-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_state',
        },
        (payload) => {
          setData(payload.new.data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function formatTime(seconds = 0) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function formatTotalTime(seconds = 0) {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
  }

  if (!data) {
    return <main className="display-page">Carregando torneio...</main>;
  }

  const level = data.levels?.[data.currentLevel] || { small: 0, big: 0 };
  const nextLevel = data.levels?.[data.currentLevel + 1];
  const payouts = data.payouts || [];

  return (
    <main className="display-page">
      <section className="display-card">
        <div className="display-header">
          <h1>♠ {data.tournamentName || 'Torneio de Poker'}</h1>

          <div className="total">
            Duração total: <strong>{formatTotalTime(data.totalSeconds)}</strong>
          </div>

          <div className={`status-badge status-${String(data.status || '').toLowerCase()}`}>
            {data.status || 'PAUSADO'}
          </div>
        </div>

        <div className="level-label">
          Nível <div className="level-number">{data.currentLevel + 1}</div>
        </div>

        {data.isBreak && <div className="timer-title">INTERVALO</div>}

        <div className="timer">
          {data.isBreak ? formatTime(data.breakSeconds) : formatTime(data.remainingSeconds)}
        </div>

        <div className="blinds">
          <div className="blind-box">
            <span>Small Blind</span>
            <strong>{level.small}</strong>
          </div>

          <div className="blind-box">
            <span>Big Blind</span>
            <strong>{level.big}</strong>
          </div>

          <div className="blind-box">
            <span>Ante</span>
            <strong>{level.big}</strong>
          </div>
        </div>

        <div className="extra-info">
          <div>
            <span>Próximo nível</span>
            <strong>{nextLevel ? `${nextLevel.small} / ${nextLevel.big}` : 'FINAL'}</strong>
          </div>

          <div>
            <span>Jogadores</span>
            <strong>{data.remainingPlayers || 0}/{data.playersCount || 0}</strong>
          </div>

          <div>
            <span>Premiação</span>
            <strong>{data.prizePool || 'R$ 0,00'}</strong>
          </div>
        </div>

        {data.showPayouts && payouts.length > 0 && (
          <div className="payout-display">
            <div className="payout-title">🏆 Premiação</div>

            <div className="payout-grid">
              {payouts.slice(0, 5).map((p) => (
                <div className="payout-item" key={p.position}>
                  <span>{p.position}º lugar</span>
                  <strong>
                    {Number(p.value).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}