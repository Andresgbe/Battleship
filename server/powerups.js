// Función para manejar el uso del sonar
const handleSonarUse = (playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si el submarino está intacto
    const submarinePosition = findSubmarinePosition(playerId, players);
    if (!submarinePosition) {
        player.socket.send(JSON.stringify({ type: 'sonar_error', message: 'El submarino ya ha sido hundido.' }));
        return;
    }

    // Elegir una casilla al azar que tenga un barco (valor 1)
    const randomHit = getRandomShipPosition(opponentBoard);
    if (!randomHit) {
        player.socket.send(JSON.stringify({ type: 'sonar_error', message: 'No se encontraron barcos.' }));
        return;
    }

    // Restar puntos por el uso de Sonar
    if (player.points >= 5) {
        player.points -= 5;
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));
    } else {
        player.socket.send(JSON.stringify({ type: 'sonar_error', message: 'No tienes suficientes puntos.' }));
        return;
    }

    // Enviar la casilla revelada
    player.socket.send(JSON.stringify({
        type: 'sonar_result',
        row: randomHit.row,
        col: randomHit.col
    }));

    // También puedes enviar esta información al oponente si deseas mostrar que el sonar fue utilizado
    players[opponentId].socket.send(JSON.stringify({
        type: 'sonar_used',
        row: randomHit.row,
        col: randomHit.col
    }));
};

// Función para encontrar el submarino del jugador
const findSubmarinePosition = (playerId, players) => {
    const board = players[playerId].board;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            if (board[row][col] === 1) { // Casilla con barco intacto
                return { row, col }; // Retorna la posición si el submarino está intacto
            }
        }
    }
    return null; // Retorna null si no encuentra el submarino intacto
};

// Función para obtener una posición aleatoria de un barco del oponente
const getRandomShipPosition = (board) => {
    const shipPositions = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            if (board[row][col] === 1) { // Casilla con parte de un barco
                shipPositions.push({ row, col });
            }
        }
    }
    if (shipPositions.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * shipPositions.length);
    return shipPositions[randomIndex]; // Selecciona una casilla aleatoria
};



// Función para manejar el uso de los Aviones de Ataque
const handleAttackPlanes = (playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si el portaaviones está intacto
    if (!isAircraftCarrierIntact(playerId, players)) {
        player.socket.send(JSON.stringify({ type: 'attack_planes_error', message: 'El portaaviones ha sido hundido.' }));
        return;
    }

    // Verificar si el jugador tiene suficientes puntos
    if (player.points >= 10) {
        player.points -= 10; // Resta los puntos
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));

        // Lanzar hasta 5 misiles al azar
        const missileResults = launchMissiles(opponentBoard);

        // Enviar los resultados al jugador
        player.socket.send(JSON.stringify({ type: 'attack_planes_result', missiles: missileResults }));
        players[opponentId].socket.send(JSON.stringify({ type: 'attack_planes_enemy', missiles: missileResults }));
    } else {
        player.socket.send(JSON.stringify({ type: 'attack_planes_error', message: 'No tienes suficientes puntos.' }));
    }
};

// Función para verificar si el portaaviones está intacto
const isAircraftCarrierIntact = (playerId, players) => {
    const board = players[playerId].board;
    let isIntact = false;

    // Buscar el portaaviones en el tablero
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            if (board[row][col] === 1) { // Si encontramos una parte del barco
                isIntact = true;
                break;
            }
        }
    }

    return isIntact; // El portaaviones está intacto si hay alguna parte del barco
};

// Función para lanzar hasta 5 misiles al azar
const launchMissiles = (opponentBoard) => {
    const missileResults = [];
    let launched = 0;

    while (launched < 5) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);

        if (opponentBoard[row][col] === 1) { // Si la casilla tiene un barco
            opponentBoard[row][col] = -1; // Marca como tocada
            missileResults.push({ row, col, result: 'hit' });
        } else {
            missileResults.push({ row, col, result: 'miss' });
        }

        launched++;
    }

    return missileResults; // Devuelve los resultados de los misiles
};

// Función para manejar el uso de la Mina Marina
const handlePlantMine = (playerId, players) => {
    const player = players[playerId];

    // Verificar si el jugador tiene suficientes puntos
    if (player.points >= 5) {
        player.points -= 5; // Resta los puntos
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));

        // Pedir al jugador que elija una casilla para plantar la mina
        let row, col;

        // Asegurarse de que la casilla esté vacía
        let validPlacement = false;
        while (!validPlacement) {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);

            // Verificar si la casilla está vacía
            if (player.board[row][col] === 0) {
                validPlacement = true;
            }
        }

        // Plantar la mina en el tablero
        player.board[row][col] = 'M'; // 'M' representa una mina

        // Enviar la ubicación de la mina al jugador
        player.socket.send(JSON.stringify({
            type: 'mine_planted',
            row: row,
            col: col
        }));

        // También se puede enviar esta información al oponente si deseas
        const opponentId = Object.keys(players).find(id => id !== playerId);
        players[opponentId].socket.send(JSON.stringify({
            type: 'mine_planted_enemy',
            row: row,
            col: col
        }));
    } else {
        player.socket.send(JSON.stringify({ type: 'mine_error', message: 'No tienes suficientes puntos.' }));
    }
};

const handleMineHit = (row, col, playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si la casilla atacada es una mina
    if (opponentBoard[row][col] === 'M') {
        // Atacar la mina y restar puntos si es necesario
        opponentBoard[row][col] = -2; // Marca como mina explotada

        // Elegir una casilla adyacente para el "hit" adicional
        const adjacentCell = getRandomAdjacentCell(row, col);

        // Verificar si la casilla adyacente es válida
        if (adjacentCell) {
            const { row: adjRow, col: adjCol } = adjacentCell;
            opponentBoard[adjRow][adjCol] = -1; // Marca la casilla adyacente como tocada
            players[opponentId].socket.send(JSON.stringify({
                type: 'mine_hit',
                row: adjRow,
                col: adjCol
            }));
        }

        player.socket.send(JSON.stringify({
            type: 'mine_hit_success',
            row: row,
            col: col
        }));
    }
};



module.exports = {
    handleSonarUse,
    handleAttackPlanes,
    handlePlantMine,
    handleMineHit
};
