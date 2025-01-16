const WebSocket = require('ws');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);

const players = {};
let currentTurn = null;

// Crear tablero vacío
const createEmptyBoard = () => {
    return Array.from({ length: 10 }, () => Array(10).fill(0));
};

// Colocar barcos en el tablero (aleatorio por ahora)
const placeShips = (board) => {
    let shipsPlaced = 5;
    while (shipsPlaced > 0) {
        let row = Math.floor(Math.random() * 10);
        let col = Math.floor(Math.random() * 10);
        if (board[row][col] === 0) {
            board[row][col] = 1; // 1 representa un barco
            shipsPlaced--;
        }
    }
};

// Inicializar jugador
const initializePlayer = (playerId, socket) => {
    players[playerId] = {
        socket,
        board: createEmptyBoard(),
        ships: 5
    };
    placeShips(players[playerId].board);

    // Establecer turno inicial si es el primer jugador
    if (!currentTurn) {
        currentTurn = playerId;
    }
};

// Procesar disparo
const processShot = (shooterId, targetId, row, col) => {
    const board = players[targetId].board;

    if (board[row][col] === 1) {
        board[row][col] = -1;
        players[targetId].ships--;
        return { row, col, result: players[targetId].ships === 0 ? 'sunk' : 'hit' };
    } else if (board[row][col] === 0) {
        board[row][col] = -2;
        return { row, col, result: 'miss' };
    } else {
        return { row, col, result: 'already_shot' };
    }
};

// Cambiar turno
const switchTurn = () => {
    const playerIds = Object.keys(players);
    if (playerIds.length === 2) {
        currentTurn = playerIds.find(id => id !== currentTurn);
        playerIds.forEach(id => players[id].socket.send(JSON.stringify({ type: 'turn', playerId: currentTurn })));
    }
};

// Manejo de conexiones
server.on('connection', (socket) => {
    const playerId = `player-${Date.now()}`;
    initializePlayer(playerId, socket);
    socket.send(JSON.stringify({ type: 'welcome', playerId }));

    // Enviar turno inicial si hay dos jugadores
    if (Object.keys(players).length === 2) {
        switchTurn();
    }

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'shoot' && data.playerId === currentTurn) {
                const opponentId = Object.keys(players).find(id => id !== data.playerId);
                if (!opponentId) return;

                const result = processShot(data.playerId, opponentId, data.row, data.col);
                players[data.playerId].socket.send(JSON.stringify({ type: 'shoot_response', ...result }));
                players[opponentId].socket.send(JSON.stringify({ type: 'opponent_shot', ...result }));

                // Verificar si el juego terminó
                if (players[opponentId].ships === 0) {
                    players[data.playerId].socket.send(JSON.stringify({ type: 'game_over', winner: data.playerId }));
                    players[opponentId].socket.send(JSON.stringify({ type: 'game_over', winner: data.playerId }));
                } else {
                    switchTurn();
                }
            }
        } catch (error) {
            console.error("Error procesando el mensaje:", error);
        }
    });

    // Manejar desconexión
    socket.on('close', () => {
        console.log(`Jugador ${playerId} desconectado`);
        delete players[playerId];

        // Resetear turno si solo queda un jugador
        if (Object.keys(players).length === 1) {
            currentTurn = Object.keys(players)[0];
        } else if (Object.keys(players).length === 0) {
            currentTurn = null;
        }
    });
});
