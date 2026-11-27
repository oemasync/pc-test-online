// Framework-free logic for the touch test module.
// No Vue imports, no src/core imports.

export interface PointerSample {
    pointerId: number;
    x: number;
    y: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
    width?: number;
    height?: number;
    pointerType: string;
    timestamp: number;
}

export interface CoverageGrid {
    rows: number;
    cols: number;
    hit: boolean[];
}

export interface PointerTrackerState {
    active: Map<number, PointerSample>;
    maxSimultaneous: number;
}

// ---------- Pointer type helpers ----------

export function isTouchPointer(pointerType: string): boolean {
    return pointerType === 'touch';
}

export function isPenPointer(pointerType: string): boolean {
    return pointerType === 'pen';
}

// ---------- Support ----------

export function isTouchSupported(maxTouchPoints: number): boolean {
    return maxTouchPoints > 0;
}

// ---------- Reported-value helpers ----------

export function isReported(value: number | null | undefined): boolean {
    return value !== null && value !== undefined;
}

export function clampTilt(value: number): number {
    if (value < -90) return -90;
    if (value > 90) return 90;
    return value;
}

// ---------- Coverage grid ----------

export function createCoverageGrid(rows: number, cols: number): CoverageGrid {
    const safeRows = rows > 0 ? rows : 0;
    const safeCols = cols > 0 ? cols : 0;
    return {
        rows: safeRows,
        cols: safeCols,
        hit: new Array<boolean>(safeRows * safeCols).fill(false),
    };
}

export function inBounds(grid: CoverageGrid, row: number, col: number): boolean {
    return row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;
}

export function cellIndex(grid: CoverageGrid, row: number, col: number): number {
    return row * grid.cols + col;
}

function cloneGrid(grid: CoverageGrid): CoverageGrid {
    return { rows: grid.rows, cols: grid.cols, hit: grid.hit.slice() };
}

export function markCell(grid: CoverageGrid, row: number, col: number): CoverageGrid {
    const next = cloneGrid(grid);
    if (inBounds(grid, row, col)) {
        next.hit[cellIndex(grid, row, col)] = true;
    }
    return next;
}

export function pointToCell(
    x: number,
    y: number,
    width: number,
    height: number,
    rows: number,
    cols: number,
): { row: number; col: number } | null {
    if (width <= 0 || height <= 0 || rows <= 0 || cols <= 0) return null;
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const col = Math.floor((x / width) * cols);
    const row = Math.floor((y / height) * rows);
    const clampedCol = Math.min(cols - 1, Math.max(0, col));
    const clampedRow = Math.min(rows - 1, Math.max(0, row));
    return { row: clampedRow, col: clampedCol };
}

export function lineCells(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
): Array<[number, number]> {
    const cells: Array<[number, number]> = [];
    let r = r0;
    let c = c0;
    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const sr = r0 < r1 ? 1 : -1;
    const sc = c0 < c1 ? 1 : -1;
    let err = dr - dc;
    // Guard against infinite loop if inputs equal handled by break.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        cells.push([r, c]);
        if (r === r1 && c === c1) break;
        const e2 = 2 * err;
        if (e2 > -dc) {
            err -= dc;
            r += sr;
        }
        if (e2 < dr) {
            err += dr;
            c += sc;
        }
    }
    return cells;
}

export function markPoint(
    grid: CoverageGrid,
    x: number,
    y: number,
    width: number,
    height: number,
): CoverageGrid {
    const cell = pointToCell(x, y, width, height, grid.rows, grid.cols);
    if (!cell) return cloneGrid(grid);
    return markCell(grid, cell.row, cell.col);
}

export function markPath(
    grid: CoverageGrid,
    points: ReadonlyArray<{ x: number; y: number }>,
    width: number,
    height: number,
): CoverageGrid {
    let current = cloneGrid(grid);
    if (points.length === 0) return current;
    for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (!point) continue;
        const cell = pointToCell(point.x, point.y, width, height, current.rows, current.cols);
        if (cell) current = markCell(current, cell.row, cell.col);
        if (i > 0) {
            const prev = points[i - 1];
            if (!prev) continue;
            const prevCell = pointToCell(prev.x, prev.y, width, height, current.rows, current.cols);
            if (prevCell && cell) {
                const cells = lineCells(prevCell.row, prevCell.col, cell.row, cell.col);
                for (const [r, c] of cells) {
                    current = markCell(current, r, c);
                }
            }
        }
    }
    return current;
}

export function coveredCount(grid: CoverageGrid): number {
    let count = 0;
    for (const v of grid.hit) if (v) count += 1;
    return count;
}

export function totalCells(grid: CoverageGrid): number {
    return grid.rows * grid.cols;
}

export function coverageRatio(grid: CoverageGrid): number {
    const total = totalCells(grid);
    if (total === 0) return 0;
    return coveredCount(grid) / total;
}

export function isFullyCovered(grid: CoverageGrid): boolean {
    const total = totalCells(grid);
    if (total === 0) return false;
    return coveredCount(grid) === total;
}

// ---------- Reducer for coverage ----------

export type CoverageAction =
    | { type: 'reset'; rows: number; cols: number }
    | { type: 'markCell'; row: number; col: number }
    | { type: 'markPoint'; x: number; y: number; width: number; height: number }
    | { type: 'markPath'; points: ReadonlyArray<{ x: number; y: number }>; width: number; height: number };

export function coverageReducer(grid: CoverageGrid, action: CoverageAction): CoverageGrid {
    switch (action.type) {
        case 'reset':
            return createCoverageGrid(action.rows, action.cols);
        case 'markCell':
            return markCell(grid, action.row, action.col);
        case 'markPoint':
            return markPoint(grid, action.x, action.y, action.width, action.height);
        case 'markPath':
            return markPath(grid, action.points, action.width, action.height);
        default:
            return grid;
    }
}

// ---------- Active pointer tracker + max simultaneous ----------

export function createPointerTracker(): PointerTrackerState {
    return { active: new Map<number, PointerSample>(), maxSimultaneous: 0 };
}

export type PointerTrackerAction =
    | { type: 'down'; sample: PointerSample }
    | { type: 'move'; sample: PointerSample }
    | { type: 'up'; pointerId: number }
    | { type: 'cancel'; pointerId: number }
    | { type: 'clear' };

export function pointerTrackerReducer(
    state: PointerTrackerState,
    action: PointerTrackerAction,
): PointerTrackerState {
    switch (action.type) {
        case 'down': {
            const active = new Map(state.active);
            active.set(action.sample.pointerId, action.sample);
            const maxSimultaneous =
                active.size > state.maxSimultaneous ? active.size : state.maxSimultaneous;
            return { active, maxSimultaneous };
        }
        case 'move': {
            if (!state.active.has(action.sample.pointerId)) return state;
            const active = new Map(state.active);
            active.set(action.sample.pointerId, action.sample);
            return { active, maxSimultaneous: state.maxSimultaneous };
        }
        case 'up':
        case 'cancel': {
            if (!state.active.has(action.pointerId)) return state;
            const active = new Map(state.active);
            active.delete(action.pointerId);
            return { active, maxSimultaneous: state.maxSimultaneous };
        }
        case 'clear': {
            return { active: new Map<number, PointerSample>(), maxSimultaneous: state.maxSimultaneous };
        }
        default:
            return state;
    }
}

// Standalone helpers retained for direct use / tests.
export function addPointer(
    active: ReadonlyMap<number, PointerSample>,
    sample: PointerSample,
): Map<number, PointerSample> {
    const next = new Map(active);
    next.set(sample.pointerId, sample);
    return next;
}

export function movePointer(
    active: ReadonlyMap<number, PointerSample>,
    sample: PointerSample,
): Map<number, PointerSample> {
    if (!active.has(sample.pointerId)) return new Map(active);
    const next = new Map(active);
    next.set(sample.pointerId, sample);
    return next;
}

export function removePointer(
    active: ReadonlyMap<number, PointerSample>,
    pointerId: number,
): Map<number, PointerSample> {
    const next = new Map(active);
    next.delete(pointerId);
    return next;
}

export function activeCount(active: ReadonlyMap<number, PointerSample>): number {
    return active.size;
}

export function getPointer(
    active: ReadonlyMap<number, PointerSample>,
    pointerId: number,
): PointerSample | undefined {
    return active.get(pointerId);
}

export function maxSimultaneousValue(currentMax: number, activeCount: number): number {
    return activeCount > currentMax ? activeCount : currentMax;
}
