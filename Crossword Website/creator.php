<?php require 'noname/userdetails.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Crossword Creator</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="styles.css">
  <style>
    /* New styling for time limit input */
    .input-group label {
      display: block;
      margin-top: 16px;
      font-weight: bold;
    }
    .input-group input[type="number"] {
      width: 300px;
      padding: 8px;
      margin-top: 6px;
      border-radius: 4px;
      border: 1px solid #ddd;
      font-size: 14px;
      box-sizing: border-box;
    }
  </style>
</head>

<body>
  <!-- NAVIGATION BAR -->
  <nav>

    <div class="logo">
      <a href="index.php"><img src="images/logo2.png" alt="CrossWord Inc. Logo"></a>
    </div>

    <div class="nav-links">
      <a href="index.php">Home</a>
      <a href="about.php">About</a>
      <a href="creator.php">Create Crossword</a>
      <a href="leaderboard.php">Leaderboard</a>
      <a href="puzzles-gallery.php">Crossword Gallery</a>
    </div>

    <div class="icons">
      <div class="user-dropdown" id="userDropdown">
        <span class="user-icon" id="userIcon" style="cursor: pointer;"><i style="font-size: 24px" class="fa">&#xf007;</i></span>
        <div class="dropdown-content" id="dropdownContent">
          <p><strong>Name:</strong> <span><?php echo htmlspecialchars($user_name); ?></span></p>
          <p><strong>Email:</strong> <span><?php echo htmlspecialchars($user_email); ?></span></p>
          <a class="logout-btn" href="http://localhost/mewtwo/noname/logout.php" onclick="return confirm('Are you sure you want to logout?')">Logout</a>
        </div>
      </div>
    </div>

  </nav>

  <!-- MAIN CONTAINER -->
  <div class="container">
    <h1 class="center">Crossword Puzzle Creator</h1>

    <!-- Inputs Section -->
    <div class="input-section">
      <div class="input-group">
        <label for="title">Title:</label>
        <input type="text" id="title" placeholder="e.g., Animal Kingdom Quiz" />
      </div>
      <div class="input-group">
        <label for="description">Description:</label>
        <input type="text" id="description" placeholder="e.g., Test your knowledge of animals" />
      </div>
      <div class="input-group">
        <label for="time-limit">Time Limit (minutes):</label>
        <input type="number" id="time-limit" min="1" max="180" value="30" />
      </div>
      <div class="input-group">
        <label for="words-input">Enter words (comma-separated):</label>
        <input type="text" id="words-input" placeholder="e.g., tiger,lion,elephant,zebra,giraffe" />
      </div>
      <button id="generate-btn">Generate Crossword</button>
    </div>

    <!-- Edit/Save Actions -->
    <div class="actions center">
      <button id="edit-toggle-btn">Enter Edit Mode</button>
      <button id="save-btn">Save Puzzle</button>
    </div>

    <!-- Crossword & Clues -->
    <div class="results">
      <div id="crossword-grid"></div>
      <div id="clues-section">
        <h2 class="center">Clues</h2>
        <div class="clues-columns">
          <div class="clues-column">
            <h3 class="center">Across</h3>
            <div id="across-clues"></div>
          </div>
          <div class="clues-column">
            <h3 class="center">Down</h3>
            <div id="down-clues"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <footer>&copy; 2025 CrossWord Inc. All rights reserved.</footer>

  <!-- Scripts -->
  <script src="crossword.js"></script>
  <script src="dictionary.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      const wordsInput     = document.getElementById('words-input');
      const generateBtn    = document.getElementById('generate-btn');
      const saveBtn        = document.getElementById('save-btn');
      const editToggleBtn  = document.getElementById('edit-toggle-btn');
      const crosswordGrid  = document.getElementById('crossword-grid');
      const acrossCluesDiv = document.getElementById('across-clues');
      const downCluesDiv   = document.getElementById('down-clues');
      const timeLimitInput = document.getElementById('time-limit');

      let currentCrossword = null;
      let editMode         = false;

      // Toggle Edit Mode
      editToggleBtn.addEventListener('click', () => {
        editMode = !editMode;
        editToggleBtn.textContent = editMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
        crosswordGrid.classList.toggle('edit-mode', editMode);
        if (currentCrossword) displayCrossword(currentCrossword);
      });

      // Generate Crossword
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

        // Show unplaced words alert as requested
        const unplaced = currentCrossword.getUnplacedWords();
        if (unplaced.length > 0) {
          alert('The following words were NOT placed in the puzzle and need manual adding:\n' + unplaced.join(', '));
        }

        // Store for saving
        window.crosswordGridData = currentCrossword.grid;
        window.acrossClues      = currentCrossword.clues.across;
        window.downClues        = currentCrossword.clues.down;

        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Crossword';
      });

      // Save Puzzle with time limit
      saveBtn.addEventListener('click', () => {
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const time_limit = parseInt(timeLimitInput.value);

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

      // Fetch definitions for clues
      async function fetchClues(xwd) {
        for (const clue of xwd.clues.across) {
          if (!clue.clue) clue.clue = await Dictionary.getDefinition(clue.word);
        }
        for (const clue of xwd.clues.down) {
          if (!clue.clue) clue.clue = await Dictionary.getDefinition(clue.word);
        }
      }

      // Display crossword grid
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
                  if (!xwd.canPlaceWord(word, r, c, dir)) {
                    return alert('Cannot place word here.');
                  }
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

      // Display clues
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

    // Toggle dropdown on user icon click
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');

    userIcon.addEventListener('click', () => {
      userDropdown.classList.toggle('show');
    });

    // Close the dropdown if clicked outside
    window.onclick = function(event) {
      if (!event.target.matches('.user-icon i') && !event.target.closest('#userDropdown')) {
        if (userDropdown.classList.contains('show')) {
          userDropdown.classList.remove('show');
        }
      }
    }
  </script>
</body>
</html>
