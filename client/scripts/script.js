const socket = new WebSocket('ws://localhost:8080');
let playerId = null;
let myTurn = false;

// Evento al abrir la conexión
socket.addEventListener('open', () => {
    console.log('Conectado al servidor WebSocket');
});

// Evento al recibir mensajes del servidor
socket.addEventListener('message', (event) => {
    console.log('Mensaje recibido del servidor:', event.data);

    try {
        const data = JSON.parse(event.data);

        if (data.type === 'welcome') {
            playerId = data.playerId;
            console.log(`Tu ID de jugador es: ${playerId}`);
        } else if (data.type === 'turn') {
            myTurn = data.playerId === playerId;
            document.getElementById('turn-info').textContent = myTurn ? "Tu turno" : "Turno del oponente";
        } else if (data.type === 'shoot_response') {
            // Mostrar los disparos que hice en el tablero enemigo
            const enemyCell = document.querySelector(
                `#enemy-board .position[data-row="${data.row}"][data-col="${data.col}"]`
            );
            if (data.result === 'hit') {
                enemyCell.style.backgroundColor = 'red';
            } else if (data.result === 'miss') {
                enemyCell.style.backgroundColor = 'gray';
            } else if (data.result === 'sunk') {
                enemyCell.style.backgroundColor = 'darkred';
            }
        } else if (data.type === 'opponent_shot') {
            // Mostrar los disparos recibidos en mi tablero
            const playerCell = document.querySelector(
                `#player-board .position[data-row="${data.row}"][data-col="${data.col}"]`
            );
            if (data.result === 'hit') {
                playerCell.style.backgroundColor = 'red';
            } else if (data.result === 'miss') {
                playerCell.style.backgroundColor = 'gray';
            } else if (data.result === 'sunk') {
                playerCell.style.backgroundColor = 'darkred';
            }
        } else if (data.type === 'game_over') {
            alert(data.winner === playerId ? "¡Ganaste!" : "Perdiste");
        }
    } catch (error) {
        console.error('Error procesando el mensaje del servidor:', error.message);
    }
});

// Generar los tableros
document.addEventListener('DOMContentLoaded', () => {
    const playerBoard = document.getElementById('player-board');
    const enemyBoard = document.getElementById('enemy-board');

    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            // Crear tablero del jugador
            const playerCell = document.createElement('div');
            playerCell.className = 'position';
            playerCell.dataset.row = i;
            playerCell.dataset.col = j;
            playerBoard.appendChild(playerCell);

            // Crear tablero del enemigo
            const enemyCell = document.createElement('div');
            enemyCell.className = 'position';
            enemyCell.dataset.row = i;
            enemyCell.dataset.col = j;
            enemyBoard.appendChild(enemyCell);
        }
    }

    document.querySelectorAll('#enemy-board .position').forEach(cell => {
        cell.addEventListener('click', () => {
            if (!myTurn) {
                console.log("No es tu turno.");
                return;
            }
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            socket.send(JSON.stringify({ type: 'shoot', playerId, row, col }));
            myTurn = false; // Esperar la respuesta del servidor
        });
    });
});
