import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import {
  formatPhone,
  onlyDigits,
  isValidPhone,
} from '../utils/validate';

import '../App.css';

export default function Players() {
    const navigate = useNavigate();

    const [players, setPlayers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [phone, setPhone] = useState('');
    const [search, setSearch] = useState('');
    const [photoFile, setPhotoFile] = useState(null);

    const [editingPlayer, setEditingPlayer] = useState(null);

    useEffect(() => {
        loadPlayers();
    }, []);

    function openEditPlayer(player) {
        setEditingPlayer(player);
        setPlayerName(player.name || '');
        setPhone(player.phone || '');
        setPhotoFile(null);
        setModalOpen(true);
    }
    async function uploadPlayerPhoto(file) {
        if (!file) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `players/${fileName}`;

        const { error } = await supabase.storage
            .from('player-photos')
            .upload(filePath, file);

        if (error) {
            console.error(error);
            alert('Erro ao enviar imagem');
            return null;
        }

        const { data } = supabase.storage
            .from('player-photos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    async function loadPlayers() {
        const house = JSON.parse(localStorage.getItem('house'));
        if (!house) {
            navigate('/');
            return;
        }
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('house_id', house.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            alert('Erro ao carregar jogadores');
            return;
        }
        setPlayers(data || []);
    }

    async function deletePlayer(playerId) {
        const confirmDelete = window.confirm(
            'Deseja realmente excluir este jogador?'
        );

        if (!confirmDelete) return;

        const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', playerId);

        if (error) {
            console.error(error);
            alert('Erro ao excluir jogador');
            return;
        }

        loadPlayers();
    }
    function editPlayer(player) {
        setEditingPlayer(player);
        setPlayerName(player.name || '');
        setPhone(player.phone || '');
        setPhotoFile(null);
        setModalOpen(true);
    }
    async function savePlayer() {
        const house = JSON.parse(localStorage.getItem('house'));

        const normalizedName = playerName.trim().toLowerCase();
        const normalizedPhone = onlyDigits(phone);

        if (!normalizedName) {
            alert('Digite o nome do jogador');
            return;
        }

        if (normalizedPhone.length !== 11) {
            alert('Digite um WhatsApp válido com DDD');
            return;
        }

        const alreadyExists = players.some((player) => {
            if (editingPlayer && player.id === editingPlayer.id) return false;

            const sameName = player.name?.trim().toLowerCase() === normalizedName;
            const samePhone = onlyDigits(player.phone || '') === normalizedPhone;

            return sameName || samePhone;
        });

        if (alreadyExists) {
            alert('Já existe jogador cadastrado com esse nome ou telefone');
            return;
        }

        const photoUrl = photoFile
            ? await uploadPlayerPhoto(photoFile)
            : editingPlayer?.photo_url || null;

        if (editingPlayer) {
            const { error } = await supabase
            .from('players')
            .update({
                name: playerName.trim(),
                phone,
                photo_url: photoUrl,
            })
            .eq('id', editingPlayer.id);

            if (error) {
            console.error(error);
            alert('Erro ao editar jogador');
            return;
            }
        } else {
            const { error } = await supabase
            .from('players')
            .insert({
                house_id: house.id,
                name: playerName.trim(),
                phone,
                photo_url: photoUrl,
            });

            if (error) {
            console.error(error);
            alert('Erro ao cadastrar jogador');
            return;
            }
        }

        setEditingPlayer(null);
        setPlayerName('');
        setPhone('');
        setPhotoFile(null);
        setModalOpen(false);

        loadPlayers();
    }

    const filteredPlayers = players.filter((player) =>
        player.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <main className="app">
            <header className="header admin-header">
                <button className="back-link" onClick={() => navigate('/house')}>
                    ← Voltar
                </button>

                <div className="title">
                    <h1>♠ Jogadores</h1>
                    <p>Jogadores cadastrados da casa</p>
                </div>
            </header>

            <section className="card">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 16,
                        alignItems: 'center',
                        marginBottom: 20,
                    }}
                >
                    <h2 className="side-title">Lista de jogadores</h2>

                    <button
                        className="btn btn-start"
                        onClick={() => setModalOpen(true)}
                    >
                        + Cadastrar jogador
                    </button>
                </div>

                <input
                    placeholder="Buscar jogador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ marginBottom: 18 }}
                />
                <div className="players-box">
                    <div className="players-table-header">
                        <div>Foto</div>
                        <div>Nome</div>
                        <div>Telefone</div>
                        <div>Cadastro</div>
                        <div>Ações</div>
                    </div>
                    {filteredPlayers.length === 0 ? (
                        <p>Nenhum jogador cadastrado.</p>
                    ) : (
                        filteredPlayers.map((player) => (
                            <div className="player-table-row" key={player.id}>
                                {player.photo_url ? (
                                <img
                                    src={player.photo_url}
                                    alt={player.name}
                                    className="player-avatar"
                                />
                                ) : (
                                <div className="player-avatar-placeholder">
                                    {player.name
                                    ?.split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                )}

                                <strong>{player.name}</strong>

                                <span>{formatPhone(player.phone) || '-'}</span>

                                <span>
                                {new Date(player.created_at).toLocaleDateString('pt-BR')}
                                </span>

                                <div className="actions-cell">
                                    <button
                                        className="icon-btn edit-btn"
                                        onClick={() => editPlayer(player)}
                                        title="Editar jogador"
                                        >
                                        <FaEdit />
                                    </button>

                                    <button
                                        className="icon-btn delete-btn"
                                        onClick={() => deletePlayer(player.id)}
                                        title="Excluir jogador"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {modalOpen && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <h2>Novo jogador</h2>

                        <label>
                            Nome
                            <input
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Nome do jogador"
                            />
                        </label>

                        <label>
                            WhatsApp
                            <input
                                value={phone}
                                onChange={(e) => setPhone(formatPhone(e.target.value))}
                                placeholder="(79) 99999-9999"
                                maxLength={15}
                            />
                        </label>
                        <label>
                            Foto do jogador
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhotoFile(e.target.files[0])}
                            />
                        </label>
                        <div className="modal-actions">
                            <button className="btn btn-reset" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </button>

                            <button className="btn btn-start" onClick={savePlayer}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}