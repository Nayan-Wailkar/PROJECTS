class Crossword {
  constructor(words) {
    this.originalWords = words;
    this.words = words.map(word => word.toUpperCase());
    this.grid = [];
    this.clues = { across: [], down: [] };
    this.wordPositions = [];
    this.size = 0;
    this.center = 0;
    this.unplacedWords = []; // Store words that could not be placed
  }

  initializeGrid(size) {
    this.size = size;
    this.center = Math.floor(size / 2);
    this.grid = Array.from({ length: size }, () => Array(size).fill(''));
  }

  placeFirstWord() {
    const firstWord = this.words.shift();
    const startCol = Math.floor((this.size - firstWord.length) / 2);
    const mid = this.center;

    for (let i = 0; i < firstWord.length; i++) {
      this.grid[mid][startCol + i] = firstWord[i];
    }

    this.wordPositions.push({
      word: firstWord,
      row: mid,
      col: startCol,
      direction: 'across',
      number: 1
    });

    this.clues.across.push({ number: 1, clue: '', word: firstWord });
  }

  canPlaceWord(word, row, col, direction) {
    if (direction === 'across') {
      if (col < 0 || col + word.length > this.size || row < 0 || row >= this.size) return false;

      for (let i = 0; i < word.length; i++) {
        const r = row, c = col + i;
        const letter = this.grid[r][c];
        if (letter !== '' && letter !== word[i]) return false;

        if (letter === '') {
          if (r > 0 && this.grid[r - 1][c] !== '') return false;
          if (r < this.size - 1 && this.grid[r + 1][c] !== '') return false;
        }
      }

      if (col > 0 && this.grid[row][col - 1] !== '') return false;
      if (col + word.length < this.size && this.grid[row][col + word.length] !== '') return false;

    } else { // down
      if (row < 0 || row + word.length > this.size || col < 0 || col >= this.size) return false;

      for (let i = 0; i < word.length; i++) {
        const r = row + i, c = col;
        const letter = this.grid[r][c];
        if (letter !== '' && letter !== word[i]) return false;

        if (letter === '') {
          if (c > 0 && this.grid[r][c - 1] !== '') return false;
          if (c < this.size - 1 && this.grid[r][c + 1] !== '') return false;
        }
      }

      if (row > 0 && this.grid[row - 1][col] !== '') return false;
      if (row + word.length < this.size && this.grid[row + word.length][col] !== '') return false;
    }

    return true;
  }

  placeWord(word, row, col, direction) {
    const wordNumber = this.wordPositions.length + 1;
    const upperWord = word.toUpperCase();

    if (direction === 'across') {
      for (let i = 0; i < upperWord.length; i++) {
        this.grid[row][col + i] = upperWord[i];
      }
      this.clues.across.push({ number: wordNumber, clue: '', word: upperWord });
    } else {
      for (let i = 0; i < upperWord.length; i++) {
        this.grid[row + i][col] = upperWord[i];
      }
      this.clues.down.push({ number: wordNumber, clue: '', word: upperWord });
    }

    this.wordPositions.push({ 
      word: upperWord,
      row, 
      col, 
      direction, 
      number: wordNumber 
    });
  }

  findBestIntersection(word) {
    let bestOption = null;
    let maxOverlap = 0;
    let minDistance = Infinity;

    for (const placed of this.wordPositions) {
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < placed.word.length; j++) {
          if (word[i] !== placed.word[j]) continue;

          let row, col, dir;

          if (placed.direction === 'across') {
            dir = 'down';
            row = placed.row - i;
            col = placed.col + j;
          } else {
            dir = 'across';
            row = placed.row + j;
            col = placed.col - i;
          }

          if (!this.canPlaceWord(word, row, col, dir)) continue;

          const dist = Math.abs(this.center - row) + Math.abs(this.center - col);
          const overlap = 1;

          if (
            overlap > maxOverlap ||
            (overlap === maxOverlap && dist < minDistance)
          ) {
            bestOption = { row, col, direction: dir };
            maxOverlap = overlap;
            minDistance = dist;
          }
        }
      }
    }

    return bestOption;
  }

  generate() {
    const longest = Math.max(...this.words.map(w => w.length));
    this.initializeGrid(Math.max(15, longest * 2));

    this.placeFirstWord();

    const unplacedWords = [...this.words];
    this.words = [];
    this.unplacedWords = [];

    for (const word of unplacedWords) {
      const best = this.findBestIntersection(word);
      if (best) {
        this.placeWord(word, best.row, best.col, best.direction);
      } else {
        this.unplacedWords.push(word);
        console.log(`Unplaced word: ${word}`);
      }
    }

    this.renumberClues();
    console.log('Unplaced words after generate:', this.unplacedWords);
  }

  renumberClues() {
    this.wordPositions.sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));

    let currentNumber = 1;
    const newAcross = [], newDown = [];

    for (const pos of this.wordPositions) {
      pos.number = currentNumber;
      const clueObj = { number: currentNumber, clue: '', word: pos.word };
      if (pos.direction === 'across') newAcross.push(clueObj);
      else newDown.push(clueObj);
      currentNumber++;
    }

    this.clues = { across: newAcross, down: newDown };
  }

  getGridWithNumbers() {
    const numberedGrid = Array.from({ length: this.size }, () => Array(this.size).fill(''));
    const used = new Set();

    for (const pos of this.wordPositions) {
      const key = `${pos.row},${pos.col}`;
      if (!used.has(key)) {
        numberedGrid[pos.row][pos.col] = pos.number.toString();
        used.add(key);
      }
    }

    return numberedGrid;
  }

  getUnplacedWords() {
    return this.unplacedWords;
  }
}