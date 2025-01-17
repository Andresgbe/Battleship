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

    if (data.type === 'welcome') {
        playerId = data.playerId;
        console.log(`Tu ID de jugador es: ${playerId}`);
    } else if (data.type === 'game_start') {
        document.getElementById('turn-info').textContent = "¡El juego ha comenzado!";
    } else if (data.type === 'turn') {
        myTurn = data.playerId === playerId;
        document.getElementById('turn-info').textContent = myTurn ? "Tu turno" : "Turno del oponente";
    } else if (data.type === 'shoot_response') {
        updateBoard('enemy-board', data.row, data.col, data.result);
    } else if (data.type === 'opponent_shot') {
        updateBoard('player-board', data.row, data.col, data.result);
    }
});

// 🔹 MODIFICACIÓN: Deshabilitar el botón hasta que los 5 barcos sean colocados
document.getElementById('confirm-setup').disabled = true;

function checkShipsPlacement() {
    if (placedShips.size === 5) {
        document.getElementById('confirm-setup').disabled = false; // Habilitar el botón
    } else {
        document.getElementById('confirm-setup').disabled = true; // Mantener deshabilitado si faltan barcos
    }
}

document.getElementById('confirm-setup').addEventListener('click', () => {
    if (placedShips.size < 5) {
        alert("Debes colocar todos los barcos antes de confirmar.");
        return;
    }
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
        checkShipsPlacement(); // 🔹 Verificar si se deben habilitar los botones después de colocar un barco
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
        cell.style.backgroundColor = 'red';
    } else if (result === 'miss') {
        cell.style.backgroundColor = 'gray';
    } else if (result === 'sunk') {
        cell.style.backgroundColor = 'darkred';
    }
}

