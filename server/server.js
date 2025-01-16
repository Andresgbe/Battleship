const WebSocket = require('ws');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);

const players = {};
let currentTurn = null;

const shipTypes = [
    { name: "Portaaviones", size: 5 },
    { name: "Acorazado", size: 4 },
    { name: "Crucero", size: 3 },
    { name: "Submarino", size: 3 },
    { name: "Destructor", size: 2 }
];


const createEmptyBoard = () => {
    return Array(10).fill(null).map(() => Array(10).fill(0));
};


const initializePlayer = (playerId, socket) => {
    players[playerId] = {
        socket,
        board: createEmptyBoard(),
        shipsRemaining: shipTypes.length,
        ready: false
    };

    if (!currentTurn) {
        currentTurn = playerId; 
    }
};


const switchTurn = () => {
    const playerIds = Object.keys(players);
    if (playerIds.length === 2) {
        currentTurn = playerIds.find(id => id !== currentTurn);
        playerIds.forEach(id => {
            players[id].socket.send(JSON.stringify({ type: 'turn', playerId: currentTurn }));
        });
    }
};


const isShipSunk = (board, row, col) => {
    for (let i = 0; i < shipTypes.length; i++) {
        let shipSize = shipTypes[i].size;
        for (let j = 0; j < shipSize; j++) {
            if (board[row][col] === 1) return false;
        }
    }
    return true;
};


const processShot = (shooterId, targetId, row, col) => {
    const board = players[targetId].board;

    if (board[row][col] === 1) {
        board[row][col] = -1;
        let sunk = isShipSunk(board, row, col);

        if (sunk) {
            players[targetId].shipsRemaining--;
            if (players[targetId].shipsRemaining === 0) {
                return { row, col, result: 'game_over' };
            }
            return { row, col, result: 'sunk' };
        }
        return { row, col, result: 'hit' };
    } else if (board[row][col] === 0) {
        board[row][col] = -2;
        return { row, col, result: 'miss' };
    } else {
        return { row, col, result: 'already_shot' };
    }
};


server.on('connection', (socket) => {
    const playerId = `player-${Date.now()}`;
    initializePlayer(playerId, socket);
    socket.send(JSON.stringify({ type: 'welcome', playerId }));

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'setup_complete') {
                players[data.playerId].board = data.board;
                players[data.playerId].ready = true;

                if (Object.keys(players).every(id => players[id].ready)) {
                    Object.values(players).forEach(player => {
                        player.socket.send(JSON.stringify({ type: 'game_start' }));
                    });
                    switchTurn();
                }
            }

            if (data.type === 'shoot' && data.playerId === currentTurn) {
                const opponentId = Object.keys(players).find(id => id !== data.playerId);
                if (!opponentId) return;

                const result = processShot(data.playerId, opponentId, data.row, data.col);

                players[data.playerId].socket.send(JSON.stringify({ type: 'shoot_response', ...result }));
                players[opponentId].socket.send(JSON.stringify({ type: 'opponent_shot', ...result }));

                if (result.result === 'game_over') {
                    players[data.playerId].socket.send(JSON.stringify({ type: 'game_over', winner: data.playerId }));
                    players[opponentId].socket.send(JSON.stringify({ type: 'game_over', winner: data.playerId }));
                } else if (result.result === 'hit' || result.result === 'sunk') {
                    console.log(`Jugador ${data.playerId} acertó y puede volver a disparar.`);
                } else {
                    switchTurn();
                }
            }
        } catch (error) {
            console.error("Error procesando el mensaje:", error);
        }
    });

    socket.on('close', () => {
        console.log(`Jugador ${playerId} desconectado`);
        delete players[playerId];

        if (Object.keys(players).length === 1) {
            currentTurn = Object.keys(players)[0];
        } else if (Object.keys(players).length === 0) {
            currentTurn = null;
        }
    });
});
