const WebSocket = require('ws');
const { handleSonarUse } = require('./powerups');
const { handleAttackPlanes } = require('./powerups');  // Asegúrate de importar la función correctamente
const { handlePlantMine, handleMineHit } = require('./powerups');  // Asegúrate de importar las funciones necesarias
const { handleDefensiveShield } = require('./powerups');  // Asegúrate de importar correctamente
const { handleCruiseMissile } = require('./powerups');  // Asegúrate de importar la función

const players = {};
let currentTurn = null;
let numPlayers = 0;  // Contador de jugadores conectados
const maxPlayers = 4;  // Número máximo de jugadores



const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);



const shipTypes = [
    { name: "Portaaviones", size: 5 },
    { name: "Acorazado", size: 4 },
    { name: "Crucero", size: 3 },
    { name: "Submarino", size: 3 },
    { name: "Destructor", size: 2 }
];

// new 
// Server logic remains mostly unchanged. We just ensure the 'opponent_boards' message is sent correctly.
function sendOpponentBoards() {
    // Send boards to all players when the game starts
    Object.values(players).forEach(player => {
        if (player.socket !== socket) {
            player.socket.send(JSON.stringify({
                type: 'opponent_boards',
                boards: Object.values(players).map(p => p.board),
            }));
        }
    });
}


function createEmptyBoard() {
    return Array(10).fill(null).map(() => Array(10).fill(0));
}


const initializePlayer = (playerId, socket) => {
    players[playerId] = {
        socket,
        board: createEmptyBoard(),
        shipsRemaining: shipTypes.length,
        ready: false
    };

    if (!currentTurn) {
        currentTurn = playerId; // Define el primer jugador conectado como el primero en tener el turno.
    }
};


function switchTurn() {
    let playerIds = Object.keys(players);
    let currentIndex = playerIds.indexOf(currentTurn);
    currentTurn = playerIds[(currentIndex + 1) % playerIds.length];
    players[currentTurn].socket.send(JSON.stringify({ type: 'your_turn' }));
}

/*
const isShipSunk = (board, row, col) => {
    for (let i = 0; i < shipTypes.length; i++) {
        let shipSize = shipTypes[i].size;
        for (let j = 0; j < shipSize; j++) {
            if (board[row][col] === 1) return false;
        }
    }
    return true;
};*/

function processShot(shooterId, targetId, row, col) {
    const board = players[targetId].board;
    const shooter = players[shooterId];

    if (board[row][col] === 1) {
        board[row][col] = -1;
        shooter.points = (shooter.points || 0) + 1;
        shooter.socket.send(JSON.stringify({ type: 'update_points', points: shooter.points }));
        if (checkIfOpponentSunkAllShips(targetId)) {
            players[shooterId].socket.send(JSON.stringify({ type: 'game_over', winner: shooterId }));
            players[targetId].socket.send(JSON.stringify({ type: 'game_over', winner: shooterId }));
            return { row, col, result: 'game_over' };
        }
        return { row, col, result: 'hit' };
    } else if (board[row][col] === 0) {
        board[row][col] = -2;
        return { row, col, result: 'miss' };
    } else {
        return { row, col, result: 'already_shot' };
    }
}


// Función para verificar si todos los barcos del oponente han sido hundidos
function checkIfOpponentSunkAllShips(targetId) {
    const board = players[targetId].board;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            if (board[row][col] === 1) {
                return false; // Aún hay barcos por acertar
            }
        }
    }
    return true; // Todos los barcos del oponente han sido hundidos
}



server.on('connection', (socket) => {
    if (numPlayers >= maxPlayers) {
        console.log("Número máximo de jugadores alcanzado.");
        socket.close(1000, "Número máximo de jugadores alcanzado.");
        return;
    }

    numPlayers++;
    const playerId = `player-${numPlayers}`;
    console.log(`Nuevo jugador conectado: ${playerId}`);

    players[playerId] = {
        socket,
        board: createEmptyBoard(),
        ready: false,
        points: 0
    };

    socket.send(JSON.stringify({ type: 'welcome', playerId: playerId }));

    // Si es el jugador 1, permite que seleccione el número de jugadores y se lo envíe a los demás
    if (playerId === 'player-1') {
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'playerCount') {
                    const selectedPlayerCount = data.count;
                    // Enviar la cantidad de jugadores a todos
                    Object.values(players).forEach(player => {
                        player.socket.send(JSON.stringify({ type: 'playerCount', count: selectedPlayerCount }));
                    });

                    // Iniciar el juego solo después de que todos los jugadores estén listos
                    checkAllPlayersReady(selectedPlayerCount);
                }
            } catch (error) {
                console.error("Error processing player count:", error);
            }
        });
    }   
 
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
    
            // Procesar la configuración completa de los barcos
            if (data.type === 'setup_complete') {
                // Verifica si el jugador existe en la lista
                if (players[data.playerId]) {
                    players[data.playerId].board = data.board;  // Actualiza el tablero del jugador
                    players[data.playerId].ready = true;  // Marca al jugador como listo
    
                    // Verificar si todos los jugadores están listos para iniciar el juego
                    if (Object.keys(players).every(id => players[id].ready)) {
                        // Enviar el número de jugadores y los tableros de todos los jugadores
                        Object.values(players).forEach(player => {
                            console.log('Enviando tableros de todos los jugadores:', Object.values(players).map(p => p.board));
                            player.socket.send(JSON.stringify({
                                type: 'game_start',
                                playerCount: Object.keys(players).length,
                                boards: Object.values(players).map(p => p.board)  // Enviar todos los tableros
                            }));
                        });
    
                        // Mostrar los tableros de los demás jugadores al jugador actual
                        Object.values(players).forEach(player => {
                            if (player.socket !== socket) {
                                // Llamar a la función para crear los tableros de los enemigos
                                player.socket.send(JSON.stringify({
                                    type: 'opponent_boards',
                                    boards: Object.values(players).map(p => p.board),
                                }));
                            }
                        });
    
                        switchTurn(); // Iniciar el juego con el primer turno
                    }
                } else {
                    console.error('Player not found:', data.playerId); // Error si el jugador no existe
                }
                return;
            }
    
            // Evitar procesar acciones si no es el turno del jugador
            if (currentTurn !== data.playerId) return;
    
            // Manejar las acciones del juego según el tipo de mensaje
            handleGameActions(data, data.playerId);
    
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });
    

    function createEmptyBoard() {
        return Array(10).fill(null).map(() => Array(10).fill(0));
    }

    function handleGameActions(data, playerId) {
        const opponentId = Object.keys(players).find(id => id !== playerId);
        if (!opponentId) return;
    
        switch (data.type) {
            case 'shoot':
                const result = processShot(playerId, opponentId, data.row, data.col);
                players[playerId].socket.send(JSON.stringify({ type: 'shoot_response', ...result }));
                players[opponentId].socket.send(JSON.stringify({ type: 'opponent_shot', ...result }));
                if (result.result !== 'hit') {
                    switchTurn();
                }
                break;
            case 'use_sonar':
                handleSonarUse(playerId, players);
                break;
            case 'use_attack_planes':
                handleAttackPlanes(playerId, players);
                break;
            case 'use_cruise_missile':
                handleCruiseMissile(playerId, players);
                break;
            case 'use_defensive_shield':
                handleDefensiveShield(playerId, players);
                break;
            case 'use_mine':
                handlePlantMine(playerId, players);
                break;
            case 'attack_mine':
                handleMineHit(data.row, data.col, playerId, players);
                break;
            default:
                console.log(`Tipo de mensaje no reconocido: ${data.type}`);
                break;
        }
    }

    
    socket.on('close', () => {
        console.log(`Jugador ${playerId} desconectado`);
        delete players[playerId];
        numPlayers--;  // Decrementa el contador de jugadores al desconectarse
        if (Object.keys(players).length === 0) {
            currentTurn = null;  // Resetea el turno si todos los jugadores se han desconectado
        }
    });
});
    
function resetGame() {
    console.log("Resetting game");
    players = {};
    numPlayers = 0;
    currentTurn = null;
}

function startGame() {
    Object.values(players).forEach(player => {
        player.socket.send(JSON.stringify({ type: 'game_start' }));
    });
    currentTurn = `player-1`; // Comienza el juego con el primer jugador
    switchTurn();
}

function checkAllPlayersReady() {
    return Object.values(players).every(player => player.ready) && Object.keys(players).length === maxPlayers;
}