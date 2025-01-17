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
        player.points -= 5; // Restar los puntos
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));

        // Pedir al jugador que elija una casilla para plantar la mina
        let row, col;

        // Asegurarse de que la casilla esté vacía
        let validPlacement = false;
        while (!validPlacement) {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);

            // Verificar si la casilla está vacía (sin barco)
            if (player.board[row][col] === 0) {
                validPlacement = true;
            }
        }

        // Plantar la mina en el tablero (usamos 'M' para mina)
        player.board[row][col] = 'M';

        // Enviar la ubicación de la mina al jugador
        player.socket.send(JSON.stringify({
            type: 'mine_planted',
            row: row,
            col: col
        }));

        // También se puede enviar esta información al oponente
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

// Función para manejar el ataque a la mina
const handleMineHit = (row, col, playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si la casilla atacada es una mina
    if (opponentBoard[row][col] === 'M') {
        // Marca la mina como explotada
        opponentBoard[row][col] = -2;

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

// Función para obtener una casilla adyacente aleatoria
const getRandomAdjacentCell = (row, col) => {
    const adjacentCells = [
        { row: row - 1, col: col },  // Arriba
        { row: row + 1, col: col },  // Abajo
        { row: row, col: col - 1 },  // Izquierda
        { row: row, col: col + 1 },  // Derecha
    ];

    // Filtrar las celdas válidas dentro del tablero
    const validCells = adjacentCells.filter(cell => 
        cell.row >= 0 && cell.row < 10 && cell.col >= 0 && cell.col < 10
    );

    if (validCells.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * validCells.length);
    return validCells[randomIndex];
};

// Función para manejar el uso del Escudo Defensivo
const handleDefensiveShield = (playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si el jugador tiene suficientes puntos
    if (player.points >= 15) {
        player.points -= 15; // Resta los puntos
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));

        // Elegir una región 3x3 al azar para proteger
        const shieldRow = Math.floor(Math.random() * 8);  // Asegurarse de que sea un lugar válido
        const shieldCol = Math.floor(Math.random() * 8);  // Asegurarse de que sea un lugar válido

        // Marca la región 3x3 en el tablero del oponente como protegida
        for (let i = shieldRow; i < shieldRow + 3; i++) {
            for (let j = shieldCol; j < shieldCol + 3; j++) {
                opponentBoard[i][j] = 'S'; // 'S' marca la casilla como protegida
            }
        }

        // Enviar la ubicación del escudo al jugador y al oponente
        player.socket.send(JSON.stringify({
            type: 'defensive_shield',
            row: shieldRow,
            col: shieldCol
        }));

        players[opponentId].socket.send(JSON.stringify({
            type: 'defensive_shield_enemy',
            row: shieldRow,
            col: shieldCol
        }));

        // Marcar que el escudo estará activo durante 3 turnos
        setTimeout(() => {
            // Desactivar el escudo después de 3 turnos (simulado como 30 segundos)
            for (let i = shieldRow; i < shieldRow + 3; i++) {
                for (let j = shieldCol; j < shieldCol + 3; j++) {
                    opponentBoard[i][j] = 0; // Restaurar el estado a normal
                }
            }

            // Notificar al jugador y oponente que el escudo ha expirado
            player.socket.send(JSON.stringify({ type: 'shield_expired' }));
            players[opponentId].socket.send(JSON.stringify({ type: 'shield_expired_enemy' }));
        }, 30000); // Desactivar el escudo después de 30 segundos (simulación)
    } else {
        player.socket.send(JSON.stringify({ type: 'shield_error', message: 'No tienes suficientes puntos.' }));
    }
};

// Función para manejar el uso del Misil Crucero
const handleCruiseMissile = (playerId, players) => {
    const player = players[playerId];
    const opponentId = Object.keys(players).find(id => id !== playerId);
    const opponentBoard = players[opponentId].board;

    // Verificar si el jugador tiene suficientes puntos
    if (player.points >= 15) {
        player.points -= 15; // Resta los puntos
        player.socket.send(JSON.stringify({ type: 'update_points', points: player.points }));

        // Elegir una región 3x3 al azar para atacar
        const missileRow = Math.floor(Math.random() * 8);  // Asegurarse de que sea un lugar válido
        const missileCol = Math.floor(Math.random() * 8);  // Asegurarse de que sea un lugar válido

        const missileResults = [];

        // Marcar las casillas 3x3 como atacadas
        for (let i = missileRow; i < missileRow + 3; i++) {
            for (let j = missileCol; j < missileCol + 3; j++) {
                if (opponentBoard[i][j] === 1) {
                    opponentBoard[i][j] = -1;  // Marca como tocada
                    missileResults.push({ row: i, col: j, result: 'hit' });
                } else {
                    missileResults.push({ row: i, col: j, result: 'miss' });
                }
            }
        }

        // Enviar los resultados al jugador
        player.socket.send(JSON.stringify({ type: 'cruise_missile_result', missiles: missileResults }));

        // Enviar los resultados al oponente
        players[opponentId].socket.send(JSON.stringify({ type: 'cruise_missile_enemy', missiles: missileResults }));
    } else {
        player.socket.send(JSON.stringify({ type: 'cruise_missile_error', message: 'No tienes suficientes puntos.' }));
    }
};


module.exports = {
    handleSonarUse,
    handleAttackPlanes,
    handlePlantMine,
    handleMineHit,
    handleDefensiveShield,
    handleCruiseMissile
};