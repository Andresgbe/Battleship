const socket = new WebSocket('ws://localhost:8080');
let playerId = null;
let myTurn = false;
let board = Array(10).fill(null).map(() => Array(10).fill(0));

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

document.getElementById('confirm-setup').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'setup_complete', playerId, board }));
});

document.addEventListener('DOMContentLoaded', () => {
    createBoard('player-board');
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
            if (isEnemy) {
                cell.addEventListener('click', handleShot);
            }
            boardElement.appendChild(cell);
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