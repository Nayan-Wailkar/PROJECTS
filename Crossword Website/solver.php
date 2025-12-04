<?php
require 'noname/userdetails.php';

// Get title and description from URL
$title = isset($_GET['title']) ? urldecode(trim($_GET['title'])) : "Untitled";
$description = isset($_GET['description']) ? urldecode(trim($_GET['description'])) : "No Description";
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Crossword Solver</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="styles.css">
  <style>
    .info-bar, .button-bar {
      background: #f2f2f2;
      padding: 12px 20px;
      margin: 20px auto 0;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      max-width: 800px;
      flex-wrap: wrap;
    }

    .button-bar button {
      padding: 10px 20px;
      font-size: 16px;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      background-color: #12b38a;
      color: white;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .button-bar button:hover {
      background-color: #0f9c77;
    }

    #timer {
      font-size: 22px;
      font-weight: 700;
      color: #12b38a;
      padding: 10px 20px;
      border: 2px solid #12b38a;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(18, 179, 138, 0.5);
      background: #ffffff;
    }

    .crossword-cell {
      width: 32px;
      height: 32px;
      box-sizing: border-box;
      border: 1px solid black; /* Ensure black border */
      text-align: center;
      vertical-align: middle;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      background-color: white;
    }

    .crossword-cell input {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      text-align: center;
      font-size: 18px;
      background: transparent;
    }

    .crossword-cell.empty {
      background: black;
      border: 1px solid black !important;
      color: black;
      pointer-events: none;
    }

    .center {
      text-align: center;
    }

    .clues-columns {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    .clues-column {
      flex: 1;
      max-width: 400px;
      padding: 10px 20px;
    }

    .clue-item {
      padding: 6px 0;
      font-size: 16px;
      line-height: 1.4;
      border-bottom: 1px solid #ccc;
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

    <!-- Puzzle Info Bar -->
    <div class="info-bar">
      <span>Title: <strong><?php echo htmlspecialchars($title); ?></strong></span>
      <span>Description: <strong><?php echo htmlspecialchars($description); ?></strong></span>
    </div>

    <!-- Buttons + Timer Bar -->
    <div class="button-bar">
      <input type="hidden" id="title" value="<?php echo htmlspecialchars($title); ?>" />
      <input type="hidden" id="description" value="<?php echo htmlspecialchars($description); ?>" />

      <button id="load-btn">Restart</button>
      <div id="timer">Time Remaining: 00:00</div>
      <button id="submit-btn" style="display:none;">Submit Puzzle</button>
    </div>

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

  <footer>
    &copy; 2025 CrossWord Inc. All rights reserved.
  </footer>

  <!-- JS Scripts -->
  <script src="solver-script.js"></script>
  <script>
    // Toggle dropdown on user icon click
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');

    userIcon.addEventListener('click', () => {
      userDropdown.classList.toggle('show');
    });

    window.onclick = function(event) {
      if (!event.target.matches('.user-icon i') && !event.target.closest('#userDropdown')) {
        if (userDropdown.classList.contains('show')) {
          userDropdown.classList.remove('show');
        }
      }
    };
  </script>
</body>
</html>
