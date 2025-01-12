const socket = io();
let currentMode = null;  // Start with no mode selected
let shapes = [];  // Store shapes (rectangles, circles, etc.)
let selectedShape = null;  // The currently selected shape
let resizingShape = null;  // Shape that is being resized
let movingShape = null;  // Shape that is being moved
let offsetX, offsetY;  // Offsets for resizing or moving
let isResizing = false;  // Flag to check if the user is resizing
let borderSize = 15; // Increased size of the resizing border area
let scale = 1;  // Scale factor for resizing
let roomCode = null;  // Room code variable
let drawingLines = [];  // Store freehand drawing lines
let linePoints = [];  // Store points for drawing



// Room creation logic
document.getElementById('create-room').addEventListener('click', () => {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    alert(`Room created! Share this code: ${roomCode}`);
    joinRoom(roomCode);
});

// Join room logic
document.getElementById('join-room').addEventListener('click', () => {
    document.getElementById('options').style.display = 'none';
    document.getElementById('room-code-input').style.display = 'block';
});

// Handling room joining
document.getElementById('join').addEventListener('click', () => {
    roomCode = document.getElementById('room-code').value;
    if (roomCode) joinRoom(roomCode);
});

// Function to join a room and initialize the drawing canvas
function joinRoom(room) {
    document.getElementById('app').innerHTML = `
        <div id="toolbar">
            <button id="draw-mode">Draw</button>
            <button id="add-rectangle">Rectangle</button>
            <button id="add-circle">Circle</button>
            <button id="clear-drawing">Clear Drawing</button>  
            <button id="open-calculator">Open Calculator</button> 
        </div>
        <h2>Room: ${room}</h2>
        <canvas id="whiteboard" style="border: 1px solid black;"></canvas>
        <div id="calculator-container" style="display: none; width: 600px; height: 400px; border: 1px solid black;"></div>

    `;

    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth * 0.8;
    canvas.height = 500;

    let drawing = false;  // Flag for drawing

    // Switching modes when buttons are clicked
    document.getElementById('draw-mode').addEventListener('click', () => {
        if (currentMode === 'draw') {
            currentMode = null;  // Deactivate drawing mode
            document.getElementById('draw-mode').textContent = 'Draw'; // Reset button text
        } else {
            currentMode = 'draw';  // Switch to draw mode
            document.getElementById('draw-mode').textContent = 'Stop Drawing'; // Update button text
        }
    });

    
    document.getElementById('add-rectangle').addEventListener('click', () => {
        if (currentMode === 'rectangle') {
            currentMode = null;  // Deactivate rectangle mode if it's already active
        } else {
            currentMode = 'rectangle';  // Switch to rectangle mode
        }
    });

    document.getElementById('add-circle').addEventListener('click', () => {
        if (currentMode === 'circle') {
            currentMode = null;  // Deactivate circle mode if it's already active
        } else {
            currentMode = 'circle';  // Switch to circle mode
        }
    });

    // New button to clear drawing lines
    document.getElementById('clear-drawing').addEventListener('click', () => {
        linePoints = [];  // Clear the drawing lines
        drawingLines = [];
        redrawShapes();  // Redraw shapes and drawing lines (which will now be empty)
    });

    // Event listener to handle mouse press for drawing and creating shapes
    canvas.addEventListener('mousedown', (e) => {
        //Move the linePoints into drawingLines array
        drawingLines.push(linePoints);
        linePoints = [];
        //console.log(linePoints);
        
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        // Deselect all shapes first
        shapes.forEach(shape => shape.isSelected = false);

        // Check if we clicked on any shape for resizing or moving
        selectedShape = null;
        shapes.forEach((shape) => {
            if (shape.type === 'rectangle' && x > shape.x && x < shape.x + shape.width && y > shape.y && y < shape.y + shape.height) {
                selectedShape = shape;
                offsetX = x - shape.x;
                offsetY = y - shape.y;
                if (x > shape.x + shape.width - borderSize && y > shape.y + shape.height - borderSize) {
                    resizingShape = shape;
                    isResizing = true;
                } else {
                    movingShape = shape;
                }
                shape.isSelected = true;
            } else if (shape.type === 'circle' && Math.sqrt((x - shape.x) ** 2 + (y - shape.y) ** 2) < shape.radius) {
                selectedShape = shape;
                offsetX = x - shape.x;
                offsetY = y - shape.y;
                if (Math.abs(Math.sqrt((x - shape.x) ** 2 + (y - shape.y) ** 2) - shape.radius) < borderSize) {
                    resizingShape = shape;
                    isResizing = true;
                } else {
                    movingShape = shape;
                }
                shape.isSelected = true;
            }
        });

        // Create a new rectangle if the mode is set to rectangle
        if (currentMode === 'rectangle' && !resizingShape && !movingShape) {
            const newRectangle = { type: 'rectangle', x, y, width: 100, height: 50, isSelected: false };
            shapes.push(newRectangle);
            selectedShape = newRectangle;

            // Emit the drawing event to the server with the room code
            if (roomCode) {
                socket.emit('drawing', { room: roomCode, mode: 'rectangle', ...newRectangle });
            }
        }

        // Create a new circle if the mode is set to circle
        if (currentMode === 'circle' && !resizingShape && !movingShape) {
            const newCircle = { type: 'circle', x, y, radius: 50, isSelected: false };
            shapes.push(newCircle);
            selectedShape = newCircle;

            // Emit the drawing event to the server with the room code
            if (roomCode) {
                socket.emit('drawing', { room: roomCode, mode: 'circle', ...newCircle });
            }
        }

        // Start drawing if the mode is set to draw
        if (currentMode === 'draw' && !resizingShape && !movingShape) {
            if (!drawing) {  // Only start a new line if it's not already drawing
                drawing = true;
                //linePoints = [{ x, y }];  // Start a new line
            } else {
                linePoints.push({ x, y });  // Continue the current line
            }
        }
    });

    // Event listener for mouse release to stop resizing/moving
    canvas.addEventListener('mouseup', () => {
        



        if (resizingShape) {
            isResizing = false;
            resizingShape.isSelected = false;
            resizingShape = null;
        }
        if (movingShape) {
            movingShape.isSelected = false;
            movingShape = null;
        }
        drawing = false;
    });

    // Event listener to handle mouse movement (for resizing or moving)
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;


        // Handle moving shapes
        if (movingShape) {
            movingShape.x = x - offsetX;
            movingShape.y = y - offsetY;

            // Emit the shape update to the server with the room code
            if (roomCode) {
                socket.emit('update-shape', { room: roomCode, shape: movingShape });
            }

            redrawShapes();
        }
        
        // Handle resizing
        if (isResizing && resizingShape) {
            if (resizingShape.type === 'rectangle') {
                resizingShape.width = x - resizingShape.x;
                resizingShape.height = y - resizingShape.y;
            } else if (resizingShape.type === 'circle') {
                resizingShape.radius = Math.sqrt((x - resizingShape.x) ** 2 + (y - resizingShape.y) ** 2);
            }

            // Emit the shape update to the server with the room code
            if (roomCode) {
                socket.emit('update-shape', { room: roomCode, shape: resizingShape });
            }

            redrawShapes();
        }

        
        // Draw on canvas
        if (drawing) {
            linePoints.push({ x, y });  // Add point to the line
            redrawShapes();

            // Emit the drawing update to the server
            if (roomCode) {
                console.log(linePoints); console.log();
                let drawingLines2 = drawingLines; 
                drawingLines2.push(linePoints);
                socket.emit('drawing', { room: roomCode, mode: 'draw', points_sets: drawingLines2 });
            }
        }

    });

    // Redraw all shapes and drawing lines after a resize or update
    function redrawShapes() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        // Redraw drawing lines

        //draw the last line
        {ctx.beginPath();
        linePoints.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();}

        //draw previous lines stored in 
        for (let i = 0; i < drawingLines.length; i++) {
            ctx.moveTo(drawingLines[i].x,drawingLines[i].y)
            ctx.beginPath();
            drawingLines[i].forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }

        // Redraw all shapes
        shapes.forEach((shape) => {
            if (shape.type === 'rectangle') {
                ctx.strokeStyle = shape.isSelected ? 'yellow' : 'red';
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === 'circle') {
                ctx.strokeStyle = shape.isSelected ? 'yellow' : 'red';
                ctx.beginPath();
                ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });
    }


    // Handle screen resizing
    window.addEventListener('resize', () => {
        scale = canvas.width / window.innerWidth;
        //redrawShapes();
    });

    socket.emit('join-room', room);

//////////////////////////////////////////////////
    
    // Listen for drawing events from other users in the room, super important for live updates
    socket.on('drawing', (data) => {
        if (data.mode === 'rectangle') {
            // Transparent fill and border for the received rectangle
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(data.x * scale, data.y * scale, data.width * scale, data.height * scale);

            ctx.lineWidth = 1;  // Normal border width
            ctx.strokeStyle = 'red';  // Border color for non-selected rectangles
            ctx.strokeRect(data.x * scale, data.y * scale, data.width * scale, data.height * scale);
        } else if (data.mode === 'circle') {
            // Transparent fill and border for the received circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.beginPath();
            ctx.arc(data.x * scale, data.y * scale, data.radius * scale, 0, 2 * Math.PI);
            ctx.fill();

            ctx.lineWidth = 1;  // Normal border width
            ctx.strokeStyle = 'red';  // Border color for non-selected circles
            ctx.stroke();
        } else if (data.mode === 'draw'){
            // Handle received freehand drawing
            console.log(data);
            drawingLines = data.points_sets;
            redrawShapes();
        }
    });

    
    //////////////Desmos//////////////////////////////////

      // Add event listener to the "Open Calculator" button
      document.getElementById('open-calculator').addEventListener('click', () => {
          const container = document.getElementById('calculator-container');
          if (container.style.display === 'none') {
              container.style.display = 'block'; // Show the calculator container
              initializeCalculator();
          } else {
              container.style.display = 'none'; // Hide the calculator container
          }
      });

      // Function to initialize the Desmos Calculator
      function initializeCalculator() {
          const calculatorContainer = document.getElementById('calculator-container');

          // Check if the calculator is already initialized
          if (!calculatorContainer.calculator) {
              const calculator = Desmos.GraphingCalculator(calculatorContainer, {
                  keypad: true,
              });
              calculatorContainer.calculator = calculator; // Store it to avoid reinitialization
          }
      }



    ///////////////////////////////////////////////////////

    
}
