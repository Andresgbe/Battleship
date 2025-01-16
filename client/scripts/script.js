const socket = new WebSocket('ws://localhost:8080');
let playerId = null;
let myTurn = false;
let board = Array(10).fill(null).map(() => Array(10).fill(0));
let selectedShipSize = 5;
let selectedOrientation = 'H';
let placedShips = new Set(); 

socket.addEventListener('open', () => {
    console.log('Conectado al servidor WebSocket');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Mensaje recibidoo:', data);

    if (data.type === 'welcome') {
        playerId = data.playerId;
        console.log(`Tu ID de jugador es: ${playerId}`);
    } else if (data.type === 'game_start') {
        document.getElementById('turn-info').textContent = "Comenzó!!!";
    } else if (data.type === 'turn') {
        myTurn = data.playerId === playerId;
        document.getElementById('turn-info').textContent = myTurn ? "Tu turno" : "Turno del oponente";
    } else if (data.type === 'shoot_response') {
        updateBoard('enemy-board', data.row, data.col, data.result);
    } else if (data.type === 'opponent_shot') {
        updateBoard('player-board', data.row, data.col, data.result);
    }
});

document.getElementById('confirm-setup').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'setup_complete', playerId, board }));
});

document.getElementById('ship-select').addEventListener('change', (event) => {
    selectedShipSize = parseInt(event.target.value);
    if (placedShips.has(selectedShipSize)) {
        alert("Este tipo de barco ya ha sido colocado.");
        return;
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
    if (placedShips.has(selectedShipSize)) {
        alert("Ya colocaste este barco, gay");
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (canPlaceShip(row, col)) {
        for (let i = 0; i < selectedShipSize; i++) {
            if (selectedOrientation === 'H') {
                board[row][col + i] = 1;
            } else {
                board[row + i][col] = 1;
            }
        }
        placedShips.add(selectedShipSize); 
        renderBoard();
    } else {
        console.log('No se puede colocar el barco aquí');
    }
}

function canPlaceShip(row, col) {
    for (let i = 0; i < selectedShipSize; i++) {
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
    socket.send(JSON.stringify({ type: 'shoot', playerId, row, col }));
    myTurn = false;
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

