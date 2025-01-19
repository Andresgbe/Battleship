const WebSocket = require('ws');
const { handleSonarUse } = require('./powerups');
const { handleAttackPlanes } = require('./powerups');  // Asegúrate de importar la función correctamente
const { handlePlantMine, handleMineHit } = require('./powerups');  // Asegúrate de importar las funciones necesarias
const { handleDefensiveShield } = require('./powerups');  // Asegúrate de importar correctamente
const { handleCruiseMissile } = require('./powerups');  // Asegúrate de importar la función


let numPlayers = 0;  // Contador de jugadores conectados
const maxPlayers = 4;  // Número máximo de jugadores



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
        currentTurn = playerId; // Define el primer jugador conectado como el primero en tener el turno.
    }
};


function switchTurn() {
    const playerIds = Object.keys(players);
    let index = playerIds.indexOf(currentTurn);
    index = (index + 1) % playerIds.length;
    currentTurn = playerIds[index];
    playerIds.forEach(id => {
        players[id].socket.send(JSON.stringify({ type: 'turn', playerId: currentTurn }));
    });
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
    // Paso 2: Comprobar el límite de jugadores
    if (numPlayers >= maxPlayers) {
        console.log("Número máximo de jugadores alcanzado.");
        socket.close(1000, "Número máximo de jugadores alcanzado.");
        return;
    }

    // Incrementa el contador de jugadores
    numPlayers++;
    const playerId = `player-${numPlayers}`;  // Asigna un ID único basado en el número de jugador

    // Paso 3: Configura el jugador
    players[playerId] = {
        socket: socket,
        board: createEmptyBoard(), // Asegúrate de que esta función esté definida correctamente
        ready: false
    };
    console.log(`Nuevo jugador conectado: ${playerId}`);
    socket.send(JSON.stringify({ type: 'welcome', playerId }));

    // Manejo de mensajes del jugador
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
                return;
            }

            if (!currentTurn || currentTurn !== data.playerId) return;

            handleMessageType(data, playerId);
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });


    function createEmptyBoard() {
        return Array(10).fill(null).map(() => Array(10).fill(0));
    }

    function handleMessageType(data, playerId) {
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
    
    
      
