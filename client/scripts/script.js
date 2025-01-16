const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', () => {
    console.log('Conectado al servidor WebSocket');
    socket.send('Hola desde el cliente');
});

socket.addEventListener('message', (event) => {
    console.log('Mensaje recibido del servidor:', event.data);
});

socket.addEventListener('close', () => {
    console.log('Conexión cerrada');
});

socket.addEventListener('error', (error) => {
    console.error('Error en el WebSocket:', error);
});

document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('player-board');

    // Generar las celdas del tablero
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'position';
            cell.dataset.row = i;
            cell.dataset.col = j;
            board.appendChild(cell);
        }
    }

    // Escuchar clics en cada celda
    const cells = document.querySelectorAll('.position');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const row = cell.dataset.row;
            const col = cell.dataset.col;
            console.log(`Disparo en la posición: (${row}, ${col})`);
            cell.style.backgroundColor = 'red'; // Cambia según el estado del disparo
        });
    });
});

