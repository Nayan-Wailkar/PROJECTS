document.addEventListener('DOMContentLoaded', function () {
  const loadBtn = document.getElementById('load-btn');
  const submitBtn = document.getElementById('submit-btn');
  const crosswordGrid = document.getElementById('crossword-grid');
  const acrossCluesDiv = document.getElementById('across-clues');
  const downCluesDiv = document.getElementById('down-clues');

  let gridData = [], acrossClues = [], downClues = [];
  let wordPositions = [];
  let currentNumber = 1;

  let timeLimitSeconds = 0;
  let timeRemaining = 0;
  let timerInterval = null;
  let timerActive = false;

  // Map cells to words they belong to, for cursor navigation
  let cellToWordsMap = new Map();

  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || '';
  }

  loadBtn.addEventListener('click', async function () {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!title || !description) {
      alert("Please enter both title and description.");
      return;
    }

    const res = await fetch(`get_puzzle.php?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`);
    const data = await res.json();

    if (!data.success) {
      alert("Error loading puzzle: " + data.error);
      return;
    }

    gridData = data.grid;
    acrossClues = data.across_clues;
    downClues = data.down_clues;

    // Timer setup
    timeLimitSeconds = (data.time_limit || 0) * 60;
    if (timeLimitSeconds <= 0) {
      document.getElementById('timer').style.display = 'none';
      alert('No time limit set for this puzzle.');
    } else {
      timeRemaining = timeLimitSeconds;
      document.getElementById('timer').style.display = 'block';
      updateTimerDisplay(timeRemaining);
      startTimer();
    }

    currentNumber = 1;
    const allClues = [...acrossClues, ...downClues];
    if (allClues.length > 0) {
      currentNumber = Math.max(...allClues.map(c => c.number)) + 1;
    }

    extractWordPositions();
    renderGrid();
    renderClues();

    submitBtn.style.display = "inline-block";
  });

  function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timer').textContent = `Time Remaining: ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  }

  function startTimer() {
    if (timerActive) return;
    timerActive = true;

    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay(timeRemaining);
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        timerActive = false;
        disableInputs();
        alert('Time is up! Puzzle will be submitted automatically.');
        submitPuzzle();
      }
    }, 1000);
  }

  function disableInputs() {
    const inputs = crosswordGrid.querySelectorAll('input.grid-letter-input');
    inputs.forEach(input => input.disabled = true);
  }

  submitBtn.addEventListener('click', () => {
    if (timerActive) {
      clearInterval(timerInterval);
      timerActive = false;
    }
    disableInputs();
    submitPuzzle();
  });

  function buildCellToWordsMap() {
    cellToWordsMap.clear();
    wordPositions.forEach(wordPos => {
      const { row, col, direction, word } = wordPos;
      for (let i = 0; i < word.length; i++) {
        let key;
        if (direction === 'across') {
          key = `${row},${col + i}`;
        } else {
          key = `${row + i},${col}`;
        }
        if (!cellToWordsMap.has(key)) {
          cellToWordsMap.set(key, []);
        }
        cellToWordsMap.get(key).push(wordPos);
      }
    });
  }

  function moveFocus(row, col) {
    const key = `${row},${col}`;
    const wordsHere = cellToWordsMap.get(key);
    if (!wordsHere || wordsHere.length === 0) return;

    const word = wordsHere[0];
    const { row: wRow, col: wCol, direction, word: wWord } = word;

    let posInWord = -1;
    if (direction === 'across') {
      posInWord = col - wCol;
    } else {
      posInWord = row - wRow;
    }

    if (posInWord < 0 || posInWord >= wWord.length) return;

    if (posInWord + 1 < wWord.length) {
      let nextRow = row;
      let nextCol = col;
      if (direction === 'across') nextCol = wCol + posInWord + 1;
      else nextRow = wRow + posInWord + 1;

      const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`);
      if (nextInput) nextInput.focus();
    }
  }

  function submitPuzzle() {
    let score = 0, totalCells = 0;

    gridData.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          totalCells++;
          const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
          const correct = cell.toUpperCase();
          const userInput = (input.value || '').toUpperCase();

          if (userInput === correct) {
            score++;
            input.style.backgroundColor = '#b2f5ea';
          } else {
            input.style.backgroundColor = '#feb2b2';
          }
        }
      });
    });

    const totalTimeTaken = timeLimitSeconds - timeRemaining > 0 ? timeLimitSeconds - timeRemaining : 0;

    alert(`Your score: ${score}/${totalCells} (${Math.round((score/totalCells)*100)}%)\nTime taken: ${Math.floor(totalTimeTaken/60)} minutes ${totalTimeTaken%60} seconds`);

    fetch('save_score.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puzzle_title: document.getElementById('title').value.trim(),
        score,
        total_cells: totalCells,
        time_taken: totalTimeTaken
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        alert('Your score and time have been saved to the leaderboard.');
      } else {
        alert('Failed to save leaderboard data: ' + res.error);
      }
    })
    .catch(err => alert('Error saving leaderboard data: ' + err));
  }

  function extractWordPositions() {
    wordPositions = [];
    const usedNumbers = new Set();

    acrossClues.forEach(clue => usedNumbers.add(clue.number));
    downClues.forEach(clue => usedNumbers.add(clue.number));

    for (let r = 0; r < gridData.length; r++) {
      for (let c = 0; c < gridData[r].length; c++) {
        if (gridData[r][c] && (c === 0 || !gridData[r][c-1])) {
          let length = 0;
          while (c + length < gridData[r].length && gridData[r][c + length]) {
            length++;
          }
          const matchingClue = acrossClues.find(clue => 
            clue.word.length === length && 
            gridData[r].slice(c, c + length).join('') === clue.word
          );
          if (matchingClue) {
            wordPositions.push({
              number: matchingClue.number,
              row: r,
              col: c,
              direction: 'across',
              word: matchingClue.word
            });
          }
        }
      }
    }
    for (let c = 0; c < gridData[0].length; c++) {
      for (let r = 0; r < gridData.length; r++) {
        if (gridData[r][c] && (r === 0 || !gridData[r-1][c])) {
          let length = 0;
          while (r + length < gridData.length && gridData[r + length][c]) {
            length++;
          }
          const matchingClue = downClues.find(clue => {
            if (clue.word.length !== length) return false;
            let word = '';
            for (let i = 0; i < length; i++) {
              word += gridData[r + i][c];
            }
            return word === clue.word;
          });
          if (matchingClue) {
            wordPositions.push({
              number: matchingClue.number,
              row: r,
              col: c,
              direction: 'down',
              word: matchingClue.word
            });
          }
        }
      }
    }
    wordPositions.sort((a, b) => a.number - b.number);

    buildCellToWordsMap();
  }

  function renderGrid() {
    crosswordGrid.innerHTML = '';
    const numberedCells = new Set();

    wordPositions.forEach(pos => {
      const key = `${pos.row},${pos.col}`;
      if (!numberedCells.has(key)) {
        numberedCells.add(key);
      }
    });

    for (let r = 0; r < gridData.length; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'crossword-row';
      for (let c = 0; c < gridData[r].length; c++) {
        const cell = document.createElement('div');
        cell.className = gridData[r][c] ? 'crossword-cell filled' : 'crossword-cell empty';

        if (gridData[r][c]) {
          const key = `${r},${c}`;
          if (numberedCells.has(key)) {
            const number = getCellNumber(r, c);
            if (number) {
              const numberSpan = document.createElement('span');
              numberSpan.className = 'crossword-cell-number';
              numberSpan.textContent = number;
              cell.appendChild(numberSpan);
            }
          }
          const input = document.createElement('input');
          input.type = 'text';
          input.maxLength = 1;
          input.dataset.row = r;
          input.dataset.col = c;
          input.className = 'grid-letter-input';
          cell.appendChild(input);

          input.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            e.target.value = val.length > 1 ? val[0] : val;
            if (val.length === 1) {
              moveFocus(r, c);
            }
          });
        }
        rowDiv.appendChild(cell);
      }
      crosswordGrid.appendChild(rowDiv);
    }
  }

  function getCellNumber(row, col) {
    for (const pos of wordPositions) {
      if (pos.row === row && pos.col === col) return pos.number;
    }
    return null;
  }

  function renderClues() {
    acrossCluesDiv.innerHTML = '';
    downCluesDiv.innerHTML = '';

    acrossClues.sort((a, b) => a.number - b.number);
    downClues.sort((a, b) => a.number - b.number);

    for (const clue of acrossClues) {
      const div = document.createElement('div');
      div.className = 'clue-item';
      div.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}`;
      acrossCluesDiv.appendChild(div);
    }

    for (const clue of downClues) {
      const div = document.createElement('div');
      div.className = 'clue-item';
      div.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}`;
      downCluesDiv.appendChild(div);
    }
  }

  // Auto load puzzle from URL if available
  const titleParam = getQueryParam('title');
  const descParam = getQueryParam('description');
  if (titleParam && descParam) {
    document.getElementById('title').value = titleParam;
    document.getElementById('description').value = descParam;
    loadBtn.click();
  }
});
