// this script reference and cite kennytm's project: pndopt

let ROWS = 5;
let COLS = 6;
let TYPES = 7;
let MULTI_ORB_BONUS = 0.25;
let COMBO_BONUS = 0.25;
let MAX_SOLUTIONS_COUNT = ROWS * COLS * 8 * 2;

function slove(grid) {
    var board = [];
    for (let row = 0; row < grid.length; row++) {
        board.push([]);
        for (let col = 0; col < grid[row].length; col++) {
            board[row].push(grid[row][col].imageIndex + '');
        }
    }
    solveBoard(board, function (solutions) {
        solutions = simplifySolutions(solutions);
        global_solutions = solutions;
    });
    var rc = copy_rc(global_solutions[0].init_cursor);
    var paths = [to_xy(rc)];
    global_solutions[0].path.forEach(function (p) {
        in_place_move_rc(rc, p);
        paths.push(to_xy(rc))
    });
    return paths;
}

function createEmptyBoard() {
    var result = new Array(ROWS);
    for (var i = 0; i < ROWS; ++i) {
        result[i] = new Array(COLS);
    }
    return result;
}

function getBoard() {

    var result = createEmptyBoard();

    return result;
}

function solveBoard(board, finish_callback) {
    var solutions = new Array(ROWS * COLS);
    var weights = getWeights();

    var seed_solution = makeSolution(board);
    inPlaceEvaluateSolution(seed_solution, weights);

    for (var i = 0, s = 0; i < ROWS; ++i) {
        for (var j = 0; j < COLS; ++j, ++s) {
            solutions[s] = copySolutionWithCursor(seed_solution, i, j);
        }
    }

    var solve_state = {
        finish_callback: finish_callback,
        max_length: getMaxPathLength(),
        dir_step: is8DirMovementSupported() ? 1 : 2,
        p: 0,
        solutions: solutions,
        weights: weights,
    };

    solveBoardStep(solve_state);
}
function solveBoardStep(solve_state) {
    if (solve_state.p >= solve_state.max_length) {
        solve_state.finish_callback(solve_state.solutions);
        return;
    }

    ++solve_state.p;
    solve_state.solutions = evolveSolutions(solve_state.solutions,
        solve_state.weights,
        solve_state.dir_step);

    solveBoardStep(solve_state);
}

function evolveSolutions(solutions, weights, dir_step) {
    var new_solutions = [];
    solutions.forEach(function (s) {
        if (s.is_done) {
            return;
        }
        for (var dir = 0; dir < 8; dir += dir_step) {
            if (!can_move_orb_in_solution(s, dir)) {
                continue;
            }
            var solution = copy_solution(s);
            in_place_swap_orb_in_solution(solution, dir);
            inPlaceEvaluateSolution(solution, weights);
            new_solutions.push(solution);
        }
        s.is_done = true;
    });
    solutions = solutions.concat(new_solutions);
    solutions.sort(function (a, b) { return b.weight - a.weight; });
    return solutions.slice(0, MAX_SOLUTIONS_COUNT);
}
function getWeights() {
    var weights = new Array(TYPES);
    for (var i = 0; i < TYPES; ++i) {
        weights[i] = {
            normal: +1,
            mass: +3,
        };
    }
    return weights;
}

function makeSolution(board) {
    return {
        board: copy_board(board),
        cursor: make_rc(0, 0),
        init_cursor: make_rc(0, 0),
        path: [],
        is_done: false,
        weight: 0,
        matches: []
    };
}

function copy_board(board) {
    return board.map(function (a) { return a.slice(); });
}

function make_rc(row, col) {
    return { row: row, col: col };
}


function inPlaceEvaluateSolution(solution, weights) {
    var current_board = copy_board(solution.board);
    var all_matches = [];
    while (true) {
        var matches = find_matches(current_board);
        if (matches.matches.length == 0) {
            break;
        }
        in_place_remove_matches(current_board, matches.board);
        in_place_drop_empty_spaces(current_board);
        all_matches = all_matches.concat(matches.matches);
    }
    solution.weight = compute_weight(all_matches, weights);
    solution.matches = all_matches;
    return current_board;
}


function find_matches(board) {
    var match_board = createEmptyBoard();

    // 1. filter all 3+ consecutives.
    //  (a) horizontals
    for (var i = 0; i < ROWS; ++i) {
        var prev_1_orb = 'X';
        var prev_2_orb = 'X';
        for (var j = 0; j < COLS; ++j) {
            var cur_orb = board[i][j];
            if (prev_1_orb == prev_2_orb && prev_2_orb == cur_orb && cur_orb != 'X') {
                match_board[i][j] = cur_orb;
                match_board[i][j - 1] = cur_orb;
                match_board[i][j - 2] = cur_orb;
            }
            prev_1_orb = prev_2_orb;
            prev_2_orb = cur_orb;
        }
    }
    //  (b) verticals
    for (var j = 0; j < COLS; ++j) {
        var prev_1_orb = 'X';
        var prev_2_orb = 'X';
        for (var i = 0; i < ROWS; ++i) {
            var cur_orb = board[i][j];
            if (prev_1_orb == prev_2_orb && prev_2_orb == cur_orb && cur_orb != 'X') {
                match_board[i][j] = cur_orb;
                match_board[i - 1][j] = cur_orb;
                match_board[i - 2][j] = cur_orb;
            }
            prev_1_orb = prev_2_orb;
            prev_2_orb = cur_orb;
        }
    }

    var scratch_board = copy_board(match_board);

    // 2. enumerate the matches by flood-fill.
    var matches = [];
    for (var i = 0; i < ROWS; ++i) {
        for (var j = 0; j < COLS; ++j) {
            var cur_orb = scratch_board[i][j];
            if (typeof (cur_orb) == 'undefined') { continue; }
            var stack = [make_rc(i, j)];
            var count = 0;
            while (stack.length) {
                var n = stack.pop();
                if (scratch_board[n.row][n.col] != cur_orb) { continue; }
                ++count;
                scratch_board[n.row][n.col] = undefined;
                if (n.row > 0) { stack.push(make_rc(n.row - 1, n.col)); }
                if (n.row < ROWS - 1) { stack.push(make_rc(n.row + 1, n.col)); }
                if (n.col > 0) { stack.push(make_rc(n.row, n.col - 1)); }
                if (n.col < COLS - 1) { stack.push(make_rc(n.row, n.col + 1)); }
            }
            matches.push(make_match(cur_orb, count));
        }
    }

    return { matches: matches, board: match_board };
}
function compute_weight(matches, weights) {
    var total_weight = 0;
    matches.forEach(function (m) {
        var base_weight = weights[m.type][m.count >= 5 ? 'mass' : 'normal'];
        var multi_orb_bonus = (m.count - 3) * MULTI_ORB_BONUS + 1;
        total_weight += multi_orb_bonus * base_weight;
    });
    var combo_bonus = (matches.length - 1) * COMBO_BONUS + 1;
    return total_weight * combo_bonus;
}
function copySolutionWithCursor(solution, i, j, init_cursor) {
    return {
        board: copy_board(solution.board),
        cursor: make_rc(i, j),
        init_cursor: init_cursor || make_rc(i, j),
        path: solution.path.slice(),
        is_done: solution.is_done,
        weight: 0,
        matches: []
    };
}
function getMaxPathLength() {
    return 18;
}
function is8DirMovementSupported() {
    return false;
}
function can_move_orb_in_solution(solution, dir) {
    // Don't allow going back directly. It's pointless.
    if (solution.path[solution.path.length - 1] == (dir + 4) % 8) {
        return false;
    }
    return can_move_orb(solution.cursor, dir);
}
function can_move_orb(rc, dir) {
    switch (dir) {
        case 0: return rc.col < COLS - 1;
        case 1: return rc.row < ROWS - 1 && rc.col < COLS - 1;
        case 2: return rc.row < ROWS - 1;
        case 3: return rc.row < ROWS - 1 && rc.col > 0;
        case 4: return rc.col > 0;
        case 5: return rc.row > 0 && rc.col > 0;
        case 6: return rc.row > 0;
        case 7: return rc.row > 0 && rc.col < COLS - 1;
    }
    return false;
}
function copy_solution(solution) {
    return copySolutionWithCursor(solution,
        solution.cursor.row, solution.cursor.col,
        solution.init_cursor);
}
function in_place_swap_orb_in_solution(solution, dir) {
    var res = in_place_swap_orb(solution.board, solution.cursor, dir);
    solution.cursor = res.rc;
    solution.path.push(dir);
}
function in_place_swap_orb(board, rc, dir) {
    var old_rc = copy_rc(rc);
    in_place_move_rc(rc, dir);
    var orig_type = board[old_rc.row][old_rc.col];
    board[old_rc.row][old_rc.col] = board[rc.row][rc.col];
    board[rc.row][rc.col] = orig_type;
    return { board: board, rc: rc };
}
function copy_rc(rc) {
    return { row: rc.row, col: rc.col };
}
function in_place_move_rc(rc, dir) {
    switch (dir) {
        case 0: rc.col += 1; break;
        case 1: rc.row += 1; rc.col += 1; break;
        case 2: rc.row += 1; break;
        case 3: rc.row += 1; rc.col -= 1; break;
        case 4: rc.col -= 1; break;
        case 5: rc.row -= 1; rc.col -= 1; break;
        case 6: rc.row -= 1; break;
        case 7: rc.row -= 1; rc.col += 1; break;
    }
}
function make_match(type, count) {
    return { type: type, count: count };
}
function in_place_remove_matches(board, match_board) {
    for (var i = 0; i < ROWS; ++i) {
        for (var j = 0; j < COLS; ++j) {
            if (typeof (match_board[i][j]) != 'undefined') {
                board[i][j] = 'X';
            }
        }
    }
    return board;
}

function in_place_drop_empty_spaces(board) {
    for (var j = 0; j < COLS; ++j) {
        var dest_i = ROWS - 1;
        for (var src_i = ROWS - 1; src_i >= 0; --src_i) {
            if (board[src_i][j] != 'X') {
                board[dest_i][j] = board[src_i][j];
                --dest_i;
            }
        }
        for (; dest_i >= 0; --dest_i) {
            board[dest_i][j] = 'X';
        }
    }
    return board;
}
function simplifySolutions(solutions) {
    var simplified_solutions = [];
    solutions.forEach(function (solution) {
        for (var s = simplified_solutions.length - 1; s >= 0; --s) {
            var simplified_solution = simplified_solutions[s];
            if (!equals_rc(simplified_solution.init_cursor, solution.init_cursor)) {
                continue;
            }
            if (!equals_matches(simplified_solution.matches, solution.matches)) {
                continue;
            }
            return;
        }
        simplified_solutions.push(solution);
    });
    return simplified_solutions;
}
function equals_rc(a, b) {
    return a.row == b.row && a.col == b.col;
}
function equals_matches(a, b) {
    if (a.length != b.length) {
        return false;
    }
    return a.every(function (am, i) {
        var bm = b[i];
        return am.type == bm.type && am.count == bm.count;
    });
}
function to_xy(rc) {
    var x = rc.col;
    var y = rc.row;
    return { x: x, y: y };
}