import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  formatPhone,
  onlyDigits,
  isValidPhone,
} from '../utils/validate';
import { supabase } from '../lib/supabase';
import '../App.css';

const initialLevels = [
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
  { small: 100, big: 300 },
  { small: 200, big: 400 },
  { small: 200, big: 500 },
  { small: 300, big: 600 },
  { small: 400, big: 800 },
  { small: 600, big: 1200 },
  { small: 800, big: 1600 },
  { small: 1000, big: 2000 },
  { small: 1500, big: 3000 },
  { small: 2000, big: 4000 },
  { small: 3000, big: 6000 },
  { small: 4000, big: 8000 },
  { small: 5000, big: 10000 },
  { small: 6000, big: 12000 },
  { small: 8000, big: 16000 },
  { small: 10000, big: 20000 },
];

export default function Admin() {
  const navigate = useNavigate();
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [levels, setLevels] = useState(initialLevels);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelMinutes, setLevelMinutes] = useState(10);
  const [jackpotValue, setJackpotValue] = useState(10);
  const [remainingSeconds, setRemainingSeconds] = useState(10 * 60);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [status, setStatus] = useState('PAUSADO');
  const { tournamentId } = useParams();
  const [tournamentName, setTournamentName] = useState('Torneio de Poker');
  const [addonLevel, setAddonLevel] = useState(5);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [buyinValue, setBuyinValue] = useState(100);
  const [addonValue, setAddonValue] = useState(100);
  const [houseFee, setHouseFee] = useState(10);
  const [playersList, setPlayersList] = useState([]);
  const [showPayouts, setShowPayouts] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerBuyin, setPlayerBuyin] = useState(100);
  const [playerJackpot, setPlayerJackpot] = useState(0);
  const levelIntervalRef = useRef(null);
  const totalIntervalRef = useRef(null);
  const breakIntervalRef = useRef(null);
  const level = levels[currentLevel] || { small: 0, big: 0 };
  const playersCount = playersList.length;
  const remainingPlayers = playersList.filter((p) => p.status !== 'eliminado').length;
  const rebuysCount = playersList.reduce((total, p) => total + p.rebuys, 0);
  const addonsCount = playersList.reduce((total, p) => total + p.addons, 0);
  const totalCollected = ((playersCount + rebuysCount) * buyinValue) + (addonsCount * addonValue);
  const houseValue = totalCollected * (houseFee / 100);
  const prizePoolNumber = totalCollected - houseValue;
  const payouts = calculatePayouts(prizePoolNumber, playersCount);

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
  async function loadTournamentPlayers() {
    const { data, error } = await supabase
      .from('tournament_players')
      .select(`
        id,
        buyin,
        jackpot,
        rebuys,
        addons,
        eliminated,
        players (
          id,
          name,
          phone,
          photo_url
        )
      `)
      .eq('tournament_id', tournamentId);
    
    if (error) {
      console.error(error);
      return;
    }

    setPlayersList(
      (data || []).map((item) => ({
        tournament_player_id: item.id,
        player_id: item.players.id,
        name: item.players.name,
        phone: item.players.phone,
        photo_url: item.players.photo_url,
        buyin: item.buyin,
        jackpot: item.jackpot,
        rebuys: item.rebuys,
        addons: item.addons,
        status: item.eliminated ? 'eliminado' : 'ativo',
      }))
    );
  }

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

  function calculatePayouts(totalPrize, players) {
    const itm = Math.ceil(players * 0.15);
    if (!players || !totalPrize) return [];

    let structure = [];

    if (itm <= 3) {
      structure = [50, 30, 20];
    } else if (itm <= 5) {
      structure = [35, 25, 18, 12, 10];
    } else if (itm <= 9) {
      structure = [28, 20, 14, 10, 8, 6, 5, 4, 3];
    } else {
      let base = 100;

      for (let i = 0; i < itm; i++) {
        structure.push(Math.max(1, base - i * 2));
      }

      const sum = structure.reduce((a, b) => a + b, 0);
      structure = structure.map((v) => (v / sum) * 100);
    }

    return structure.slice(0, itm).map((percent, index) => ({
      position: index + 1,
      value: (percent / 100) * totalPrize,
      percent: Number(percent).toFixed(2),
    }));
  }

  async function saveState() {
    const state = {
      tournamentName,
      currentLevel,
      remainingSeconds,
      totalSeconds,
      levels,
      addonLevel,
      isBreak,
      breakSeconds,
      status,
      showPayouts,
      jackpotValue,
      payouts,
      playersList,
      playersCount,
      remainingPlayers,
      prizePool: money(prizePoolNumber),
    };

    const { error } = await supabase
      .from('tournament_state')
      .update({ data: state })
      .eq('id', 1);

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
    }
  }
  async function loadTournament() {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setTournamentName(data.name || 'Torneio de Poker');
    setLevelMinutes(data.level_minutes ?? 10);
    setBreakMinutes(data.break_minutes ?? 5);
    setAddonLevel(data.addon_level ?? 5);
    setBuyinValue(data.buyin_value ?? 100);
    setAddonValue(data.addon_value ?? 100);
    setHouseFee(data.house_fee ?? 10);
    setJackpotValue(data.jackpot_value ?? 10);
    setLoadingTournament(false);
  }
  
  useEffect(() => {
    if (tournamentId) {
      loadTournament();
      loadTournamentPlayers();
    }
  }, [tournamentId]);

  useEffect(() => {
    loadRegisteredPlayers();
  }, []);

  useEffect(() => {
    saveState();
  }, [
    tournamentName,
    currentLevel,
    remainingSeconds,
    totalSeconds,
    levels,
    addonLevel,
    isBreak,
    breakSeconds,
    status,
    showPayouts,
    playersList,
    prizePoolNumber,
    jackpotValue,
  ]);

  async function saveTournamentSettings() {
    const { data, error } = await supabase
      .from('tournaments')
      .update({
        name: tournamentName,
        level_minutes: levelMinutes,
        break_minutes: breakMinutes,
        addon_level: addonLevel,
        buyin_value: buyinValue,
        addon_value: addonValue,
        house_fee: houseFee,
        jackpot_value: jackpotValue,
        small_blind: levels[currentLevel]?.small || 25,
        big_blind: levels[currentLevel]?.big || 50,
      })
      .eq('id', tournamentId)
      .select();

    if (error) {
      console.error(error);
      alert('Erro ao salvar configurações do torneio');
    }
  }

  async function loadRegisteredPlayers() {
    const house = JSON.parse(localStorage.getItem('house'));

    if (!house) return;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('house_id', house.id)
      .order('name');

    if (error) {
      console.error(error);
      return;
    }

    setRegisteredPlayers(data || []);
  }
  function startTimer() {
    if (isBreak) {
      endBreak();
    }

    if (levelIntervalRef.current) return;

    setStatus('RODANDO');

    if (!totalIntervalRef.current) {
      totalIntervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => prev + 1);
      }, 1000);
    }

    levelIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 0) return prev - 1;

        setCurrentLevel((level) => {
          const next = level + 1;
          return next < levels.length ? next : level;
        });

        return levelMinutes * 60;
      });
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(levelIntervalRef.current);
    levelIntervalRef.current = null;
    setStatus('PAUSADO');
  }

  function nextLevel() {
    setCurrentLevel((prev) => Math.min(prev + 1, levels.length - 1));
    setRemainingSeconds(levelMinutes * 60);
  }

  function previousLevel() {
    setCurrentLevel((prev) => Math.max(prev - 1, 0));
    setRemainingSeconds(levelMinutes * 60);
  }

  function resetTournament() {
    clearInterval(levelIntervalRef.current);
    clearInterval(totalIntervalRef.current);
    clearInterval(breakIntervalRef.current);

    levelIntervalRef.current = null;
    totalIntervalRef.current = null;
    breakIntervalRef.current = null;

    setCurrentLevel(0);
    setRemainingSeconds(levelMinutes * 60);
    setTotalSeconds(0);
    setStatus('PAUSADO');
    setIsBreak(false);
    setBreakSeconds(0);
    setPlayersList([]);
    setShowPayouts(false);
  }

  function startBreak() {
    if (isBreak) return;

    pauseTimer();

    setIsBreak(true);
    setStatus('INTERVALO');
    setBreakSeconds(breakMinutes * 60);

    breakIntervalRef.current = setInterval(() => {
      setBreakSeconds((prev) => {
        if (prev > 0) return prev - 1;

        endBreak();
        return 0;
      });
    }, 1000);
  }

  function endBreak() {
    clearInterval(breakIntervalRef.current);
    breakIntervalRef.current = null;
    setIsBreak(false);
    setBreakSeconds(0);
    setStatus('PAUSADO');
  }

  function updateCurrentBlinds(field, value) {
    setLevels((prev) =>
      prev.map((item, index) =>
        index === currentLevel
          ? { ...item, [field]: Number(value) || 0 }
          : item
      )
    );
  }

  function openPlayerModal() {
    setPlayerName('');
    setPlayerBuyin(buyinValue);
    setPlayerJackpot(0);
    setModalOpen(true);
  }

  async function addPlayer() {
    const house = JSON.parse(localStorage.getItem('house'));

    if (!playerName.trim()) {
      alert('Digite o nome do jogador');
      return;
    }
    if (!isValidPhone(playerPhone)) {
      alert('Digite um WhatsApp válido');
      return;
    }

    let playerId = selectedPlayerId;

    if (!playerId) {
      const { data, error } = await supabase
        .from('players')
        .insert({
          house_id: house.id,
          name: playerName.trim(),
          phone: onlyDigits(playerPhone),
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Erro ao cadastrar jogador');
        return;
      }

      playerId = data.id;

      loadRegisteredPlayers();
    }

    const alreadyInTournament = playersList.some(
      (p) => p.player_id === playerId
    );

    if (alreadyInTournament) {
      alert('Esse jogador já está no torneio');
      return;
    }

    const { data: tournamentPlayerData, error: tournamentPlayerError } = await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        buyin: Number(playerBuyin) || 0,
        jackpot: Number(jackpotValue) || 0,
        rebuys: 0,
        addons: 0,
        eliminated: false,
      })
      .select()
      .single();

    if (tournamentPlayerError) {
      console.error(tournamentPlayerError);
      alert('Erro ao vincular jogador ao torneio');
      return;
    }

    const newPlayer = {
      tournament_player_id: tournamentPlayerData.id,
      player_id: playerId,
      name: playerName.trim(),
      phone: onlyDigits(playerPhone),
      buyin: Number(playerBuyin) || 0,
      jackpot: Number(jackpotValue) || 0,
      rebuys: 0,
      addons: 0,
      status: 'ativo',
    };

    setPlayersList((prev) => [...prev, newPlayer]);
    
    await loadTournamentPlayers();
    setSelectedPlayerId('');
    setPlayerName('');
    setPlayerPhone('');
    setPlayerBuyin(buyinValue);
    setPlayerJackpot(0);
    setModalOpen(false);
  }

  async function changeRebuy(index, value) {
    const player = playersList[index];
    const newValue = Math.max(0, Number(player.rebuys || 0) + value);

    setPlayersList((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, rebuys: newValue } : p
      )
    );

    const { error } = await supabase
      .from('tournament_players')
      .update({ rebuys: newValue })
      .eq('id', player.tournament_player_id);

    if (error) {
      console.error(error);
      alert('Erro ao atualizar rebuy');
    }
  }

  async function changeAddon(index, value) {
    const player = playersList[index];
    const newValue = Math.max(0, Number(player.addons || 0) + value);

    setPlayersList((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, addons: newValue } : p
      )
    );

    const { error } = await supabase
      .from('tournament_players')
      .update({ addons: newValue })
      .eq('id', player.tournament_player_id);

    if (error) {
      console.error(error);
      alert('Erro ao atualizar add-on');
    }
  }

  function toggleEliminatePlayer(index) {
    setPlayersList((prev) =>
      prev.map((player, i) =>
        i === index
          ? {
              ...player,
              status: player.status === 'eliminado' ? 'ativo' : 'eliminado',
            }
          : player
      )
    );
  }
    return (
    <main className="app">
      <header className="header admin-header">
        <button
          className="back-link"
          onClick={() => navigate('/house')}
        >
          ← Voltar
        </button>

        <div className="title">
          <h1>♠ {tournamentName}</h1>
        </div>

        <div className="total-time-box">
          Duração total: <strong>{formatTotalTime(totalSeconds)}</strong>
        </div>

        <div className="badge">
          {status}
        </div>
      </header>

      <section className="main-grid">
        <div className="card">
          <div className="level-label">
            Nível <div className="level-number">{currentLevel + 1}</div>
          </div>

          {isBreak && <div className="timer-title">INTERVALO</div>}

          <div className="timer">
            {isBreak ? formatTime(breakSeconds) : formatTime(remainingSeconds)}
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

          <div className="structure-bottom">
            <h2 className="side-title">Estrutura</h2>

            <div id="levelsList">
              {levels.map((item, index) => (
                <div
                  className={`next-level ${index === currentLevel ? 'current' : ''}`}
                  key={index}
                >
                  <span>
                    Nível {index + 1}{' '}
                    {index + 1 === addonLevel && (
                      <strong style={{ color: '#22c55e' }}>ADD-ON</strong>
                    )}
                  </span>

                  <span>
                    {item.small}/{item.big}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="card">
          <div className="settings">
            <label>
              Nome do torneio
              <input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
              />
            </label>

            <div className="addon">
              <label>
                Tempo por nível
                <input
                  type="number"
                  value={levelMinutes}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 1;
                    setLevelMinutes(value);
                    setRemainingSeconds(value * 60);
                  }}
                />
              </label>

              <label>
                Tempo do intervalo
                <input
                  type="number"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value) || 1)}
                />
              </label>
            </div>

            <div className="addon">
              <label>
                Small Blind
                <input
                  type="number"
                  value={level.small}
                  onChange={(e) => updateCurrentBlinds('small', e.target.value)}
                />
              </label>

              <label>
                Big Blind
                <input
                  type="number"
                  value={level.big}
                  onChange={(e) => updateCurrentBlinds('big', e.target.value)}
                />
              </label>
            </div>

            <label>
              Nível do Add-on
              <input
                type="number"
                value={addonLevel}
                onChange={(e) => setAddonLevel(Number(e.target.value) || 1)}
              />
            </label>

            <div className="addon">
              <label>
                Valor do Buy-in
                <input
                  type="number"
                  value={buyinValue}
                  onChange={(e) => setBuyinValue(Number(e.target.value) || 0)}
                />
              </label>

              <label>
                Valor do Add-on
                <input
                  type="number"
                  value={addonValue}
                  onChange={(e) => setAddonValue(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <div className="addon">
              <label>
                Home (%)
                <input
                  type="number"
                  value={houseFee}
                  onChange={(e) => setHouseFee(Number(e.target.value) || 0)}
                />
              </label>

              <label>
                Jackpot
                <input
                  type="number"
                  value={jackpotValue}
                  onChange={(e) => setJackpotValue(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <button
              className="btn btn-save"
              onClick={saveTournamentSettings}
            >
              Salvar
            </button>

            <div className="prize-box">
              <div>Total arrecadado: <strong>{money(totalCollected)}</strong></div>
              <div>Taxa da casa: <strong>{money(houseValue)}</strong></div>
              <div>Premiação: <strong>{money(prizePoolNumber)}</strong></div>
            </div>

            <div id="payoutTable">
              {payouts.map((p) => (
                <div key={p.position}>
                  {p.position}º → {p.percent}% ({money(p.value)})
                </div>
              ))}
            </div>
          </div>

          <div className="controls">
            <button className="btn btn-start" onClick={openPlayerModal}>+ Player</button>
            <button className="btn btn-start" onClick={startTimer}>▶ Iniciar</button>
            <button className="btn btn-pause" onClick={pauseTimer}>⏸ Pausar</button>
            <button className="btn btn-break" onClick={startBreak}>Intervalo</button>
            <button className="btn btn-return" onClick={endBreak}>↩ Voltar</button>
            <button className="btn btn-prev" onClick={previousLevel}>← Nível</button>
            <button className="btn btn-next" onClick={nextLevel}>Nível →</button>
            <button className="btn btn-return" onClick={() => setShowPayouts((v) => !v)}>
              🏆 Mostrar premiação
            </button>
            <button className="btn btn-reset" onClick={resetTournament}>⟲ Resetar</button>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <h2>Novo jogador</h2>

            <label>
              Selecionar jogador cadastrado
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPlayerId(id);

                  const selected = registeredPlayers.find((p) => p.id === id);

                  if (selected) {
                    setPlayerName(selected.name);
                    setPlayerPhone(selected.phone || '');
                  } else {
                    setPlayerName('');
                    setPlayerPhone('');
                  }
                }}
              >
                <option value="">Novo jogador</option>

                {registeredPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} - {player.phone ? formatPhone(player.phone ) : 'sem telefone'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nome
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: Lucas"
                disabled={!!selectedPlayerId}
              />
            </label>
            <label>
              Telefone
              <input
                value={playerPhone}
                onChange={(e) => setPlayerPhone(formatPhone(e.target.value))}
                placeholder="(79) 99999-9999"
              />
            </label>

            <label>
              Buy-in
              <input
                type="number"
                value={playerBuyin}
                onChange={(e) => setPlayerBuyin(Number(e.target.value) || 0)}
              />
            </label>

            <div className="modal-actions">
              <button className="btn btn-reset" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>

              <button className="btn btn-start" onClick={addPlayer}>
                Salvar jogador
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="players-box">
        <h2>Jogadores cadastrados</h2>

        <div className="tournament-player-header">
          <span>Jogador</span>
          <span>Jackpot</span>
          <span>Buy-In</span>
          <span>Rebuys</span>
          <span>Add-ons</span>
          <span>Total</span>
          <span>Ações</span>
        </div>

        {playersList.map((player, index) => {
          const entradas = 1;
          const jackpot = Number(jackpotValue || 0);
          const total =
            (entradas * buyinValue) +
            (player.rebuys * buyinValue) +
            (player.addons * addonValue) +
            jackpot;

          return (
            <div
              className={`tournament-player-row ${
                player.status === 'eliminado' ? 'player-eliminated' : ''
              }`}
              key={player.tournament_player_id || index}
            >
              <strong>{player.name}</strong>
              <span>{Number(jackpotValue || 0)}</span>
              <span>{entradas}</span>
              

              <div className="player-counter">
                <div className="counter">
                  <button onClick={() => changeRebuy(index, -1)}>−</button>
                  <span>{player.rebuys}</span>
                  <button onClick={() => changeRebuy(index, 1)}>+</button>
                </div>
              </div>

              <div className="player-counter">
                <div className="counter">
                  <button onClick={() => changeAddon(index, -1)}>−</button>
                  <span>{player.addons}</span>
                  <button onClick={() => changeAddon(index, 1)}>+</button>
                </div>
              </div>

              <strong>
                {total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </strong>

              <button
                className="eliminate-btn"
                onClick={() => toggleEliminatePlayer(index)}
              >
                {player.status === 'eliminado' ? 'Reativar' : 'Eliminar'}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}