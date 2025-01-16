const WebSocket = require('ws'); // Esto inicializa el módulo WebSocket para Node.js

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);

server.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    
    // Manejar mensajes recibidos del cliente
    socket.on('message', (message) => {
        console.log(`Mensaje recibido del cliente: ${message}`);
        // Enviar respuesta al cliente
        socket.send(`Servidor recibió: ${message}`);
    });

    // Manejar la desconexión del cliente
    socket.on('close', () => {
        console.log('Cliente desconectado');
    });
});

