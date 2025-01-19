const socket = new WebSocket('ws://localhost:8080');
let playerId = null;
let myTurn = false;
let totalPlayers = 0;
let board = Array(10).fill(null).map(() => Array(10).fill(0));
let selectedShip = { name: "Portaaviones", size: 5 };
let selectedOrientation = 'H';
let placedShips = new Set(); // Mantiene un registro de los barcos colocados por nombre
let shotsFired = new Set(); // Registra los disparos realizados para evitar repetir
let playerPoints = 0; // Declarar la variable de los puntos aquí, al inicio


const shipTypes = [
    { name: "Portaaviones", size: 5 },
    { name: "Acorazado", size: 4 },
    { name: "Crucero", size: 3 },
    { name: "Submarino", size: 3 },
    { name: "Destructor", size: 2 }
];

function startGame() {
  const selectedPlayerCount = document.getElementById('player-count').value;
  totalPlayers = selectedPlayerCount;

  // Enviar el número de jugadores al servidor
  socket.send(JSON.stringify({
    type: 'playerCount',
    count: totalPlayers,
  }));

  // Ocultar la sección de configuración y mostrar el tablero
  document.getElementById('player-setup').style.display = 'none';
  document.getElementById('turn-info').textContent = 'Esperando que los jugadores se conecten...';
}

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar los tableros de los jugadores
  createBoard('player-board', false); // Tablero del jugador
  createBoard('enemy-board', true);   // Tablero del enemigo
});

function isSubmarineIntact() {
    // Verificar si el submarino está en el tablero
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            if (board[row][col] === 1) { // Si encontramos parte de un barco
                if (isSubmarinePosition(row, col)) {  // Verificar si es parte del submarino
                    return true;
                }
            }
        }
    }
    return false; // El submarino no está intacto
}

// Verifica si una casilla está ocupada por el submarino (tamaño 3)
function isSubmarinePosition(row, col) {
    // Implementa lógica para verificar si esta casilla forma parte del submarino
    // Esto puede incluir verificar el tamaño del barco y la orientación.
    return shipTypes.some(ship => ship.name === 'Submarino');
}


function useSonar() {
    if (myTurn && playerPoints >= 5) {
        // Verificar si el submarino está intacto
        if (!isSubmarineIntact()) {
            alert("El submarino ha sido hundido. No puedes usar el sonar.");
            return;
        }
        // Enviar al servidor para activar el sonar
        socket.send(JSON.stringify({ type: 'use_sonar', playerId: playerId }));
    } else {
        alert("No tienes suficientes puntos o no es tu turno.");
    }
}

function useAttackPlanes() {
    console.log("Usando Aviones de Ataque...");
    if (myTurn && playerPoints >= 10) {
        // Enviar al servidor para activar los aviones de ataque
        socket.send(JSON.stringify({ type: 'use_attack_planes', playerId: playerId }));
    } else {
        alert("No tienes suficientes puntos o no es tu turno.");
    }
}

function useCruiseMissile() {
  if (myTurn && playerPoints >= 15) {
      // Verificar si se puede usar el misil crucero
      socket.send(JSON.stringify({ type: 'use_cruise_missile', playerId: playerId }));
  } else {
      alert("No tienes suficientes puntos o no es tu turno.");
  }
}

function useDefensiveShield() {
    if (myTurn && playerPoints >= 15) {
        // Enviar al servidor para activar el escudo defensivo
        socket.send(JSON.stringify({ type: 'use_defensive_shield', playerId: playerId }));
    } else {
        alert("No tienes suficientes puntos o no es tu turno.");
    }
}


function useMine() {
    if (myTurn && playerPoints >= 5) {
        // Enviar al servidor para plantar la mina
        socket.send(JSON.stringify({ type: 'use_mine', playerId: playerId }));
    } else {
        alert("No tienes suficientes puntos o no es tu turno.");
    }
}


socket.addEventListener('open', () => {
  console.log('Conectado al servidor WebSocket');
  socket.send(JSON.stringify({ type: 'get_player_id' }));  // Solicitar el ID
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Mensaje recibido del servidor:', data);

  switch (data.type) {
    case 'welcome':
      playerId = data.playerId; // Asegúrate de que esto se establece correctamente
      console.log(`playerId establecido: ${playerId}`);
    break;

    case 'startGame':
      totalPlayers = data.playerCount;
      document.getElementById('turn-info').textContent = `¡El juego ha comenzado! Jugadores conectados: ${totalPlayers}`;
      startGameLogic();
      break;
      
    case 'startGame':
      totalPlayers = data.playerCount;
      document.getElementById('turn-info').textContent = `¡El juego ha comenzado! Jugadores conectados: ${totalPlayers}`;
      startGameLogic();
      break;

    case 'turn':
      myTurn = data.playerId === playerId;
      document.getElementById('turn-info').textContent = myTurn ? "Tu turno" : "Turno del oponente";
      break;

    case 'shoot_response':
      updateBoard('enemy-board', data.row, data.col, data.result);
      break;

    case 'opponent_shot':
      updateBoard('player-board', data.row, data.col, data.result);
      break;

    case 'opponent_board':
      playersBoards[data.playerId] = data.board;
      displayOpponentBoards();
      break;

    case 'game_over':
      alert(`¡Juego terminado! El ganador es ${data.winner}`);
      disableBoard();
      break;


    case 'update_points':
      // Actualizamos el puntaje mostrado en la interfaz
      document.getElementById('player-points').textContent = `Puntos: ${data.points}`;
      playerPoints = data.points; // Actualizar la variable de puntos
      break;

    case 'sonar_result':
      alert(`Sonar revela: Barco enemigo en [${data.row}, ${data.col}]`);
      const sonarCell = document.querySelector(`#enemy-board .position[data-row='${data.row}'][data-col='${data.col}']`);
      if (sonarCell) {
        sonarCell.style.backgroundColor = 'yellow';  // Resaltar la casilla revelada
      }
      break;

    case 'attack_planes_result':
      alert(`Aviones de Ataque: Resultados: ${JSON.stringify(data.missiles)}`);
      data.missiles.forEach(missile => {
        const missileCell = document.querySelector(`#enemy-board .position[data-row='${missile.row}'][data-col='${missile.col}']`);
        if (missileCell) {
          missileCell.style.backgroundColor = missile.result === 'hit' ? 'red' : 'gray';
        }
      });
      break;

    case 'defensive_shield':
      alert(`Escudo defensivo activado en la región [${data.row}, ${data.col}]`);
      // Aquí puedes añadir lógica para resaltar la región 3x3 protegida
      break;

    case 'cruise_missile_result':
      alert(`Misil Crucero: Resultados: ${JSON.stringify(data.missiles)}`);
      data.missiles.forEach(missile => {
        const missileCell = document.querySelector(`#enemy-board .position[data-row='${missile.row}'][data-col='${missile.col}']`);
        if (missileCell) {
          missileCell.style.backgroundColor = missile.result === 'hit' ? 'red' : 'gray';
        }
      });
      break;

    case 'shield_expired':
      alert("El escudo defensivo ha expirado.");
      // Aquí puedes añadir lógica para restaurar el estado de las casillas
      break;

    case 'defensive_shield_enemy':
      alert(`El enemigo ha activado un escudo defensivo en la región [${data.row}, ${data.col}]`);
      break;

    case 'mine_planted':
      alert(`Mina plantada en [${data.row}, ${data.col}]`);
      const mineCell = document.querySelector(`#player-board .position[data-row='${data.row}'][data-col='${data.col}']`);
      if (mineCell) {
        mineCell.style.backgroundColor = 'purple';  // Resaltar la mina con color
      }
      break;

    case 'mine_hit_success':
      alert(`¡La mina explotó en [${data.row}, ${data.col}]!`);
      break;

    case 'mine_hit':
      alert(`¡Mina enemiga golpeada en [${data.row}, ${data.col}]!`);
      const hitMineCell = document.querySelector(`#player-board .position[data-row='${data.row}'][data-col='${data.col}']`);
      if (hitMineCell) {
        hitMineCell.style.backgroundColor = 'red';  // Resaltar el golpe adicional
      }
      break;

    default:
      console.log(`Tipo de mensaje no reconocido: ${data.type}`);
      break;
      
  }
});

// Función para crear y mostrar todos los tableros de los jugadores (incluyendo el propio)
function displayOpponentBoards() {
  const opponentBoardsContainer = document.getElementById('opponent-boards');
  opponentBoardsContainer.innerHTML = ''; // Limpiar el contenedor de tableros de oponentes

  const currentPlayerId = playerId;

  Object.keys(playersBoards).forEach(playerId => {
    if (playerId !== currentPlayerId) {  // Asegurarnos de que no estamos mostrando el tablero del jugador actual
      const boardDiv = document.createElement('div');
      boardDiv.classList.add('opponent-board-container');
      const title = document.createElement('h4');
      title.textContent = `Tablero de ${playerId}`;
      boardDiv.appendChild(title);

      const boardElement = document.createElement('div');
      boardElement.classList.add('board');
      boardDiv.appendChild(boardElement);

      // Llenar el tablero con las casillas correspondientes
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const cell = document.createElement('div');
          cell.className = 'position';
          cell.dataset.row = i;
          cell.dataset.col = j;
          if (playersBoards[playerId][i][j] === 1) {
            cell.style.backgroundColor = 'blue'; // Mostrar los barcos en azul
          }
          boardElement.appendChild(cell);
        }
      }

      opponentBoardsContainer.appendChild(boardDiv);
    }
  });
}

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
  if (playerId) { // Asegurarse de que playerId no es null
      socket.send(JSON.stringify({ type: 'setup_complete', playerId, board }));
  } else {
      console.error('playerId no ha sido definido');
  }
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




function createBoard(boardId, isEnemy = false) {
  const boardElement = document.getElementById(boardId);

  // Verificar si el elemento existe en el DOM
  if (!boardElement) {
    console.error(`El contenedor con ID '${boardId}' no se encontró en el DOM.`);
    return; // Salir de la función si el contenedor no existe
  }

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

  const cell = document.querySelector(`#enemy-board .position[data-row='${row}'][data-col='${col}']`);

  // Verifica si la casilla contiene una mina (no debería ser tratada como ya disparada)
  if (cell && cell.getAttribute('data-mine') === 'true') {
    socket.send(JSON.stringify({ type: 'attack_mine', playerId: playerId, row: row, col: col }));
  } else {
    // Verificar si ya se disparó en esta casilla
    if (shotsFired.has(shotKey)) {
      console.log("Ya has disparado en esta casilla.");
      return;
    }

    shotsFired.add(shotKey);  // Marca esta casilla como disparada
    socket.send(JSON.stringify({ type: 'shoot', playerId: playerId, row: row, col: col }));
  }
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
