import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';

const socket = io('https://vikaychess.enzonic.dev');

function App() {
  const [game, setGame] = useState(new Chess());
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [myColor, setMyColor] = useState(null);
  const [message, setMessage] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');

  useEffect(() => {
    socket.on('gameCreated', ({ roomId, color, fen }) => {
      setRoomId(roomId);
      setMyColor(color);
      setJoinedRoom(true);
      setMessage(`Комната: ${roomId}. Ждем соперника...`);
      const newGame = new Chess(fen);
      setGame(newGame);
    });

    socket.on('gameStarted', ({ fen, color }) => {
      setJoinedRoom(true);
      setMyColor(color); // Теперь цвет берется из ответа сервера
      setMessage(`Игра началась! Твой цвет: ${color}`);
      const newGame = new Chess(fen);
      setGame(newGame);
    });

    socket.on('moveMade', ({ fen }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
    });

    socket.on('gameOver', ({ result, ratings }) => {
      setMessage(`${result}. Новый рейтинг: Белые ${ratings.white}, Черные ${ratings.black}`);
    });

    socket.on('error', (msg) => {
      setMessage(`Ошибка: ${msg}`);
    });

    return () => {
      socket.off('gameCreated');
      socket.off('gameStarted');
      socket.off('moveMade');
      socket.off('gameOver');
      socket.off('error');
    };
  }, []);

  const createGame = () => {
    if (playerName) socket.emit('createGame', playerName);
  };

  const joinGame = () => {
    if (playerName && inputRoomId) {
      // Убрали принудительную установку setMyColor('b')
      socket.emit('joinGame', { roomId: inputRoomId.toUpperCase(), playerName });
    }
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    if (!joinedRoom) return false;
    
    if (myColor && game.turn() !== myColor) {
      setMessage('Сейчас не ваш ход');
      return false;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    };

    socket.emit('makeMove', { roomId, move });
    return true; 
  };

  if (!joinedRoom) {
    return (
      <div className="container">
        <h1>Шахматы by vikay</h1>
        <input 
          placeholder="Ваше имя" 
          value={playerName} 
          onChange={e => setPlayerName(e.target.value)} 
        />
        <button onClick={createGame}>Создать игру</button>
        
        <p style={{ margin: '10px 0', fontSize: '14px', color: '#8892b0' }}>или</p>
        
        <input 
          placeholder="ID комнаты" 
          value={inputRoomId} 
          onChange={e => setInputRoomId(e.target.value)} 
        />
        <button onClick={joinGame}>Присоединиться</button>
        {message && <p style={{ marginTop: '15px', color: '#e94560' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px', width: '90%' }}>
      <h2 style={{ fontSize: '1.2rem', color: '#8892b0' }}>{message}</h2>
      <div className="board-wrapper">
        <Chessboard 
          position={game.fen()} 
          onPieceDrop={onDrop} 
          boardOrientation={myColor === 'b' ? 'black' : 'white'}
        />
      </div>
    </div>
  );
}

export default App;
