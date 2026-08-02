class SandboxGame {
    constructor(gridSize = 16, cellSize = 40) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.paletteHeight = 60;

        // Определяем, мобильное ли устройство
        this.isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window && window.innerWidth < 768);
        
        // На мобильных уменьшаем размер клетки, чтобы холст помещался
        if (this.isMobile) {
            const maxWidth = Math.min(window.innerWidth - 20, 600);
            this.cellSize = Math.floor(maxWidth / this.gridSize);
        }

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

        // Для мобильных устройств
        this.touchStartTime = 0;
        this.touchStartPos = null;
        this.isLongPress = false;
        this.longPressTimer = null;
        this.lastTouchCell = null;
        this.touchAction = null; // 'draw' или 'erase'

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
        if (['blue', 'green'].includes(inputCell) && this.energyGrid[inputRow][inputCol] > 0) return true;
        if (inputCell === 'switch' && this.switchStates[`${inputRow},${inputCol}`] && this.energyGrid[inputRow][inputCol] > 0) return true;
        
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
        let x0 = cell1.col, y0 = cell1.row;
        const x1 = cell2.col, y1 = cell2.row;
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        while (x0 !== x1 || y0 !== y1) {
            const e2 = 2 * err;
            let nextX = x0, nextY = y0;
            if (e2 > -dy) { err -= dy; nextX = x0 + sx; }
            if (e2 < dx) { err += dx; nextY = y0 + sy; }
            if (nextX !== x0 && nextY !== y0) {
                if (x0 + sx >= 0 && x0 + sx < this.gridSize && y0 >= 0 && y0 < this.gridSize) {
                    cells.push({ row: y0, col: x0 + sx });
                }
            }
            x0 = nextX; y0 = nextY;
            if (x0 !== x1 || y0 !== y1) {
                if (x0 >= 0 && x0 < this.gridSize && y0 >= 0 && y0 < this.gridSize) {
                    cells.push({ row: y0, col: x0 });
                }
            }
        }
        return cells;
    }

    updateCursor(e) {
        if (this.isMobile) return;
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

    getCellFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (y < this.gridSize * this.cellSize && x >= 0 && x < this.width) {
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                return { row, col };
            }
        }
        return null;
    }

    bindEvents() {
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('selectstart', (e) => {
            const controls = document.getElementById('controls');
            const gameContainer = document.getElementById('game-container');
            if ((gameContainer && gameContainer.contains(e.target)) || 
                (controls && controls.contains(e.target)) || e.target === this.canvas) {
                e.preventDefault();
            }
        });
        document.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
        this.canvas.addEventListener('dblclick', (e) => e.preventDefault());

        if (this.isMobile) {
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        } else {
            this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.canvas.addEventListener('mousemove', (e) => this.updateCursor(e));
            this.canvas.addEventListener('mouseleave', () => {
                this.canvas.style.cursor = 'default';
                this.lastHoveredCell = null;
            });
        }

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
            item.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
            item.addEventListener('mousedown', (e) => {
                if (e.button === 2) { e.preventDefault(); e.stopPropagation(); }
            });
        });
    }

    // Мобильные обработчики
    handleTouchStart(e) {
        e.preventDefault();
        const cell = this.getCellFromEvent(e);
        if (!cell) return;

        this.touchStartTime = Date.now();
        this.touchStartPos = { row: cell.row, col: cell.col };
        this.isLongPress = false;
        this.lastTouchCell = null;
        this.touchAction = null;

        // Запускаем таймер на 500 мс для длинного нажатия
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
            this.isLongPress = true;
            this.lastTouchCell = { row: cell.row, col: cell.col };
            
            const cellType = this.grid[cell.row][cell.col];
            // Определяем действие: если клетка пустая или провод - рисуем, иначе стираем
            if (!cellType || cellType === 'blue') {
                this.touchAction = 'draw';
            } else {
                this.touchAction = 'erase';
            }
            
            // Выполняем первое действие
            if (this.touchAction === 'erase') {
                this.handleRightClick(cell.row, cell.col);
            } else if (this.touchAction === 'draw' && this.selectedColor === 'blue') {
                const key = `${cell.row},${cell.col}`;
                if (!(key in this.burnedLamps)) {
                    this.grid[cell.row][cell.col] = 'blue';
                }
            }
        }, 500);
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isLongPress) {
            // Если палец сдвинулся до истечения 500 мс - отменяем длинное нажатие
            const cell = this.getCellFromEvent(e);
            if (cell && this.touchStartPos && 
                (Math.abs(cell.row - this.touchStartPos.row) > 1 || 
                 Math.abs(cell.col - this.touchStartPos.col) > 1)) {
                clearTimeout(this.longPressTimer);
            }
            return;
        }

        const cell = this.getCellFromEvent(e);
        if (!cell) return;

        const currentCell = { row: cell.row, col: cell.col };

        if (this.lastTouchCell && 
            (this.lastTouchCell.row !== currentCell.row || this.lastTouchCell.col !== currentCell.col)) {
            
            const cellsBetween = this.getCellsBetween(this.lastTouchCell, currentCell);
            for (const betweenCell of cellsBetween) {
                this.performTouchAction(betweenCell.row, betweenCell.col);
            }
        }

        this.performTouchAction(cell.row, cell.col);
        this.lastTouchCell = currentCell;
    }

    performTouchAction(row, col) {
        if (this.touchAction === 'erase') {
            this.handleRightClick(row, col);
        } else if (this.touchAction === 'draw' && this.selectedColor === 'blue') {
            const key = `${row},${col}`;
            if (!(key in this.burnedLamps)) {
                const cellType = this.grid[row][col];
                if (!cellType || cellType === 'blue') {
                    this.grid[row][col] = 'blue';
                }
            }
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
        
        // Если не было длинного нажатия - это короткий тап
        if (!this.isLongPress && this.touchStartPos) {
            const cell = this.touchStartPos;
            const cellType = this.grid[cell.row][cell.col];
            
            if (cellType === 'switch' || cellType === 'amplifier' || cellType === 'inverter') {
                this.handleLeftClick(cell.row, cell.col);
            } else if (this.selectedColor) {
                const key = `${cell.row},${cell.col}`;
                if (!(key in this.burnedLamps)) {
                    if (this.selectedColor === 'amplifier') {
                        this.grid[cell.row][cell.col] = 'amplifier';
                        const direction = this.autoDetermineDirection(cell.row, cell.col, 'amplifier');
                        this.amplifierStates[key] = direction;
                    } else if (this.selectedColor === 'inverter') {
                        this.grid[cell.row][cell.col] = 'inverter';
                        const direction = this.autoDetermineDirection(cell.row, cell.col, 'inverter');
                        this.inverterStates[key] = direction;
                    } else {
                        this.grid[cell.row][cell.col] = this.selectedColor;
                    }
                }
            }
        }

        this.isLongPress = false;
        this.touchStartPos = null;
        this.lastTouchCell = null;
        this.touchAction = null;
    }

    // Десктопные обработчики
    handleMouseDown(e) {
        const cell = this.getCellFromEvent(e);
        if (!cell) return;
        this.lastMouseCell = null;

        if (e.button === 0) {
            this.isLeftMouseDown = true;
            const cellType = this.grid[cell.row][cell.col];
            if (cellType === 'switch' || cellType === 'amplifier' || cellType === 'inverter') {
                this.handleLeftClick(cell.row, cell.col);
                this.lastMouseCell = { row: cell.row, col: cell.col };
                return;
            }
            if (this.selectedColor === 'amplifier') {
                const key = `${cell.row},${cell.col}`;
                if (!(key in this.burnedLamps)) {
                    this.grid[cell.row][cell.col] = 'amplifier';
                    this.placingAmplifier = true;
                    this.amplifierPlacePos = { row: cell.row, col: cell.col };
                    this.amplifierStates[key] = this.autoDetermineDirection(cell.row, cell.col, 'amplifier');
                    this.canvas.style.cursor = 'pointer';
                }
            } else if (this.selectedColor === 'inverter') {
                const key = `${cell.row},${cell.col}`;
                if (!(key in this.burnedLamps)) {
                    this.grid[cell.row][cell.col] = 'inverter';
                    this.placingInverter = true;
                    this.inverterPlacePos = { row: cell.row, col: cell.col };
                    this.inverterStates[key] = this.autoDetermineDirection(cell.row, cell.col, 'inverter');
                    this.canvas.style.cursor = 'pointer';
                }
            } else {
                this.handleLeftClick(cell.row, cell.col);
            }
            this.lastMouseCell = { row: cell.row, col: cell.col };
        } else if (e.button === 2) {
            this.isRightMouseDown = true;
            this.handleRightClick(cell.row, cell.col);
            this.lastMouseCell = { row: cell.row, col: cell.col };
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
        if (e.button === 2) this.isRightMouseDown = false;
        if (!this.isLeftMouseDown && !this.isRightMouseDown) this.lastMouseCell = null;
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
        
        const cell = this.getCellFromEvent(e);
        if (!cell) return;
        const currentCell = { row: cell.row, col: cell.col };

        if (this.lastMouseCell && 
            (this.lastMouseCell.row !== currentCell.row || this.lastMouseCell.col !== currentCell.col)) {
            const cellsBetween = this.getCellsBetween(this.lastMouseCell, currentCell);
            for (const betweenCell of cellsBetween) {
                if (this.isRightMouseDown) this.handleRightClick(betweenCell.row, betweenCell.col);
                if (this.isLeftMouseDown && this.selectedColor === 'blue') {
                    const key = `${betweenCell.row},${betweenCell.col}`;
                    if (!(key in this.burnedLamps)) {
                        const ct = this.grid[betweenCell.row][betweenCell.col];
                        if (!ct || ct === 'blue') this.grid[betweenCell.row][betweenCell.col] = 'blue';
                    }
                }
            }
        }
        if (this.isRightMouseDown) this.handleRightClick(cell.row, cell.col);
        if (this.isLeftMouseDown && this.selectedColor === 'blue') {
            const key = `${cell.row},${cell.col}`;
            if (!(key in this.burnedLamps)) {
                const ct = this.grid[cell.row][cell.col];
                if (!ct || ct === 'blue') this.grid[cell.row][cell.col] = 'blue';
            }
        }
        this.lastMouseCell = currentCell;
    }

    handleDirectionSelection(placePos, type, e) {
        const cell = this.getCellFromEvent(e);
        if (!cell) return;
        const key = `${placePos.row},${placePos.col}`;
        let newDir = null;
        if (cell.row < placePos.row && cell.col === placePos.col) newDir = 3;
        else if (cell.row > placePos.row && cell.col === placePos.col) newDir = 1;
        else if (cell.col < placePos.col && cell.row === placePos.row) newDir = 2;
        else if (cell.col > placePos.col && cell.row === placePos.row) newDir = 0;
        if (newDir !== null) {
            if (type === 'amplifier') this.amplifierStates[key] = newDir;
            else if (type === 'inverter') this.inverterStates[key] = newDir;
        }
    }

    handleLeftClick(row, col) {
        const key = `${row},${col}`;
        if (key in this.burnedLamps) return;
        const cellType = this.grid[row][col];
        if (cellType === 'switch') { this.switchStates[key] = !this.switchStates[key]; return; }
        if (cellType === 'amplifier') { this.amplifierStates[key] = ((this.amplifierStates[key] || 0) - 1 + 4) % 4; return; }
        if (cellType === 'inverter') { this.inverterStates[key] = ((this.inverterStates[key] || 0) - 1 + 4) % 4; return; }
        if (this.selectedColor) {
            this.grid[row][col] = this.selectedColor;
            if (this.selectedColor === 'amplifier') this.amplifierStates[key] = this.autoDetermineDirection(row, col, 'amplifier');
            else if (this.selectedColor === 'inverter') this.inverterStates[key] = this.autoDetermineDirection(row, col, 'inverter');
        }
    }

    handleRightClick(row, col) {
        const key = `${row},${col}`;
        if (this.burnedLamps[key]) return;
        const cellType = this.grid[row][col];
        this.grid[row][col] = null;
        if (cellType === 'switch') delete this.switchStates[key];
        else if (cellType === 'amplifier') delete this.amplifierStates[key];
        else if (cellType === 'inverter') delete this.inverterStates[key];
    }

    autoDetermineDirection(row, col, type) {
        let leftEnergy = 0, rightEnergy = 0, topEnergy = 0, bottomEnergy = 0;
        if (col > 0 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row][col - 1])) leftEnergy = this.energyGrid[row][col - 1];
        if (col < this.gridSize - 1 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row][col + 1])) rightEnergy = this.energyGrid[row][col + 1];
        if (row > 0 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row - 1][col])) topEnergy = this.energyGrid[row - 1][col];
        if (row < this.gridSize - 1 && ['blue', 'red', 'green', 'switch'].includes(this.grid[row + 1][col])) bottomEnergy = this.energyGrid[row + 1][col];

        const horizontalPower = Math.max(leftEnergy, rightEnergy);
        const verticalPower = Math.max(topEnergy, bottomEnergy);
        if (horizontalPower > 0 || verticalPower > 0) {
            if (horizontalPower > verticalPower) return leftEnergy >= rightEnergy ? 0 : 2;
            else return topEnergy >= bottomEnergy ? 1 : 3;
        }

        let activeDevices = [];
        const checkDevice = (r, c, expectedDir) => {
            const k = `${r},${c}`;
            const ct = this.grid[r][c];
            let d;
            if (ct === 'amplifier') d = this.amplifierStates[k] || 0;
            else if (ct === 'inverter') d = this.inverterStates[k] || 0;
            else return;
            if (d === expectedDir && (this.energyGrid[r][c] > 0 || this.isAmplifierPowered(r, c))) activeDevices.push(d);
        };

        if (row > 0 && (this.grid[row - 1][col] === 'amplifier' || this.grid[row - 1][col] === 'inverter')) checkDevice(row - 1, col, 1);
        if (col < this.gridSize - 1 && (this.grid[row][col + 1] === 'amplifier' || this.grid[row][col + 1] === 'inverter')) checkDevice(row, col + 1, 2);
        if (row < this.gridSize - 1 && (this.grid[row + 1][col] === 'amplifier' || this.grid[row + 1][col] === 'inverter')) checkDevice(row + 1, col, 3);
        if (col > 0 && (this.grid[row][col - 1] === 'amplifier' || this.grid[row][col - 1] === 'inverter')) checkDevice(row, col - 1, 0);

        if (activeDevices.length === 1) return activeDevices[0];
        return 0;
    }

    updatePower() {
        const newEnergyGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        let changed = true, iterations = 0;
        const maxIterations = 100;
        for (let r = 0; r < this.gridSize; r++) for (let c = 0; c < this.gridSize; c++) this.energyGrid[r][c] = 0;

        while (changed && iterations < maxIterations) {
            changed = false; iterations++;
            const passGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    if (this.grid[row][col] === 'red') {
                        const sourceGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
                        this.propagateEnergyFromSource(row, col, sourceGrid);
                        for (let r = 0; r < this.gridSize; r++) for (let c = 0; c < this.gridSize; c++) if (sourceGrid[r][c] > passGrid[r][c]) passGrid[r][c] = sourceGrid[r][c];
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
                                for (let r = 0; r < this.gridSize; r++) for (let c = 0; c < this.gridSize; c++) if (deviceGrid[r][c] > passGrid[r][c]) passGrid[r][c] = deviceGrid[r][c];
                            }
                        }
                    }
                }
            }

            for (const [key, direction] of Object.entries(this.inverterStates)) {
                const [row, col] = key.split(',').map(Number);
                if (!this.shouldDeviceActivate(row, col, direction, this.energyGrid, 'inverter')) {
                    const [outRow, outCol] = this.getOutputPosition(row, col, direction);
                    if (outRow >= 0 && outRow < this.gridSize && outCol >= 0 && outCol < this.gridSize) {
                        const outCellType = this.grid[outRow][outCol];
                        if (!(outCellType === 'switch' && !this.switchStates[`${outRow},${outCol}`])) {
                            if (['blue', 'green', 'switch'].includes(outCellType)) {
                                const inverterGrid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
                                inverterGrid[outRow][outCol] = 20;
                                this.propagateEnergyFromSourceWithDistance(outRow, outCol, inverterGrid, 1);
                                for (let r = 0; r < this.gridSize; r++) for (let c = 0; c < this.gridSize; c++) if (inverterGrid[r][c] > passGrid[r][c]) passGrid[r][c] = inverterGrid[r][c];
                            }
                        }
                    }
                }
            }

            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (passGrid[r][c] !== this.energyGrid[r][c]) changed = true;
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
        const [inputRow, inputCol] = this.getInputPosition(row, col, direction);
        if (!(inputRow >= 0 && inputRow < this.gridSize && inputCol >= 0 && inputCol < this.gridSize)) return false;
        const inputCellType = this.grid[inputRow][inputCol];
        if (inputCellType === 'red') return true;
        if (['blue', 'green'].includes(inputCellType)) return tempEnergyGrid[inputRow][inputCol] > 0;
        if (inputCellType === 'switch') return this.switchStates[`${inputRow},${inputCol}`] && tempEnergyGrid[inputRow][inputCol] > 0;
        if (inputCellType === 'amplifier') {
            const inputDir = this.amplifierStates[`${inputRow},${inputCol}`] || 0;
            if (inputDir === direction) return this.shouldDeviceActivate(inputRow, inputCol, inputDir, tempEnergyGrid, 'amplifier');
        }
        if (inputCellType === 'inverter') {
            const inputDir = this.inverterStates[`${inputRow},${inputCol}`] || 0;
            if (inputDir === direction) return this.shouldDeviceActivate(inputRow, inputCol, inputDir, tempEnergyGrid, 'inverter');
        }
        return false;
    }

    getInputPosition(row, col, direction) {
        return [[row, col - 1], [row - 1, col], [row, col + 1], [row + 1, col]][direction];
    }

    getOutputPosition(row, col, direction) {
        return [[row, col + 1], [row + 1, col], [row, col - 1], [row - 1, col]][direction];
    }

    propagateEnergyFromSource(startRow, startCol, energyGrid) {
        const queue = [[startRow, startCol, 0]], visited = new Set([`${startRow},${startCol}`]);
        while (queue.length > 0) {
            const [row, col, distance] = queue.shift();
            const currentEnergy = this.getEnergyByDistance(distance);
            if (currentEnergy > energyGrid[row][col]) energyGrid[row][col] = currentEnergy;
            if (currentEnergy <= 0) continue;
            for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nr = row + dr, nc = col + dc, key = `${nr},${nc}`;
                if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize && !visited.has(key)) {
                    const ct = this.grid[nr][nc];
                    if (ct === 'blue') { visited.add(key); queue.push([nr, nc, distance + 1]); }
                    else if (ct === 'green') { if (currentEnergy > energyGrid[nr][nc]) energyGrid[nr][nc] = currentEnergy; visited.add(key); }
                    else if (ct === 'switch' && this.switchStates[key]) { visited.add(key); queue.push([nr, nc, distance + 1]); }
                }
            }
        }
    }

    propagateEnergyFromSourceWithDistance(startRow, startCol, energyGrid, startDistance) {
        const queue = [[startRow, startCol, startDistance]], visited = new Set([`${startRow},${startCol}`]);
        while (queue.length > 0) {
            const [row, col, distance] = queue.shift();
            const currentEnergy = this.getEnergyByDistance(distance);
            if (currentEnergy > energyGrid[row][col]) energyGrid[row][col] = currentEnergy;
            if (currentEnergy <= 0) continue;
            for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nr = row + dr, nc = col + dc, key = `${nr},${nc}`;
                if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize && !visited.has(key)) {
                    const ct = this.grid[nr][nc];
                    if (ct === 'blue') { visited.add(key); queue.push([nr, nc, distance + 1]); }
                    else if (ct === 'green') { if (currentEnergy > energyGrid[nr][nc]) energyGrid[nr][nc] = currentEnergy; visited.add(key); }
                    else if (ct === 'switch' && this.switchStates[key]) { visited.add(key); queue.push([nr, nc, distance + 1]); }
                }
            }
        }
    }

    getEnergyByDistance(distance) {
        if (distance <= 2) return 20;
        if (distance <= 4) return 15;
        if (distance <= 6) return 10;
        if (distance <= 8) return 5;
        return 0;
    }

    createFire(centerRow, centerCol, currentTime) {
        for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = centerRow + dr, nc = centerCol + dc;
            if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                const key = `${nr},${nc}`;
                this.burnedLamps[key] = currentTime + 10000 + Math.random() * 50000;
                if (dr !== 0 || dc !== 0) this.grid[nr][nc] = null;
            }
        }
    }

    getWireTexture(row, col) {
        const neighbors = [false, false, false, false];
        const checkNeighbor = (r, c, dir) => {
            const ct = this.grid[r][c];
            if (ct === 'amplifier' || ct === 'inverter') return this.canConnectToAmplifier(r, c, dir);
            return ['blue', 'red', 'green', 'switch'].includes(ct);
        };
        if (row > 0) neighbors[0] = checkNeighbor(row - 1, col, 2);
        if (col < this.gridSize - 1) neighbors[1] = checkNeighbor(row, col + 1, 3);
        if (row < this.gridSize - 1) neighbors[2] = checkNeighbor(row + 1, col, 0);
        if (col > 0) neighbors[3] = checkNeighbor(row, col - 1, 1);
        const [top, right, bottom, left] = neighbors;
        const cnt = neighbors.filter(Boolean).length;
        if (cnt === 0) return 'dot';
        if (cnt === 1) return top ? 'top' : right ? 'right' : bottom ? 'bottom' : 'left';
        if (cnt === 2) {
            if (top && bottom) return 'vertical';
            if (left && right) return 'horizontal';
            if (top && right) return 'corner_top_right';
            if (top && left) return 'corner_top_left';
            if (bottom && right) return 'corner_bottom_right';
            if (bottom && left) return 'corner_bottom_left';
        }
        if (cnt === 3) return !top ? 't_bottom' : !right ? 't_left' : !bottom ? 't_top' : 't_right';
        return 'x';
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
                const x = col * this.cellSize, y = row * this.cellSize, key = `${row},${col}`;
                this.ctx.fillStyle = this.colors.white;
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                if (key in this.burnedLamps) {
                    if (this.fireFrames.length > 0) this.ctx.drawImage(this.fireFrames[this.currentFrame], x, y, this.cellSize, this.cellSize);
                    else { this.ctx.fillStyle = '#e74c3c'; this.ctx.fillRect(x, y, this.cellSize, this.cellSize); }
                } else {
                    const cellType = this.grid[row][col];
                    if (cellType) {
                        const energy = this.energyGrid[row][col];
                        if (cellType === 'red' && this.textures['psu']) this.ctx.drawImage(this.textures['psu'], x, y, this.cellSize, this.cellSize);
                        else if (cellType === 'green') {
                            if (energy === 20 && this.fireFrames.length > 0) this.ctx.drawImage(this.fireFrames[this.currentFrame], x, y, this.cellSize, this.cellSize);
                            else if (energy >= 10 && this.textures['lampon']) this.ctx.drawImage(this.textures['lampon'], x, y, this.cellSize, this.cellSize);
                            else if (energy === 5 && this.textures['lamp5v']) this.ctx.drawImage(this.textures['lamp5v'], x, y, this.cellSize, this.cellSize);
                            else if (this.textures['lampoff']) this.ctx.drawImage(this.textures['lampoff'], x, y, this.cellSize, this.cellSize);
                        } else if (cellType === 'blue') {
                            const wireType = this.getWireTexture(row, col);
                            if (this.wireTextures[wireType]) this.ctx.drawImage(this.wireTextures[wireType], x, y, this.cellSize, this.cellSize);
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
                            if (this.switchStates[key] && this.textures['switch_on']) this.ctx.drawImage(this.textures['switch_on'], x, y, this.cellSize, this.cellSize);
                            else if (this.textures['switch_off']) this.ctx.drawImage(this.textures['switch_off'], x, y, this.cellSize, this.cellSize);
                        } else if (cellType === 'amplifier') {
                            const dir = this.amplifierStates[key] || 0;
                            const tex = this.textures[`amplifier_${['right','down','left','up'][dir]}`];
                            if (tex) this.ctx.drawImage(tex, x, y, this.cellSize, this.cellSize);
                        } else if (cellType === 'inverter') {
                            const dir = this.inverterStates[key] || 0;
                            const tex = this.textures[`inverter_${['right','down','left','up'][dir]}`];
                            if (tex) this.ctx.drawImage(tex, x, y, this.cellSize, this.cellSize);
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
        document.querySelectorAll('.palette-item[data-lang-en][data-lang-ru]').forEach(el => {
            el.title = el.getAttribute(`data-lang-${currentLang}`);
        });
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