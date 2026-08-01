class SandboxGame {
    constructor(gridSize = 16, cellSize = 40) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.paletteHeight = 60;

        this.width = this.gridSize * this.cellSize;
        this.height = this.gridSize * this.cellSize;

        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.colors = {
            red: '#b40000',
            dark_red: '#800000',
            blue: '#0000b4',
            dark_blue: '#000080',
            green: '#00b400',
            dark_green: '#008000',
            black: '#000000',
            white: '#ffffff',
            gray: '#c8c8c8'
        };

        this.palette = [
            { name: 'red', color: this.colors.red, darkColor: this.colors.dark_red },
            { name: 'blue', color: this.colors.blue, darkColor: this.colors.dark_blue },
            { name: 'green', color: this.colors.green, darkColor: this.colors.dark_green },
            { name: 'switch', color: '#969696', darkColor: '#646464' },
            { name: 'amplifier', color: '#c89664', darkColor: '#966432' },
            { name: 'inverter', color: '#8e44ad', darkColor: '#6c3483' }
        ];

        this.switchStates = {};
        this.amplifierStates = {};
        this.inverterStates = {};
        this.selectedColor = null;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(null));
        this.burnedLamps = {};
        this.energyGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.minLampEnergy = 10;

        this.fireFrames = [];
        this.currentFrame = 0;
        this.animationSpeed = 10;
        this.lastAnimationTime = 0;
        this.amplifierDelay = 1000;

        this.textures = {};
        this.wireTextures = {};
        this.texturesLoaded = false;

        this.isRightMouseDown = false;
        this.isLeftMouseDown = false;
        this.lastMouseCell = null;
        this.lastHoveredCell = null;

        this.placingAmplifier = false;
        this.amplifierPlacePos = null;
        this.placingInverter = false;
        this.inverterPlacePos = null;

        this.loadTextures().then(() => {
            this.texturesLoaded = true;
            this.bindEvents();
            this.gameLoop();
        });
    }

    async loadTextures() {
        const textureFiles = {
            'psu': 'Assets/psu.png',
            'lampoff': 'Assets/lampoff.png',
            'lampon': 'Assets/lampon.png',
            'lamp5v': 'Assets/lamp5v.png',
            'switch_on': 'Assets/switch_on.png',
            'switch_off': 'Assets/switch_off.png',
            'fire0': 'Assets/fire1pix.png',
            'fire1': 'Assets/fire2pix.png',
            'fire2': 'Assets/fire3pix.png',
            'amplifier_right': 'Assets/amplifier_right.png',
            'amplifier_down': 'Assets/amplifier_down.png',
            'amplifier_left': 'Assets/amplifier_left.png',
            'amplifier_up': 'Assets/amplifier_up.png',
            'inverter_right': 'Assets/inverter_right.png',
            'inverter_down': 'Assets/inverter_down.png',
            'inverter_left': 'Assets/inverter_left.png',
            'inverter_up': 'Assets/inverter_up.png',
            'wire_dot': 'Assets/wire_dot.png',
            'wire_horizontal': 'Assets/wire_horizontal.png',
            'wire_vertical': 'Assets/wire_vertical.png',
            'wire_left': 'Assets/wire_left.png',
            'wire_right': 'Assets/wire_right.png',
            'wire_top': 'Assets/wire_top.png',
            'wire_bottom': 'Assets/wire_bottom.png',
            'wire_corner_top_left': 'Assets/wire_corner_top_left.png',
            'wire_corner_top_right': 'Assets/wire_corner_top_right.png',
            'wire_corner_bottom_left': 'Assets/wire_corner_bottom_left.png',
            'wire_corner_bottom_right': 'Assets/wire_corner_bottom_right.png',
            'wire_t_left': 'Assets/wire_t_left.png',
            'wire_t_right': 'Assets/wire_t_right.png',
            'wire_t_top': 'Assets/wire_t_top.png',
            'wire_t_bottom': 'Assets/wire_t_bottom.png',
            'wire_x': 'Assets/wire_x.png'
        };

        const loadPromises = Object.entries(textureFiles).map(([key, path]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    if (key.startsWith('fire')) {
                        this.fireFrames.push(img);
                    } else if (key.startsWith('wire_')) {
                        this.wireTextures[key.replace('wire_', '')] = img;
                    } else {
                        this.textures[key] = img;
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load texture: ${path}`);
                    const fallbackCanvas = document.createElement('canvas');
                    fallbackCanvas.width = this.cellSize;
                    fallbackCanvas.height = this.cellSize;
                    const fctx = fallbackCanvas.getContext('2d');
                    
                    if (key === 'psu') {
                        fctx.fillStyle = '#e74c3c';
                        fctx.fillRect(0, 0, this.cellSize, this.cellSize);
                    } else if (key.startsWith('lamp')) {
                        fctx.fillStyle = key === 'lampon' ? '#f1c40f' : key === 'lamp5v' ? '#e67e22' : '#2c3e50';
                        fctx.beginPath();
                        fctx.arc(this.cellSize/2, this.cellSize/2, this.cellSize/3, 0, Math.PI * 2);
                        fctx.fill();
                    } else if (key.startsWith('inverter')) {
                        fctx.fillStyle = '#8e44ad';
                        fctx.fillRect(0, 0, this.cellSize, this.cellSize);
                    } else {
                        fctx.fillStyle = '#95a5a6';
                        fctx.fillRect(0, 0, this.cellSize, this.cellSize);
                    }
                    
                    const fallbackImg = new Image();
                    fallbackImg.src = fallbackCanvas.toDataURL();
                    
                    if (key.startsWith('fire')) {
                        this.fireFrames.push(fallbackImg);
                    } else if (key.startsWith('wire_')) {
                        this.wireTextures[key.replace('wire_', '')] = fallbackImg;
                    } else {
                        this.textures[key] = fallbackImg;
                    }
                    resolve();
                };
                img.src = path;
            });
        });

        await Promise.all(loadPromises);
        
        if (this.fireFrames.length === 0) {
            for (let i = 0; i < 3; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = this.cellSize;
                canvas.height = this.cellSize;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = `rgb(${255}, ${100 + i * 50}, ${i * 20})`;
                ctx.fillRect(0, 0, this.cellSize, this.cellSize);
                const img = new Image();
                img.src = canvas.toDataURL();
                this.fireFrames.push(img);
            }
        }
    }

    canConnectToAmplifier(amplifierRow, amplifierCol, fromDirection) {
        const key = `${amplifierRow},${amplifierCol}`;
        const cellType = this.grid[amplifierRow][amplifierCol];
        let dir;
        
        if (cellType === 'amplifier') {
            dir = this.amplifierStates[key] || 0;
        } else if (cellType === 'inverter') {
            dir = this.inverterStates[key] || 0;
        } else {
            return false;
        }
        
        if (dir === 0 || dir === 2) {
            return fromDirection === 1 || fromDirection === 3;
        } else {
            return fromDirection === 0 || fromDirection === 2;
        }
    }

    isAmplifierPowered(row, col) {
        const key = `${row},${col}`;
        const cellType = this.grid[row][col];
        
        if (cellType === 'amplifier') {
            if (!(key in this.amplifierStates)) return false;
            const direction = this.amplifierStates[key];
            return this.checkInputPowered(row, col, direction);
        } else if (cellType === 'inverter') {
            if (!(key in this.inverterStates)) return false;
            const direction = this.inverterStates[key];
            return this.checkInputPowered(row, col, direction);
        }
        
        return false;
    }
    
    checkInputPowered(row, col, direction) {
        const inputPos = this.getInputPosition(row, col, direction);
        const [inputRow, inputCol] = inputPos;
        
        if (inputRow < 0 || inputRow >= this.gridSize || inputCol < 0 || inputCol >= this.gridSize) {
            return false;
        }
        
        const inputCell = this.grid[inputRow][inputCol];
        
        if (inputCell === 'red') return true;
        
        if (['blue', 'green'].includes(inputCell) && this.energyGrid[inputRow][inputCol] > 0) {
            return true;
        }
        
        if (inputCell === 'switch' && this.switchStates[`${inputRow},${inputCol}`] && this.energyGrid[inputRow][inputCol] > 0) {
            return true;
        }
        
        if (inputCell === 'amplifier' || inputCell === 'inverter') {
            const inputKey = `${inputRow},${inputCol}`;
            let inputDir;
            if (inputCell === 'amplifier') {
                inputDir = this.amplifierStates[inputKey];
            } else {
                inputDir = this.inverterStates[inputKey];
            }
            if (inputDir !== undefined) {
                const [outRow, outCol] = this.getOutputPosition(inputRow, inputCol, inputDir);
                if (outRow === row && outCol === col) {
                    return this.isAmplifierPowered(inputRow, inputCol);
                }
            }
        }
        
        return false;
    }

    getCellsBetween(cell1, cell2) {
        const cells = [];
        
        let x0 = cell1.col;
        let y0 = cell1.row;
        const x1 = cell2.col;
        const y1 = cell2.row;
        
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        while (x0 !== x1 || y0 !== y1) {
            const e2 = 2 * err;
            
            let nextX = x0;
            let nextY = y0;
            
            if (e2 > -dy) {
                err -= dy;
                nextX = x0 + sx;
            }
            if (e2 < dx) {
                err += dx;
                nextY = y0 + sy;
            }
            
            if (nextX !== x0 && nextY !== y0) {
                if (x0 + sx >= 0 && x0 + sx < this.gridSize && y0 >= 0 && y0 < this.gridSize) {
                    cells.push({ row: y0, col: x0 + sx });
                }
            }
            
            x0 = nextX;
            y0 = nextY;
            
            if (x0 !== x1 || y0 !== y1) {
                if (x0 >= 0 && x0 < this.gridSize && y0 >= 0 && y0 < this.gridSize) {
                    cells.push({ row: y0, col: x0 });
                }
            }
        }
        
        return cells;
    }

    updateCursor(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            this.canvas.style.cursor = 'default';
            this.lastHoveredCell = null;
            return;
        }
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            this.canvas.style.cursor = 'default';
            this.lastHoveredCell = null;
            return;
        }
        
        const key = `${row},${col}`;
        const cellType = this.grid[row][col];
        
        if (this.lastHoveredCell === key) return;
        this.lastHoveredCell = key;
        
        if (cellType === 'switch' || cellType === 'amplifier' || cellType === 'inverter') {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    bindEvents() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        document.addEventListener('selectstart', (e) => {
            const controls = document.getElementById('controls');
            const gameContainer = document.getElementById('game-container');
            if ((gameContainer && gameContainer.contains(e.target)) || 
                (controls && controls.contains(e.target)) ||
                e.target === this.canvas) {
                e.preventDefault();
            }
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        this.canvas.addEventListener('mousemove', (e) => this.updateCursor(e));
        
        this.canvas.addEventListener('mouseleave', () => {
            this.canvas.style.cursor = 'default';
            this.lastHoveredCell = null;
        });

        document.querySelectorAll('.palette-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (item.classList.contains('selected')) {
                    item.classList.remove('selected');
                    this.selectedColor = null;
                } else {
                    document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    this.selectedColor = item.dataset.type;
                }
            });
            
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            item.addEventListener('mousedown', (e) => {
                if (e.button === 2) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

        this.lastMouseCell = null;

        if (e.button === 0) {
            this.isLeftMouseDown = true;
            
            const cellType = this.grid[row][col];
            if (cellType === 'switch' || cellType === 'amplifier' || cellType === 'inverter') {
                this.handleLeftClick(row, col);
                this.lastMouseCell = { row, col };
                return;
            }
            
            if (this.selectedColor === 'amplifier') {
                const key = `${row},${col}`;
                if (!(key in this.burnedLamps)) {
                    this.grid[row][col] = 'amplifier';
                    this.placingAmplifier = true;
                    this.amplifierPlacePos = { row, col };
                    const direction = this.autoDetermineDirection(row, col, 'amplifier');
                    this.amplifierStates[key] = direction;
                    this.canvas.style.cursor = 'pointer';
                }
            } else if (this.selectedColor === 'inverter') {
                const key = `${row},${col}`;
                if (!(key in this.burnedLamps)) {
                    this.grid[row][col] = 'inverter';
                    this.placingInverter = true;
                    this.inverterPlacePos = { row, col };
                    const direction = this.autoDetermineDirection(row, col, 'inverter');
                    this.inverterStates[key] = direction;
                    this.canvas.style.cursor = 'pointer';
                }
            } else {
                this.handleLeftClick(row, col);
            }
            
            this.lastMouseCell = { row, col };
        } else if (e.button === 2) {
            this.isRightMouseDown = true;
            this.handleRightClick(row, col);
            this.lastMouseCell = { row, col };
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) {
            this.isLeftMouseDown = false;
            this.placingAmplifier = false;
            this.amplifierPlacePos = null;
            this.placingInverter = false;
            this.inverterPlacePos = null;
        }
        if (e.button === 2) {
            this.isRightMouseDown = false;
        }
        
        if (!this.isLeftMouseDown && !this.isRightMouseDown) {
            this.lastMouseCell = null;
        }
    }

    handleMouseMove(e) {
        this.updateCursor(e);
        
        if (this.placingAmplifier && this.amplifierPlacePos && !this.isRightMouseDown) {
            this.handleDirectionSelection(this.amplifierPlacePos, 'amplifier', e);
            return;
        }
        
        if (this.placingInverter && this.inverterPlacePos && !this.isRightMouseDown) {
            this.handleDirectionSelection(this.inverterPlacePos, 'inverter', e);
            return;
        }
        
        if (!this.isRightMouseDown && !this.isLeftMouseDown) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;
        
        const currentCell = { row, col };

        if (this.lastMouseCell && 
            (this.lastMouseCell.row !== currentCell.row || this.lastMouseCell.col !== currentCell.col)) {
            
            const cellsBetween = this.getCellsBetween(this.lastMouseCell, currentCell);
            
            for (const betweenCell of cellsBetween) {
                if (this.isRightMouseDown) {
                    this.handleRightClick(betweenCell.row, betweenCell.col);
                }
                if (this.isLeftMouseDown && this.selectedColor === 'blue') {
                    const key = `${betweenCell.row},${betweenCell.col}`;
                    if (!(key in this.burnedLamps)) {
                        const cellType = this.grid[betweenCell.row][betweenCell.col];
                        if (!cellType || cellType === 'blue') {
                            this.grid[betweenCell.row][betweenCell.col] = 'blue';
                        }
                    }
                }
            }
        }

        if (this.isRightMouseDown) {
            this.handleRightClick(row, col);
        }
        if (this.isLeftMouseDown && this.selectedColor === 'blue') {
            const key = `${row},${col}`;
            if (!(key in this.burnedLamps)) {
                const cellType = this.grid[row][col];
                if (!cellType || cellType === 'blue') {
                    this.grid[row][col] = 'blue';
                }
            }
        }

        this.lastMouseCell = currentCell;
    }
    
    handleDirectionSelection(placePos, type, e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                const key = `${placePos.row},${placePos.col}`;
                let newDir = null;
                
                if (row < placePos.row && col === placePos.col) {
                    newDir = 3;
                } else if (row > placePos.row && col === placePos.col) {
                    newDir = 1;
                } else if (col < placePos.col && row === placePos.row) {
                    newDir = 2;
                } else if (col > placePos.col && row === placePos.row) {
                    newDir = 0;
                }
                
                if (newDir !== null) {
                    if (type === 'amplifier') {
                        this.amplifierStates[key] = newDir;
                    } else if (type === 'inverter') {
                        this.inverterStates[key] = newDir;
                    }
                }
            }
        }
    }

    handleLeftClick(row, col) {
        const key = `${row},${col}`;
        if (key in this.burnedLamps) return;

        const cellType = this.grid[row][col];

        if (cellType === 'switch') {
            this.switchStates[key] = !this.switchStates[key];
            return;
        }
        
        if (cellType === 'amplifier') {
            const currentDir = this.amplifierStates[key] || 0;
            this.amplifierStates[key] = (currentDir - 1 + 4) % 4;
            return;
        }
        
        if (cellType === 'inverter') {
            const currentDir = this.inverterStates[key] || 0;
            this.inverterStates[key] = (currentDir - 1 + 4) % 4;
            return;
        }

        if (this.selectedColor) {
            this.grid[row][col] = this.selectedColor;

            if (this.selectedColor === 'amplifier') {
                const direction = this.autoDetermineDirection(row, col, 'amplifier');
                this.amplifierStates[key] = direction;
            } else if (this.selectedColor === 'inverter') {
                const direction = this.autoDetermineDirection(row, col, 'inverter');
                this.inverterStates[key] = direction;
            }
            
            if (this.selectedColor === 'switch' || this.selectedColor === 'amplifier' || this.selectedColor === 'inverter') {
                this.canvas.style.cursor = 'pointer';
            }
        }
    }

    handleRightClick(row, col) {
        const key = `${row},${col}`;
        if (this.burnedLamps[key]) return;

        const cellType = this.grid[row][col];
        this.grid[row][col] = null;
        
        if (cellType === 'switch') {
            delete this.switchStates[key];
        } else if (cellType === 'amplifier') {
            delete this.amplifierStates[key];
        } else if (cellType === 'inverter') {
            delete this.inverterStates[key];
        }
    }

    autoDetermineDirection(row, col, type) {
        let leftEnergy = 0, rightEnergy = 0, topEnergy = 0, bottomEnergy = 0;

        if (col > 0 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row][col - 1])) {
            leftEnergy = this.energyGrid[row][col - 1];
        }
        if (col < this.gridSize - 1 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row][col + 1])) {
            rightEnergy = this.energyGrid[row][col + 1];
        }
        if (row > 0 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row - 1][col])) {
            topEnergy = this.energyGrid[row - 1][col];
        }
        if (row < this.gridSize - 1 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row + 1][col])) {
            bottomEnergy = this.energyGrid[row + 1][col];
        }

        const horizontalPower = Math.max(leftEnergy, rightEnergy);
        const verticalPower = Math.max(topEnergy, bottomEnergy);

        if (horizontalPower > 0 || verticalPower > 0) {
            if (horizontalPower > verticalPower) {
                return leftEnergy >= rightEnergy ? 0 : 2;
            } else {
                return topEnergy >= bottomEnergy ? 1 : 3;
            }
        }

        let activeDevices = [];

        if (row > 0 && (this.grid[row - 1][col] === 'amplifier' || this.grid[row - 1][col] === 'inverter')) {
            const key = `${row - 1},${col}`;
            const cellType = this.grid[row - 1][col];
            let dir;
            if (cellType === 'amplifier') {
                dir = this.amplifierStates[key] || 0;
            } else {
                dir = this.inverterStates[key] || 0;
            }
            if (dir === 1) {
                if (this.energyGrid[row - 1][col] > 0 || this.isAmplifierPowered(row - 1, col)) {
                    activeDevices.push(dir);
                }
            }
        }

        if (col < this.gridSize - 1 && (this.grid[row][col + 1] === 'amplifier' || this.grid[row][col + 1] === 'inverter')) {
            const key = `${row},${col + 1}`;
            const cellType = this.grid[row][col + 1];
            let dir;
            if (cellType === 'amplifier') {
                dir = this.amplifierStates[key] || 0;
            } else {
                dir = this.inverterStates[key] || 0;
            }
            if (dir === 2) {
                if (this.energyGrid[row][col + 1] > 0 || this.isAmplifierPowered(row, col + 1)) {
                    activeDevices.push(dir);
                }
            }
        }

        if (row < this.gridSize - 1 && (this.grid[row + 1][col] === 'amplifier' || this.grid[row + 1][col] === 'inverter')) {
            const key = `${row + 1},${col}`;
            const cellType = this.grid[row + 1][col];
            let dir;
            if (cellType === 'amplifier') {
                dir = this.amplifierStates[key] || 0;
            } else {
                dir = this.inverterStates[key] || 0;
            }
            if (dir === 3) {
                if (this.energyGrid[row + 1][col] > 0 || this.isAmplifierPowered(row + 1, col)) {
                    activeDevices.push(dir);
                }
            }
        }

        if (col > 0 && (this.grid[row][col - 1] === 'amplifier' || this.grid[row][col - 1] === 'inverter')) {
            const key = `${row},${col - 1}`;
            const cellType = this.grid[row][col - 1];
            let dir;
            if (cellType === 'amplifier') {
                dir = this.amplifierStates[key] || 0;
            } else {
                dir = this.inverterStates[key] || 0;
            }
            if (dir === 0) {
                if (this.energyGrid[row][col - 1] > 0 || this.isAmplifierPowered(row, col - 1)) {
                    activeDevices.push(dir);
                }
            }
        }

        if (activeDevices.length === 1) {
            return activeDevices[0];
        }

        return 0;
    }

    updatePower() {
        const newEnergyGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));

        let changed = true;
        let iterations = 0;
        const maxIterations = 100;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                this.energyGrid[r][c] = 0;
            }
        }

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            const passGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    if (this.grid[row][col] === 'red') {
                        const sourceGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
                        this.propagateEnergyFromSource(row, col, sourceGrid);
                        for (let r = 0; r < this.gridSize; r++) {
                            for (let c = 0; c < this.gridSize; c++) {
                                if (sourceGrid[r][c] > passGrid[r][c]) {
                                    passGrid[r][c] = sourceGrid[r][c];
                                }
                            }
                        }
                    }
                }
            }

            for (const [key, direction] of Object.entries(this.amplifierStates)) {
                const [row, col] = key.split(',').map(Number);
                if (this.shouldDeviceActivate(row, col, direction, this.energyGrid, 'amplifier')) {
                    const [outRow, outCol] = this.getOutputPosition(row, col, direction);
                    if (outRow >= 0 && outRow < this.gridSize && outCol >= 0 && outCol < this.gridSize) {
                        const outCellType = this.grid[outRow][outCol];
                        if (!(outCellType === 'switch' && !this.switchStates[`${outRow},${outCol}`])) {
                            if (['blue', 'green', 'switch'].includes(outCellType)) {
                                const deviceGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
                                deviceGrid[outRow][outCol] = 20;
                                this.propagateEnergyFromSourceWithDistance(outRow, outCol, deviceGrid, 1);
                                for (let r = 0; r < this.gridSize; r++) {
                                    for (let c = 0; c < this.gridSize; c++) {
                                        if (deviceGrid[r][c] > passGrid[r][c]) {
                                            passGrid[r][c] = deviceGrid[r][c];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            for (const [key, direction] of Object.entries(this.inverterStates)) {
                const [row, col] = key.split(',').map(Number);
                const hasInput = this.shouldDeviceActivate(row, col, direction, this.energyGrid, 'inverter');
                
                if (!hasInput) {
                    const [outRow, outCol] = this.getOutputPosition(row, col, direction);
                    if (outRow >= 0 && outRow < this.gridSize && outCol >= 0 && outCol < this.gridSize) {
                        const outCellType = this.grid[outRow][outCol];
                        if (!(outCellType === 'switch' && !this.switchStates[`${outRow},${outCol}`])) {
                            if (['blue', 'green', 'switch'].includes(outCellType)) {
                                const inverterGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
                                inverterGrid[outRow][outCol] = 20;
                                this.propagateEnergyFromSourceWithDistance(outRow, outCol, inverterGrid, 1);
                                for (let r = 0; r < this.gridSize; r++) {
                                    for (let c = 0; c < this.gridSize; c++) {
                                        if (inverterGrid[r][c] > passGrid[r][c]) {
                                            passGrid[r][c] = inverterGrid[r][c];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (passGrid[r][c] !== this.energyGrid[r][c]) {
                        changed = true;
                    }
                    newEnergyGrid[r][c] = passGrid[r][c];
                    this.energyGrid[r][c] = passGrid[r][c];
                }
            }
        }

        this.energyGrid = newEnergyGrid;

        const currentTime = Date.now();
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const key = `${row},${col}`;
                if (this.grid[row][col] === 'green' && this.energyGrid[row][col] === 20 && !(key in this.burnedLamps)) {
                    this.createFire(row, col, currentTime);
                }
            }
        }
    }

    shouldDeviceActivate(row, col, direction, tempEnergyGrid, type) {
        const inputPos = this.getInputPosition(row, col, direction);
        const [inputRow, inputCol] = inputPos;

        if (!(inputRow >= 0 && inputRow < this.gridSize && inputCol >= 0 && inputCol < this.gridSize)) {
            return false;
        }

        const inputCellType = this.grid[inputRow][inputCol];

        if (inputCellType === 'red') return true;
        if (['blue', 'green'].includes(inputCellType)) return tempEnergyGrid[inputRow][inputCol] > 0;
        if (inputCellType === 'switch') {
            return this.switchStates[`${inputRow},${inputCol}`] && tempEnergyGrid[inputRow][inputCol] > 0;
        }
        if (inputCellType === 'amplifier') {
            const inputDir = this.amplifierStates[`${inputRow},${inputCol}`] || 0;
            if (inputDir === direction) {
                return this.shouldDeviceActivate(inputRow, inputCol, inputDir, tempEnergyGrid, 'amplifier');
            }
        }
        if (inputCellType === 'inverter') {
            const inputDir = this.inverterStates[`${inputRow},${inputCol}`] || 0;
            if (inputDir === direction) {
                return this.shouldDeviceActivate(inputRow, inputCol, inputDir, tempEnergyGrid, 'inverter');
            }
        }

        return false;
    }

    getInputPosition(row, col, direction) {
        const positions = [
            [row, col - 1],
            [row - 1, col],
            [row, col + 1],
            [row + 1, col]
        ];
        return positions[direction];
    }

    getOutputPosition(row, col, direction) {
        const positions = [
            [row, col + 1],
            [row + 1, col],
            [row, col - 1],
            [row - 1, col]
        ];
        return positions[direction];
    }

    propagateEnergyFromSource(startRow, startCol, energyGrid) {
        const queue = [[startRow, startCol, 0]];
        const visited = new Set();
        visited.add(`${startRow},${startCol}`);

        while (queue.length > 0) {
            const [row, col, distance] = queue.shift();
            const currentEnergy = this.getEnergyByDistance(distance);

            if (currentEnergy > energyGrid[row][col]) {
                energyGrid[row][col] = currentEnergy;
            }

            if (currentEnergy <= 0) continue;

            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                const key = `${newRow},${newCol}`;

                if (newRow >= 0 && newRow < this.gridSize && newCol >= 0 && newCol < this.gridSize && !visited.has(key)) {
                    const cellType = this.grid[newRow][newCol];

                    if (cellType === 'blue') {
                        visited.add(key);
                        queue.push([newRow, newCol, distance + 1]);
                    } else if (cellType === 'green') {
                        if (currentEnergy > energyGrid[newRow][newCol]) {
                            energyGrid[newRow][newCol] = currentEnergy;
                        }
                        visited.add(key);
                    } else if (cellType === 'switch') {
                        if (this.switchStates[key]) {
                            visited.add(key);
                            queue.push([newRow, newCol, distance + 1]);
                        }
                    }
                }
            }
        }
    }

    propagateEnergyFromSourceWithDistance(startRow, startCol, energyGrid, startDistance) {
        const queue = [[startRow, startCol, startDistance]];
        const visited = new Set();
        visited.add(`${startRow},${startCol}`);

        while (queue.length > 0) {
            const [row, col, distance] = queue.shift();
            const currentEnergy = this.getEnergyByDistance(distance);

            if (currentEnergy > energyGrid[row][col]) {
                energyGrid[row][col] = currentEnergy;
            }

            if (currentEnergy <= 0) continue;

            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                const key = `${newRow},${newCol}`;

                if (newRow >= 0 && newRow < this.gridSize && newCol >= 0 && newCol < this.gridSize && !visited.has(key)) {
                    const cellType = this.grid[newRow][newCol];

                    if (cellType === 'blue') {
                        visited.add(key);
                        queue.push([newRow, newCol, distance + 1]);
                    } else if (cellType === 'green') {
                        if (currentEnergy > energyGrid[newRow][newCol]) {
                            energyGrid[newRow][newCol] = currentEnergy;
                        }
                        visited.add(key);
                    } else if (cellType === 'switch') {
                        if (this.switchStates[key]) {
                            visited.add(key);
                            queue.push([newRow, newCol, distance + 1]);
                        }
                    }
                }
            }
        }
    }

    getEnergyByDistance(distance) {
        if (distance === 0) return 20;
        if (distance === 1) return 20;
        if (distance === 2) return 20;
        if (distance === 3) return 15;
        if (distance === 4) return 15;
        if (distance === 5) return 10;
        if (distance === 6) return 10;
        if (distance === 7) return 5;
        if (distance === 8) return 5;
        return 0;
    }

    createFire(centerRow, centerCol, currentTime) {
        const directions = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dr, dc] of directions) {
            const newRow = centerRow + dr;
            const newCol = centerCol + dc;

            if (newRow >= 0 && newRow < this.gridSize && newCol >= 0 && newCol < this.gridSize) {
                const key = `${newRow},${newCol}`;
                // Каждый огонёк получает свой случайный таймер от 10 до 60 секунд
                const duration = 10000 + Math.random() * 50000;
                this.burnedLamps[key] = currentTime + duration;

                if (dr !== 0 || dc !== 0) {
                    this.grid[newRow][newCol] = null;
                }
            }
        }
    }

    getWireTexture(row, col) {
        const neighbors = [false, false, false, false];

        if (row > 0) {
            const cellType = this.grid[row - 1][col];
            if (cellType === 'amplifier' || cellType === 'inverter') {
                if (this.canConnectToAmplifier(row - 1, col, 2)) neighbors[0] = true;
            } else if (['blue', 'red', 'green', 'switch'].includes(cellType)) {
                neighbors[0] = true;
            }
        }
        
        if (col < this.gridSize - 1) {
            const cellType = this.grid[row][col + 1];
            if (cellType === 'amplifier' || cellType === 'inverter') {
                if (this.canConnectToAmplifier(row, col + 1, 3)) neighbors[1] = true;
            } else if (['blue', 'red', 'green', 'switch'].includes(cellType)) {
                neighbors[1] = true;
            }
        }
        
        if (row < this.gridSize - 1) {
            const cellType = this.grid[row + 1][col];
            if (cellType === 'amplifier' || cellType === 'inverter') {
                if (this.canConnectToAmplifier(row + 1, col, 0)) neighbors[2] = true;
            } else if (['blue', 'red', 'green', 'switch'].includes(cellType)) {
                neighbors[2] = true;
            }
        }
        
        if (col > 0) {
            const cellType = this.grid[row][col - 1];
            if (cellType === 'amplifier' || cellType === 'inverter') {
                if (this.canConnectToAmplifier(row, col - 1, 1)) neighbors[3] = true;
            } else if (['blue', 'red', 'green', 'switch'].includes(cellType)) {
                neighbors[3] = true;
            }
        }

        const [top, right, bottom, left] = neighbors;
        const connectionCount = neighbors.filter(Boolean).length;

        if (connectionCount === 0) return 'dot';
        if (connectionCount === 1) {
            if (top) return 'top';
            if (right) return 'right';
            if (bottom) return 'bottom';
            if (left) return 'left';
        }
        if (connectionCount === 2) {
            if (top && bottom) return 'vertical';
            if (left && right) return 'horizontal';
            if (top && right) return 'corner_top_right';
            if (top && left) return 'corner_top_left';
            if (bottom && right) return 'corner_bottom_right';
            if (bottom && left) return 'corner_bottom_left';
        }
        if (connectionCount === 3) {
            if (!top) return 't_bottom';
            if (!right) return 't_left';
            if (!bottom) return 't_top';
            if (!left) return 't_right';
        }
        if (connectionCount === 4) return 'x';

        return 'dot';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (!this.texturesLoaded) {
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Загрузка текстур...', this.width / 2, this.height / 2);
            return;
        }

        this.updatePower();

        const currentTime = Date.now();
        if (currentTime - this.lastAnimationTime > 1000 / this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.fireFrames.length;
            this.lastAnimationTime = currentTime;
        }

        for (const [key, expireTime] of Object.entries(this.burnedLamps)) {
	    if (currentTime > expireTime) {
	        const [row, col] = key.split(',').map(Number);
	        delete this.burnedLamps[key];
	        this.grid[row][col] = null;
	    }
	}

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = col * this.cellSize;
                const y = row * this.cellSize;
                const key = `${row},${col}`;

                this.ctx.fillStyle = this.colors.white;
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

                if (key in this.burnedLamps) {
                    if (this.fireFrames.length > 0) {
                        this.ctx.drawImage(this.fireFrames[this.currentFrame], x, y, this.cellSize, this.cellSize);
                    } else {
                        this.ctx.fillStyle = '#e74c3c';
                        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                    }
                } else {
                    const cellType = this.grid[row][col];
                    if (cellType) {
                        const energy = this.energyGrid[row][col];

                        if (cellType === 'red' && this.textures['psu']) {
                            this.ctx.drawImage(this.textures['psu'], x, y, this.cellSize, this.cellSize);
                        } else if (cellType === 'green') {
                            if (energy === 20 && this.fireFrames.length > 0) {
                                this.ctx.drawImage(this.fireFrames[this.currentFrame], x, y, this.cellSize, this.cellSize);
                            } else if (energy >= 10 && this.textures['lampon']) {
                                this.ctx.drawImage(this.textures['lampon'], x, y, this.cellSize, this.cellSize);
                            } else if (energy === 5 && this.textures['lamp5v']) {
                                this.ctx.drawImage(this.textures['lamp5v'], x, y, this.cellSize, this.cellSize);
                            } else if (this.textures['lampoff']) {
                                this.ctx.drawImage(this.textures['lampoff'], x, y, this.cellSize, this.cellSize);
                            }
                        } else if (cellType === 'blue') {
                            const wireType = this.getWireTexture(row, col);
                            if (this.wireTextures[wireType]) {
                                this.ctx.drawImage(this.wireTextures[wireType], x, y, this.cellSize, this.cellSize);
                            }

                            if (energy > 0) {
                                const alpha = energy === 20 ? 0.7 : energy === 15 ? 0.6 : energy === 10 ? 0.45 : 0.35;
                                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

                                this.ctx.fillStyle = '#000000';
                                this.ctx.font = 'bold 12px Arial';
                                this.ctx.textAlign = 'center';
                                this.ctx.textBaseline = 'middle';
                                this.ctx.fillText(energy, x + this.cellSize / 2, y + this.cellSize / 2);
                            }
                        } else if (cellType === 'switch') {
                            if (this.switchStates[key] && this.textures['switch_on']) {
                                this.ctx.drawImage(this.textures['switch_on'], x, y, this.cellSize, this.cellSize);
                            } else if (this.textures['switch_off']) {
                                this.ctx.drawImage(this.textures['switch_off'], x, y, this.cellSize, this.cellSize);
                            }
                        } else if (cellType === 'amplifier') {
                            const direction = this.amplifierStates[key] || 0;
                            const dirNames = ['right', 'down', 'left', 'up'];
                            const textureName = `amplifier_${dirNames[direction]}`;
                            if (this.textures[textureName]) {
                                this.ctx.drawImage(this.textures[textureName], x, y, this.cellSize, this.cellSize);
                            }
                        } else if (cellType === 'inverter') {
                            const direction = this.inverterStates[key] || 0;
                            const dirNames = ['right', 'down', 'left', 'up'];
                            const textureName = `inverter_${dirNames[direction]}`;
                            if (this.textures[textureName]) {
                                this.ctx.drawImage(this.textures[textureName], x, y, this.cellSize, this.cellSize);
                            }
                        }
                    }
                }

                this.ctx.strokeStyle = this.colors.gray;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
    }

    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SandboxGame(16, 40);
});

// Language switcher
(function() {
    let currentLang = 'en';
    const langBtn = document.getElementById('lang-btn');
    
    function updateLanguage() {
        if (currentLang === 'en') {
            langBtn.innerHTML = '🇷🇺 RU';
            langBtn.title = 'Switch to Russian';
        } else {
            langBtn.innerHTML = '🇬🇧 EN';
            langBtn.title = 'Switch to English';
        }
        
        // Обновляем подсказки для палитры
        document.querySelectorAll('.palette-item[data-lang-en][data-lang-ru]').forEach(el => {
            el.title = el.getAttribute(`data-lang-${currentLang}`);
        });
        
        // Обновляем текст в info
        document.querySelectorAll('#info [data-lang-en][data-lang-ru]').forEach(el => {
            el.textContent = el.getAttribute(`data-lang-${currentLang}`);
        });
    }
    
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ru' : 'en';
        updateLanguage();
    });
    
    updateLanguage();
})();