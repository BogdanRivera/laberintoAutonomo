let tiles = 30; 
let canvas = document.createElement('canvas');
let container = document.getElementById('maze-container');
container.appendChild(canvas);
canvas.setAttribute('width', '600');
canvas.setAttribute('height', '600');
canvas.setAttribute('id', 'canvas');
canvas.style.border = '2px solid black';
canvas.classList.add('col-12');
canvas.classList.add('border'); 
canvas.classList.add('border'); 
canvas.classList.add('border-success'); 
 
container.appendChild(canvas);
let ctx = canvas.getContext('2d');

const resolverBtn = document.getElementById('resolverBtn');
const generarBtn = document.getElementById('btnGenerar');


resolverBtn.addEventListener('click',()=>{
    generarBtn.disabled = true;
    resolverLaberinto();

});

generarBtn.addEventListener('click',()=>{
    iniciarGeneracionLaberinto();
});

let FPS = 60;
let TX = parseInt(tiles);
let TY = parseInt(tiles);

let FILAS = parseInt(canvas.height / TY);
let COLUMNAS = parseInt(canvas.width / TX);

let verdeVISITADA = 'rgba(0, 255, 0, 0.5)';
let rojoCURSOR = 'rgba(255, 0, 0, 0.5)';
let amarilloRUTA = 'rgba(255, 255, 0, 0.5)';
let colorAGENTE = 'rgba(208, 0, 255, 0.5)';
let negroPARED = 'black'; 

let terminado = false;
let resolviendo = false;
let ruta = [];
let agentePos = 0;

let stack = []; 
let casillas = []; 
let enPausa = false; // Nueva variable de control de pausa

// Variables para el temporizador
let timerInterval = null; // Control del temporizador
let elapsedTime = 0; // Tiempo transcurrido en segundos
let timerElement = document.getElementById('timer');

// Función para actualizar el temporizador en la interfaz
function actualizarTimer() {
    const minutos = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const segundos = (elapsedTime % 60).toString().padStart(2, '0');
    timerElement.textContent = `Tiempo: ${minutos}:${segundos}`;
}

// Inicia el temporizador
function iniciarTimer() {
    if (!timerInterval) { // Evita múltiples intervalos
        timerInterval = setInterval(() => {
            if (!enPausa) { // Sólo incrementa si no está en pausa
                elapsedTime++;
                actualizarTimer();
            }
        }, 1000);
    }
}

// Pausa el temporizador
function pausarTimer() {
    enPausa = true; // Asegura que el estado de pausa se aplica
}

// Reanuda el temporizador
function continuarTimer() {
    enPausa = false; // Quita la pausa
}

// Detiene y reinicia el temporizador
function reiniciarTimer() {
    clearInterval(timerInterval); // Detiene el intervalo
    timerInterval = null; // Resetea el control del intervalo
    elapsedTime = 0; // Resetea el tiempo
    actualizarTimer(); // Actualiza la interfaz
}

// Botón de Pausa/Continuar
let botonPausa = document.getElementById('btnPausa');

// Evento del botón de pausa
botonPausa.addEventListener('click', () => {
    enPausa = !enPausa; // Alternar pausa
    if (enPausa) {
        pausarTimer();
        botonPausa.textContent = 'Continuar';
    } else {
        continuarTimer();
        botonPausa.textContent = 'Pausa';
    }
});


function pausa() {
    return new Promise((resolve) => {
        const intervalo = setInterval(() => {
            if (!enPausa) {
                clearInterval(intervalo);
                resolve();
            }
        }, 100);
    });
}


class Casilla {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.corners = [
            {x: x*TX, y: y*TY},
            {x: x*TX + TX, y: y*TY},
            {x: x*TX + TX , y: y*TY + TY},
            {x: x*TX, y: y*TY + TY},
            {x: x*TX, y: y*TY}
        ]; 
        this.walls = [true, true, true, true];
        this.visitada = false; 
    }

    render() {
        for (let i = 0; i < this.walls.length; i++) {
            if (this.walls[i]) {
                dibujaLineaBorde(this.corners[i].x, this.corners[i].y, this.corners[i+1].x, this.corners[i+1].y);
            }
        }
    
        if (this === casillas[0]) {
            ctx.fillStyle = 'rgba(13, 0, 255, 0.8)'; // Color verde para el inicio
            ctx.fillRect(this.x * TX, this.y * TY, TX, TY);
        } else if (this === casillas[casillas.length - 1]) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; // Color rojo para el fin
            ctx.fillRect(this.x * TX, this.y * TY, TX, TY);
        } else if (this.visitada) {
            ctx.fillStyle = verdeVISITADA;
            ctx.fillRect(this.x * TX, this.y * TY, TX, TY);
        }
    }
    
    
    checkVecinos(){
        let x = this.x;
        let y = this.y;
        let posVecinos = [
            {x: x, y: y-1},
            {x: x+1, y: y},
            {x: x, y: y+1},
            {x: x-1, y: y}
        ];

        let vecinos = [];
        for (let i = 0; i < posVecinos.length; i++){
            let vecinosBajoCheckeo = casillas[indice(posVecinos[i].x, posVecinos[i].y)];
            if (vecinosBajoCheckeo && !vecinosBajoCheckeo.visitada){
                vecinos.push(vecinosBajoCheckeo);
            }
        }

        if (vecinos.length > 0){
            let num_rnd = Math.floor(Math.random() * vecinos.length);
            return vecinos[num_rnd];
        }

        return undefined;
    }
    
    cursor(){
        ctx.fillStyle = rojoCURSOR;
        ctx.fillRect(this.x*TX, this.y*TY, TX, TY);
    }

    highlightPath(){
        //ctx.fillStyle = amarilloRUTA;
        //ctx.fillRect(this.x*TX, this.y*TY, TX, TY);
    }

    renderAgente(){
        ctx.fillStyle = colorAGENTE;
        ctx.fillRect(this.x*TX, this.y*TY, TX, TY);
    }
}

function iniciarGeneracionLaberinto() {
    resolverBtn.disabled = true; // Deshabilitar el botón de resolver
    botonPausa.disabled = true; // Deshabilitar el botón de pausa
    reiniciarTimer(); // Reinicia el temporizador
    enPausa = false; // Asegura que no está en pausa
    terminado = false; // Estado del laberinto aún no generado
    stack = [];
    casillas = [];
    creaArrayObjetosCasilla();
    actual = casillas[0];
    actual.visitada = true;
    stack.push(actual);

    // Inicia el proceso de generación con un intervalo
    const intervalId = setInterval(() => {
        // Llama a la función que genera el laberinto paso a paso
        laberintoGenerandose();

        // Verifica si el laberinto se ha generado completamente
        if (terminado) {
            clearInterval(intervalId); // Detiene el intervalo
            resolverBtn.disabled = false; // Habilita el botón de resolver
            botonPausa.disabled = false; // Habilita el botón de pausa
        }
    }, 1000 / FPS);
}




//document.getElementById('canvas').addEventListener('click', (event) => { 
//    if (terminado) { iniciarGeneracionLaberinto(); } });

function abrirCamino(actual, elegida){
    let lr = actual.x - elegida.x;
    let tb = actual.y - elegida.y;

    if (lr === -1){
        actual.walls[1] = false;
        elegida.walls[3] = false;
    } else if (lr === 1){
        actual.walls[3] = false;
        elegida.walls[1] = false;
    }

    if (tb === -1){
        actual.walls[2] = false;
        elegida.walls[0] = false;
    } else if (tb === 1){
        actual.walls[0] = false;
        elegida.walls[2] = false;
    } 
}

function dibujaLineaBorde(x1,y1,x2,y2){
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function indice(x,y){
    if (x < 0 || y < 0 || x > COLUMNAS-1 || y > FILAS-1){
        return -1;
    }
    return x + y * COLUMNAS;
}

function creaArrayObjetosCasilla(){
    for (let i=0; i < FILAS; i++){
        for (let ii=0; ii < COLUMNAS; ii++){
            let casilla = new Casilla(ii, i);   
            casillas.push(casilla);
        }
    }
}

creaArrayObjetosCasilla();

let elegida; 
let actual = casillas[0];
actual.visitada = true;
stack.push(actual);

function laberintoGenerandose() {
    if (enPausa) return; // Si está en pausa, no hacer nada
    if (stack.length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        actual = stack.pop();
        elegida = actual.checkVecinos();

        if (elegida) {
            elegida.cursor();
            stack.push(actual);
            abrirCamino(actual, elegida);
            elegida.visitada = true;
            stack.push(elegida);
        } else {
            actual.cursor();
        }

        for (let i = 0; i < casillas.length; i++) {
            casillas[i].render();
        }
    } else {
        terminado = true;
        if (resolviendo) {
            resolverLaberinto();
        }
    }
}

iniciarGeneracionLaberinto();
//setInterval(laberintoGenerandose, 1000/FPS); 

//document.addEventListener('click', (event) => {
//    if (event.target.id === 'canvas' && terminado){
//        location.reload();
//    }
//});

function resolverLaberinto() {
    reiniciarTimer(); // Reinicia el temporizador al inicio
    iniciarTimer(); // Comienza a contar
    let algoritmo = document.getElementById("algoritmo").value;
    if (algoritmo === "dfs") {
        resolverBtn.disabled = true; // Deshabilitar el botón de resolver
        resolverDFS();
    } else if (algoritmo === "tmx") {
        resolverBtn.disabled = true; // Deshabilitar el botón de resolver
        resolverTremaux();
    } else if (algoritmo === "bfs") {
        resolverBtn.disabled = true; // Deshabilitar el botón de resolver
        resolverBFS();
    }
}


async function resolverDFS() {
    let stack = [casillas[0]];
    let visited = new Set();
    visited.add(casillas[0]);

    while (stack.length > 0) {
        if (enPausa) {
            await pausa(); // Espera mientras está en pausa
            continue;
        }

        let actual = stack.pop();
        ruta.push(actual);

        // Dibuja la posición del agente en cada paso
        await dibujarAgente(actual);

        if (actual === casillas[casillas.length - 1]) {
            pausarTimer(); // Pausa el temporizador al finalizar
            alert("¡El laberinto ha sido resuelto!");
            generarBtn.disabled = false; // Habilita el botón de generar
            return;
        }

        let vecinos = obtenerVecinos(actual);
        let hayNuevosVecinos = false;

        for (let vecino of vecinos) {
            if (!visited.has(vecino)) {
                stack.push(actual); // Agrega el actual para retroceder si es necesario
                stack.push(vecino);
                visited.add(vecino);
                hayNuevosVecinos = true;
                break;
            }
        }

        // Si no hay vecinos nuevos, muestra el retroceso
        if (!hayNuevosVecinos) {
            await dibujarAgente(actual); // Visualiza el retroceso
        }
    }

    alert("No se encontró solución.");
}

async function resolverTremaux() {
    let stack = [casillas[0]]; // Pila para rastrear la ruta
    let marcas = new Map(); // Mapa para rastrear cuántas veces se ha visitado cada casilla
    marcas.set(casillas[0], 1); // Marca la casilla inicial como visitada una vez

    while (stack.length > 0) {
        if (enPausa) {
            await pausa(); // Espera mientras está en pausa
            continue;
        }
        let actual = stack.pop();
        ruta.push(actual);

        // Dibuja la posición del agente en cada paso
        await dibujarAgente(actual);

        // Verifica si se alcanzó la meta
        if (actual === casillas[casillas.length - 1]) {
            pausarTimer(); // Pausa el temporizador al finalizar
            alert("¡El laberinto ha sido resuelto!");
            generarBtn.disabled = false; // Habilita el botón de generar
            return;
        }

        let vecinos = obtenerVecinos(actual);
        let hayNuevosVecinos = false;

        for (let vecino of vecinos) {
            // Si el vecino no ha sido visitado o ha sido visitado solo una vez
            if (!marcas.has(vecino) || marcas.get(vecino) === 1) {
                stack.push(actual); // Agrega el actual para retroceder si es necesario
                stack.push(vecino); // Agrega el vecino como próximo nodo a explorar
                marcas.set(vecino, (marcas.get(vecino) || 0) + 1); // Incrementa la marca del vecino
                hayNuevosVecinos = true;
                break; // Solo se explora un nuevo vecino en cada paso
            }
        }

        // Si no hay vecinos nuevos, muestra el retroceso
        if (!hayNuevosVecinos) {
            await dibujarAgente(actual); // Visualiza el retroceso
        }
    }

    alert("No se encontró solución.");
}

async function resolverBFS() {
    let queue = [[casillas[0]]]; // Cola que almacena rutas completas (no solo nodos)
    let visited = new Set(); // Conjunto para nodos visitados
    visited.add(casillas[0]); // Marca el nodo inicial como visitado

    while (queue.length > 0) {
        if (enPausa) {
            await pausa(); // Espera mientras está en pausa
            continue;
        }
        let rutaActual = queue.shift(); // Extrae la primera ruta de la cola
        let actual = rutaActual[rutaActual.length - 1]; // Obtiene el último nodo de la ruta

        // Dibuja la ruta actual en el laberinto
        await recorrerRuta(rutaActual);

        // Verifica si se alcanzó la meta
        if (actual === casillas[casillas.length - 1]) {
            pausarTimer(); // Pausa el temporizador al finalizar
            alert("¡El laberinto ha sido resuelto!");
            generarBtn.disabled = false; // Habilita el botón de generar
            return;
        }

        // Obtiene vecinos válidos
        let vecinos = obtenerVecinos(actual);

        for (let vecino of vecinos) {
            if (!visited.has(vecino)) {
                visited.add(vecino); // Marca el vecino como visitado
                let nuevaRuta = [...rutaActual, vecino]; // Crea una nueva ruta extendida
                queue.push(nuevaRuta); // Agrega la nueva ruta a la cola
            }
        }

        // Retrocede al inicio de la ruta actual antes de explorar la siguiente
        await regresarAlInicio(rutaActual);
    }

    alert("No se encontró solución.");
}

// Dibuja al agente recorriendo una ruta
async function recorrerRuta(ruta) {
    for (let casilla of ruta) {
        await dibujarAgente(casilla); // Dibuja al agente en cada paso
    }
}

// Retrocede al inicio de la ruta actual
async function regresarAlInicio(ruta) {
    for (let i = ruta.length - 2; i >= 0; i--) { // Empieza desde el penúltimo nodo
        await dibujarAgente(ruta[i]);
    }
}


function dibujarAgente(actual) {
    return new Promise((resolve) => {
        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < casillas.length; i++) {
                casillas[i].render();
            }
            for (let casilla of ruta) {
                casilla.highlightPath();
            }
            actual.renderAgente();
            resolve();
        }, 100); // Controla la velocidad del agente
    });
}




// async function resolverBFS() { 
//     let queue = [casillas[0]]; 
//     let visited = new Set(); 
//     visited.add(casillas[0]); 
//     let parentMap = new Map(); 
//     while (queue.length > 0) 
//         { 
//             let actual = queue.shift(); 
//             ruta.push(actual); // Dibuja la posición del agente en cada paso 
//             await dibujarAgente(actual); 
//             if (actual === casillas[casillas.length - 1]) 
//                 { alert("¡El laberinto ha sido resuelto!"); 
//                     return; 
//                 }
//         let vecinos = obtenerVecinos(actual); 
//         let hayNuevosVecinos = false; 
//         for (let vecino of vecinos) { 
//             if (!visited.has(vecino)) { 
//                 queue.push(vecino); 
//                 visited.add(vecino); 
//                 parentMap.set(vecino, actual); 
//                 hayNuevosVecinos = true; break; 
//             } } // Si no hay vecinos nuevos, muestra el retroceso 
//             if (!hayNuevosVecinos) { 
//                 await dibujarAgente(actual); // Visualiza el retroceso 
//                 } } alert("No se encontró solución."); 
//             }

function obtenerVecinos(casilla){
    let x = casilla.x;
    let y = casilla.y;
    let posVecinos = [
        {x: x, y: y-1},
        {x: x+1, y: y},
        {x: x, y: y+1},
        {x: x-1, y: y}
    ];

    let vecinos = [];
    for (let i = 0; i < posVecinos.length; i++){
        let vecino = casillas[indice(posVecinos[i].x, posVecinos[i].y)];
        if (vecino && !casilla.walls[i]){
            vecinos.push(vecino);
        }
    }
    return vecinos;
}

function iniciarAgente(){
    agentePos = 0;
    moverAgente();
}

function moverAgente(){
    if (agentePos < ruta.length){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < casillas.length; i++){
            casillas[i].render();
        }

        for (let casilla of ruta){
            casilla.highlightPath();
        }

        ruta[agentePos].renderAgente();

        agentePos++;

        setTimeout(moverAgente, 100);
    } else {
        alert("¡El laberinto ha sido resuelto!");
    }
}
