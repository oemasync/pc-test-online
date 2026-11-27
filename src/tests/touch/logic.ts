// Framework-free logic for the touch test module.
// No Vue imports, no src/core imports.

export type PointerType = 'mouse' | 'pen' | 'touch';

export interface PointerSample {
    pointerId: number;
    x: number;
    y: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
    width?: number;
    height?: number;
    pointerType: PointerType;
    timestamp: number;
}

export interface NormalizedPoint {
    x: number;
    y: number;
    pointerId?: number;
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

// ---------- Support ----------

export function isTouchSupported(maxTouchPoints: number): boolean {
    return maxTouchPoints > 0;
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

function cloneGrid(grid: CoverageGrid): CoverageGrid {
    return { rows: grid.rows, cols: grid.cols, hit: grid.hit.slice() };
}

export function pointToCell(
    x: number,
    y: number,
    rows: number,
    cols: number,
): { row: number; col: number } | null {
    if (rows <= 0 || cols <= 0) return null;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    const col = Math.min(cols - 1, Math.floor(x * cols));
    const row = Math.min(rows - 1, Math.floor(y * rows));
    return { row, col };
}

export function lineCells(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
): Array<[number, number]> {
    const cells: Array<[number, number]> = [];
    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const sr = r0 < r1 ? 1 : r0 > r1 ? -1 : 0;
    const sc = c0 < c1 ? 1 : c0 > c1 ? -1 : 0;
    let err = dr - dc;
    const maxSteps = dr + dc + 1;
    let r = r0;
    let c = c0;
    for (let step = 0; step < maxSteps; step += 1) {
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

export function markPath(
    grid: CoverageGrid,
    samples: ReadonlyArray<NormalizedPoint>,
): CoverageGrid {
    const next = cloneGrid(grid);
    if (samples.length === 0) return next;

    const hasPointerId = samples.some((s) => s.pointerId !== undefined);
    const groups: Array<ReadonlyArray<NormalizedPoint>> = [];
    if (hasPointerId) {
        const byId = new Map<number, NormalizedPoint[]>();
        const noId: NormalizedPoint[] = [];
        for (const s of samples) {
            if (s.pointerId === undefined) {
                noId.push(s);
            } else {
                const existing = byId.get(s.pointerId);
                if (existing) {
                    existing.push(s);
                } else {
                    byId.set(s.pointerId, [s]);
                }
            }
        }
        for (const g of byId.values()) groups.push(g);
        if (noId.length > 0) groups.push(noId);
    } else {
        groups.push(samples);
    }

    for (const group of groups) {
        for (let i = 0; i < group.length; i += 1) {
            const point = group[i];
            if (!point) continue;
            const cell = pointToCell(point.x, point.y, next.rows, next.cols);
            if (cell) {
                next.hit[cell.row * next.cols + cell.col] = true;
            }
            if (i > 0) {
                const prev = group[i - 1];
                if (!prev) continue;
                const prevCell = pointToCell(prev.x, prev.y, next.rows, next.cols);
                if (prevCell && cell) {
                    const cells = lineCells(prevCell.row, prevCell.col, cell.row, cell.col);
                    for (const [r, c] of cells) {
                        if (r >= 0 && r < next.rows && c >= 0 && c < next.cols) {
                            next.hit[r * next.cols + c] = true;
                        }
                    }
                }
            }
        }
    }
    return next;
}

export function coveredCount(grid: CoverageGrid): number {
    let count = 0;
    for (const v of grid.hit) if (v) count += 1;
    return count;
}

export function coverageRatio(grid: CoverageGrid): number {
    const total = grid.rows * grid.cols;
    if (total === 0) return 0;
    return coveredCount(grid) / total;
}

export function isFullyCovered(grid: CoverageGrid): boolean {
    const total = grid.rows * grid.cols;
    if (total === 0) return false;
    return coveredCount(grid) === total;
}

// ---------- Reducer for coverage ----------

export type CoverageAction =
    | { type: 'reset'; rows: number; cols: number }
    | { type: 'markCell'; row: number; col: number }
    | { type: 'markPoint'; x: number; y: number }
    | { type: 'markPath'; samples: ReadonlyArray<NormalizedPoint> };

export function coverageReducer(grid: CoverageGrid, action: CoverageAction): CoverageGrid {
    switch (action.type) {
        case 'reset':
            return createCoverageGrid(action.rows, action.cols);
        case 'markCell': {
            const next = cloneGrid(grid);
            if (
                action.row >= 0 &&
                action.row < grid.rows &&
                action.col >= 0 &&
                action.col < grid.cols
            ) {
                next.hit[action.row * grid.cols + action.col] = true;
            }
            return next;
        }
        case 'markPoint': {
            const cell = pointToCell(action.x, action.y, grid.rows, grid.cols);
            if (!cell) return cloneGrid(grid);
            const next = cloneGrid(grid);
            next.hit[cell.row * grid.cols + cell.col] = true;
            return next;
        }
        case 'markPath':
            return markPath(grid, action.samples);
        default: {
            const exhaustive: never = action;
            throw new Error(`Unhandled coverage action: ${String(exhaustive)}`);
        }
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
        default: {
            const exhaustive: never = action;
            throw new Error(`Unhandled pointer action: ${String(exhaustive)}`);
        }
    }
}
