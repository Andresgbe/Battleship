const WebSocket = require('ws'); // Esto inicializa el módulo WebSocket para Node.js

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);

// Almacenar el estado de los jugadores
const players = {};

// Crear tablero vacío
const createEmptyBoard = () => {
    const board = [];
    for (let i = 0; i < 10; i++) {
        const row = Array(10).fill(0); // 0 = agua, 1 = barco
        board.push(row);
    }
    return board;
};

// Inicializar un jugador con un tablero y barcos
const initializePlayer = (playerId) => {
    players[playerId] = {
        board: createEmptyBoard(),
        ships: 5, // Número de barcos restantes
    };

    // Colocar barcos manualmente por ahora
    const board = players[playerId].board;
    board[0][0] = 1; // Barco en (0, 0)
    board[1][1] = 1; // Barco en (1, 1)
    board[2][2] = 1; // Barco en (2, 2)
    board[3][3] = 1; // Barco en (3, 3)
    board[4][4] = 1; // Barco en (4, 4)
};

// Procesar disparo en el tablero de un jugador
const processShot = (playerId, row, col) => {
    const player = players[playerId];
    const board = player.board;

    if (board[row][col] === 1) {
        board[row][col] = -1; // Impacto en un barco
        player.ships -= 1;
        return {
            row,
            col,
            result: player.ships === 0 ? 'sunk' : 'hit',
        };
    } else if (board[row][col] === 0) {
        board[row][col] = -2; // Agua
        return { row, col, result: 'miss' };
    } else {
        return { row, col, result: 'already_shot' };
    }
};

// Manejar conexiones WebSocket
server.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    const playerId = `player-${Date.now()}`;
    initializePlayer(playerId);

    socket.on('message', (message) => {
        try {
            console.log('Mensaje recibido del cliente:', message);
            const data = JSON.parse(message);

            if (data.type === 'shoot') {
                const result = processShot(playerId, data.row, data.col);
                console.log('Resultado del disparo:', result);
                socket.send(JSON.stringify({ type: 'shoot_response', ...result }));
            }
        } catch (error) {
            console.error('Error procesando el mensaje:', error.message);
            socket.send(JSON.stringify({ type: 'error', message: 'Formato de mensaje no válido' }));
        }
    });

    socket.on('close', () => {
        console.log('Cliente desconectado');
        delete players[playerId];
    });
});
