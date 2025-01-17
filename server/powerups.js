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

module.exports = {
    handleSonarUse
};
