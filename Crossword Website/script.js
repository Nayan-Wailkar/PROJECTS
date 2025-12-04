document.addEventListener('DOMContentLoaded', function () {
  const wordsInput     = document.getElementById('words-input');
  const generateBtn    = document.getElementById('generate-btn');
  const saveBtn        = document.getElementById('save-btn');
  const editToggleBtn  = document.getElementById('edit-toggle-btn');
  const crosswordGrid  = document.getElementById('crossword-grid');
  const acrossCluesDiv = document.getElementById('across-clues');
  const downCluesDiv   = document.getElementById('down-clues');

  let currentCrossword = null;
  let editMode         = false;

  editToggleBtn.addEventListener('click', () => {
    editMode = !editMode;
    editToggleBtn.textContent = editMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
    crosswordGrid.classList.toggle('edit-mode', editMode);
    if (currentCrossword) displayCrossword(currentCrossword);
  });

  generateBtn.addEventListener('click', async () => {
    const wordsText = wordsInput.value.trim();
    if (!wordsText) return alert('Please enter some words.');

    const words = wordsText.split(',').map(w => w.trim()).filter(w => w);
    if (!words.length) return alert('Please enter valid words.');

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';

    currentCrossword = new Crossword(words);
    currentCrossword.generate();
    await fetchClues(currentCrossword);
    displayCrossword(currentCrossword);
    displayClues(currentCrossword);

    // Show unplaced words alert
    const unplaced = currentCrossword.getUnplacedWords();
    console.log('Unplaced words:', unplaced);
    if (unplaced.length > 0) {
      alert('The following words were NOT placed in the puzzle and need manual adding:\n' + unplaced.join(', '));
    }

    window.crosswordGridData = currentCrossword.grid;
    window.acrossClues      = currentCrossword.clues.across;
    window.downClues        = currentCrossword.clues.down;

    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Crossword';
  });

  saveBtn.addEventListener('click', () => {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const timeLimitInput = document.getElementById('time-limit');
    const time_limit = parseInt(timeLimitInput ? timeLimitInput.value : 0);

    if (!title) return alert('Please enter a title.');
    if (!time_limit || time_limit < 1) return alert('Please enter a valid time limit (at least 1 minute).');

    fetch('save_puzzle.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        time_limit,
        grid: window.crosswordGridData,
        across_clues: window.acrossClues,
        down_clues: window.downClues
      })
    })
    .then(r => r.json())
    .then(res => alert(res.success ? 'Puzzle saved successfully!' : 'Error: ' + res.error))
    .catch(err => alert('Error saving puzzle: ' + err));
  });

  async function fetchClues(xwd) {
    for (const clue of xwd.clues.across) {
      if (!clue.clue) clue.clue = await Dictionary.getDefinition(clue.word);
    }
    for (const clue of xwd.clues.down) {
      if (!clue.clue) clue.clue = await Dictionary.getDefinition(clue.word);
    }
  }

  function displayCrossword(xwd) {
    crosswordGrid.innerHTML = '';
    const numbered = xwd.getGridWithNumbers();

    for (let r = 0; r < xwd.size; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'crossword-row';

      for (let c = 0; c < xwd.size; c++) {
        const letter = xwd.grid[r][c];
        const cellDiv = document.createElement('div');
        cellDiv.dataset.row = r;
        cellDiv.dataset.col = c;
        cellDiv.className = letter ? 'crossword-cell filled' : 'crossword-cell empty';

        const num = numbered[r][c];
        if (num) {
          const spanNum = document.createElement('span');
          spanNum.className = 'crossword-cell-number';
          spanNum.textContent = num;
          cellDiv.appendChild(spanNum);
        }

        if (letter) {
          const spanLet = document.createElement('span');
          spanLet.className = 'letter';
          spanLet.textContent = letter;
          cellDiv.appendChild(spanLet);

          if (editMode) {
            spanLet.style.cursor = 'pointer';
            spanLet.addEventListener('click', () => {
              const input = document.createElement('input');
              input.type = 'text';
              input.maxLength = 1;
              input.value = spanLet.textContent;
              input.className = 'grid-letter-input';
              input.addEventListener('blur', () => {
                const newVal = input.value.toUpperCase() || '';
                xwd.grid[r][c] = newVal;
                window.crosswordGridData = xwd.grid;
                displayCrossword(xwd);
              });
              cellDiv.replaceChild(input, spanLet);
              input.focus();
            });
          }

        } else {
          if (editMode) {
            cellDiv.classList.add('editable');
            cellDiv.addEventListener('click', () => {
              const word = prompt('Enter word to place:').toUpperCase();
              if (!word) return;
              let dir = prompt('Direction? (across/down):');
              dir = dir && dir.toLowerCase().startsWith('d') ? 'down' : 'across';
              if (!xwd.canPlaceWord(word, r, c, dir)) return alert('Cannot place word here.');
              xwd.placeWord(word, r, c, dir);
              const clueText = prompt('Enter clue text:');
              const lastPos = xwd.wordPositions.slice(-1)[0];
              const arr = dir === 'across' ? xwd.clues.across : xwd.clues.down;
              const newClue = arr.find(cObj => cObj.number === lastPos.number);
              if (newClue && clueText) newClue.clue = clueText;
              window.crosswordGridData = xwd.grid;
              window.acrossClues = xwd.clues.across;
              window.downClues = xwd.clues.down;
              displayCrossword(xwd);
              displayClues(xwd);
            });
          }
        }

        rowDiv.appendChild(cellDiv);
      }
      crosswordGrid.appendChild(rowDiv);
    }
  }

  function displayClues(xwd) {
    acrossCluesDiv.innerHTML = '';
    downCluesDiv.innerHTML = '';

    xwd.clues.across.forEach(clue => {
      const block = document.createElement('div');
      block.className = 'clue-block';
      const numStrong = document.createElement('strong');
      numStrong.textContent = clue.number + '. ';
      const txtSpan = document.createElement('span');
      txtSpan.className = 'clue-text';
      txtSpan.textContent = clue.clue || '';
      if (clue.clue && /definition not found/i.test(clue.clue)) {
        txtSpan.style.color = 'red';
      } else {
        txtSpan.style.color = '#555';
      }
      const editI = document.createElement('span');
      editI.className = 'edit-icon';
      editI.textContent = '✏️';
      editI.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = txtSpan.textContent;
        input.className = 'clue-input';
        input.addEventListener('blur', () => {
          clue.clue = input.value;
          displayClues(xwd);
        });
        block.replaceChild(input, txtSpan);
        block.appendChild(editI);
        input.focus();
      });
      block.appendChild(numStrong);
      block.appendChild(txtSpan);
      block.appendChild(editI);
      acrossCluesDiv.appendChild(block);
    });

    xwd.clues.down.forEach(clue => {
      const block = document.createElement('div');
      block.className = 'clue-block';
      const numStrong = document.createElement('strong');
      numStrong.textContent = clue.number + '. ';
      const txtSpan = document.createElement('span');
      txtSpan.className = 'clue-text';
      txtSpan.textContent = clue.clue || '';
      if (clue.clue && /definition not found/i.test(clue.clue)) {
        txtSpan.style.color = 'red';
      } else {
        txtSpan.style.color = '#555';
      }
      const editI = document.createElement('span');
      editI.className = 'edit-icon';
      editI.textContent = '✏️';
      editI.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = txtSpan.textContent;
        input.className = 'clue-input';
        input.addEventListener('blur', () => {
          clue.clue = input.value;
          displayClues(xwd);
        });
        block.replaceChild(input, txtSpan);
        block.appendChild(editI);
        input.focus();
      });
      block.appendChild(numStrong);
      block.appendChild(txtSpan);
      block.appendChild(editI);
      downCluesDiv.appendChild(block);
    });
  }
});
