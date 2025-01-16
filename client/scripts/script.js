const socket = new WebSocket('ws://localhost:8080');

// Evento al abrir la conexión
socket.addEventListener('open', () => {
    console.log('Conectado al servidor WebSocket');
});

// Evento al recibir mensajes del servidor
socket.addEventListener('message', (event) => {
    console.log('Mensaje recibido del servidor (crudo):', event.data);

    try {
        const data = JSON.parse(event.data);
        console.log('Mensaje recibido del servidor (JSON):', data);

        if (data.type === 'shoot_response') {
            const cell = document.querySelector(
                `.position[data-row="${data.row}"][data-col="${data.col}"]`
            );

            if (!cell) {
                console.warn(`No se encontró la celda en (${data.row}, ${data.col})`);
                return;
            }

            if (data.result === 'hit') {
                cell.style.backgroundColor = 'red';
            } else if (data.result === 'miss') {
                cell.style.backgroundColor = 'gray';
            } else if (data.result === 'sunk') {
                cell.style.backgroundColor = 'darkred';
            }

            console.log(`Disparo en (${data.row}, ${data.col}): ${data.result}`);
        } else if (data.type === 'error') {
            console.error(`Error recibido del servidor: ${data.message}`);
        }
    } catch (error) {
        console.error('Error procesando el mensaje del servidor:', error.message);
    }
});

// Evento al cerrar la conexión
socket.addEventListener('close', () => {
    console.log('Conexión cerrada');
});

// Evento al ocurrir un error
socket.addEventListener('error', (error) => {
    console.error('Error en el WebSocket:', error);
});

// Lógica para generar el tablero y manejar los disparos
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('player-board');

    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'position';
            cell.dataset.row = i;
            cell.dataset.col = j;
            board.appendChild(cell);
        }
    }

    const cells = document.querySelectorAll('.position');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            if (cell.classList.contains('clicked')) {
                console.log('Ya disparaste en esta posición.');
                return;
            }

            cell.classList.add('clicked');
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            console.log(`Disparo en la posición: (${row}, ${col})`);
            socket.send(JSON.stringify({ type: 'shoot', row, col }));
        });
    });
});
