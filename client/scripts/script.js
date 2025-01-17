const socket = new WebSocket('ws://localhost:8080');
let playerId = null;
let myTurn = false;
let board = Array(10).fill(null).map(() => Array(10).fill(0));
let selectedShip = { name: "Portaaviones", size: 5 };
let selectedOrientation = 'H';
let placedShips = new Set(); // Mantiene un registro de los barcos colocados por nombre
let shotsFired = new Set(); // Registra los disparos realizados para evitar repetir

const shipTypes = [
    { name: "Portaaviones", size: 5 },
    { name: "Acorazado", size: 4 },
    { name: "Crucero", size: 3 },
    { name: "Submarino", size: 3 },
    { name: "Destructor", size: 2 }
];

socket.addEventListener('open', () => {
    console.log('Conectado al servidor WebSocket');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Mensaje recibido del servidor:', data);

    // Manejo de la bienvenida
    if (data.type === 'welcome') {
        playerId = data.playerId;
        console.log(`Tu ID de jugador es: ${playerId}`);
    } 
    // Manejo del inicio del juego
    else if (data.type === 'game_start') {
        document.getElementById('turn-info').textContent = "¡El juego ha comenzado!";
    } 
    // Manejo del turno
    else if (data.type === 'turn') {
        myTurn = data.playerId === playerId;
        document.getElementById('turn-info').textContent = myTurn ? "Tu turno" : "Turno del oponente";
    } 
    // Respuesta del disparo
    else if (data.type === 'shoot_response') {
        updateBoard('enemy-board', data.row, data.col, data.result);
    } 
    // Respuesta del disparo del oponente
    else if (data.type === 'opponent_shot') {
        updateBoard('player-board', data.row, data.col, data.result);
    }
    // Manejo del fin del juego
    else if (data.type === 'game_over') {
        alert(`¡Juego terminado! El ganador es ${data.winner}`);
        disableBoard(); // Deshabilitar el tablero para evitar más disparos
    }
    // Manejo de la actualización de puntos
    else if (data.type === 'update_points') {
        // Actualizamos el puntaje mostrado en la interfaz
        document.getElementById('player-points').textContent = `Puntos: ${data.points}`;
    }
});



// Función para deshabilitar las interacciones con el tablero
function disableBoard() {
    const cells = document.querySelectorAll('.position');
    cells.forEach(cell => {
        cell.removeEventListener('click', placeShip); // Deshabilita la colocación de barcos
        cell.removeEventListener('click', handleShot); // Deshabilita los disparos
        cell.style.pointerEvents = 'none'; // Desactiva los clics
    });
}

document.getElementById('confirm-setup').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'setup_complete', playerId, board }));
});

document.getElementById('ship-select').addEventListener('change', (event) => {
    const selectedShipName = event.target.options[event.target.selectedIndex].text.split(" ")[0]; 
    selectedShip = shipTypes.find(ship => ship.name === selectedShipName);

    if (!selectedShip) {
        console.error("Error: No se encontró el barco seleccionado.");
        return;
    }

    if (placedShips.has(selectedShip.name)) {
        alert("Este tipo de barco ya ha sido colocado.");
        selectedShip = null;
    }
});

document.getElementById('orientation').addEventListener('change', (event) => {
    selectedOrientation = event.target.value;
});

document.addEventListener('DOMContentLoaded', () => {
    createBoard('player-board', false);
    createBoard('enemy-board', true);
});

function createBoard(boardId, isEnemy = false) {
    const boardElement = document.getElementById(boardId);
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'position';
            cell.dataset.row = i;
            cell.dataset.col = j;
            if (!isEnemy) {
                cell.addEventListener('click', placeShip);
            } else {
                cell.addEventListener('click', handleShot);
            }
            boardElement.appendChild(cell);
        }
    }
}

function placeShip(event) {
    if (!selectedShip || placedShips.has(selectedShip.name)) {
        alert("Este tipo de barco ya ha sido colocado.");
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (canPlaceShip(row, col)) {
        for (let i = 0; i < selectedShip.size; i++) {
            if (selectedOrientation === 'H') {
                board[row][col + i] = 1;
            } else {
                board[row + i][col] = 1;
            }
        }
        placedShips.add(selectedShip.name);
        renderBoard();
    } else {
        console.log('No se puede colocar el barco aquí');
    }
}

function canPlaceShip(row, col) {
    for (let i = 0; i < selectedShip.size; i++) {
        if (selectedOrientation === 'H') {
            if (col + i >= 10 || board[row][col + i] !== 0) return false;
        } else {
            if (row + i >= 10 || board[row + i][col] !== 0) return false;
        }
    }
    return true;
}

function renderBoard() {
    const playerBoard = document.getElementById('player-board');
    playerBoard.innerHTML = '';
    createBoard('player-board', false);
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (board[i][j] === 1) {
                const cell = document.querySelector(`#player-board .position[data-row='${i}'][data-col='${j}']`);
                cell.style.backgroundColor = 'blue';
            }
        }
    }
}

function handleShot(event) {
    if (!myTurn) {
        console.log("No es tu turno.");
        return;
    }
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const shotKey = `${row},${col}`;
    
    if (shotsFired.has(shotKey)) {
        console.log("Ya has disparado en esta casilla.");
        return;
    }
    
    shotsFired.add(shotKey);
    socket.send(JSON.stringify({ type: 'shoot', playerId, row, col }));
}

function updateBoard(boardId, row, col, result) {
    const cell = document.querySelector(`#${boardId} .position[data-row='${row}'][data-col='${col}']`);
    if (result === 'hit') {
        cell.style.backgroundColor = 'red';  // Cambio de color a rojo cuando se acierta
    } else if (result === 'miss') {
        cell.style.backgroundColor = 'gray'; // Cambio de color a gris cuando se falla
    }
    // Aquí ya no necesitamos manejar "sunk"
}

