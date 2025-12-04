<?php
require 'noname/userdetails.php';

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "crosswordinc";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Fetch leaderboard data with improved sorting
$sql = "SELECT l.puzzle_title, l.user_name, l.score, l.total_cells, l.time_taken, l.solved_at, l.attempt,
               p.id AS puzzle_id, p.created_at
        FROM leaderboard l
        LEFT JOIN puzzles p ON l.puzzle_title = p.title
        ORDER BY l.puzzle_title ASC, l.attempt ASC, l.score DESC, l.time_taken ASC";
$result = $conn->query($sql);

// Format seconds to mm:ss
function formatTime($sec) {
    $m = floor($sec / 60);
    $s = $sec % 60;
    return sprintf("%02d:%02d", $m, $s);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Crossword Leaderboard</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="styles.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      background: #f9fafb;
      color: #222;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    h1 {
      text-align: center;
      font-weight: 700;
      color: #12b38a;
      margin-bottom: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
    }
    thead {
      background-color: #12b38a;
      color: white;
    }
    th, td {
      padding: 14px 18px;
      text-align: left;
      border-bottom: 1px solid #eaeaea;
      vertical-align: middle;
    }
    tbody tr:hover {
      background-color: #f1fdf9;
    }
    .group-header td {
      padding: 20px 18px;
      font-size: 20px;
      font-weight: bold;
      color: white;
      background-color: #128868;
      border-top: 2px solid #0f7458;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      text-align: center;
    }
    @media (max-width: 768px) {
      table, thead, tbody, th, td, tr {
        display: block;
        width: 100%;
      }
      thead tr { display: none; }
      tbody tr {
        background: #fff;
        margin-bottom: 20px;
        padding: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        border-radius: 8px;
      }
      tbody td {
        border: none;
        padding: 8px 0;
        position: relative;
        padding-left: 130px;
      }
      tbody td::before {
        position: absolute;
        top: 50%;
        left: 16px;
        width: 110px;
        transform: translateY(-50%);
        font-weight: 700;
        color: #12b38a;
        content: attr(data-label);
      }
      .group-header td {
        background-color: #12b38a !important;
        font-size: 18px;
        border-radius: 4px;
        margin-bottom: 10px;
        padding: 14px;
        text-align: center;
      }
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
      <span class="user-icon" id="userIcon" style="cursor: pointer;"><i class="fa" style="font-size: 24px">&#xf007;</i></span>
      <div class="dropdown-content" id="dropdownContent">
        <p><strong>Name:</strong> <span><?= htmlspecialchars($user_name); ?></span></p>
        <p><strong>Email:</strong> <span><?= htmlspecialchars($user_email); ?></span></p>
        <a class="logout-btn" href="http://localhost/mewtwo/noname/logout.php" onclick="return confirm('Are you sure you want to logout?')">Logout</a>
      </div>
    </div>
  </div>
</nav>

<h1>Crossword Puzzle Leaderboard</h1>
<div class="container" role="main" aria-label="Leaderboard table">
  <table aria-describedby="leaderboard">
    <thead>
      <tr>
        <th scope="col">Puzzle Title</th>
        <th scope="col">Player Name</th>
        <th scope="col">Score</th>
        <th scope="col">Time Taken</th>
        <th scope="col">Attempt</th>
        <th scope="col">Date Solved</th>
      </tr>
    </thead>
    <tbody>
      <?php if ($result && $result->num_rows > 0): ?>
        <?php
          $currentPuzzle = '';
          while ($row = $result->fetch_assoc()):
            $puzzleTitle = htmlspecialchars($row['puzzle_title']);
            $puzzleId = htmlspecialchars($row['puzzle_id'] ?? 'N/A');
            $createdAt = $row['created_at'] ? date("Y-m-d H:i", strtotime($row['created_at'])) : 'Unknown';
            $playerName = htmlspecialchars($row['user_name']);
            $score = intval($row['score']);
            $totalCells = max(1, intval($row['total_cells']));
            $percentage = round(($score / $totalCells) * 100);
            $timeTaken = formatTime(intval($row['time_taken']));
            $attempt = intval($row['attempt']);
            $dateSolved = htmlspecialchars(date("Y-m-d H:i", strtotime($row['solved_at'])));

            if ($puzzleTitle !== $currentPuzzle):
              $currentPuzzle = $puzzleTitle;
              $headerDisplay = "Crossword #$puzzleId – $currentPuzzle (Created: $createdAt)";
        ?>
          <tr class="group-header">
            <td colspan="6"><?= $headerDisplay ?></td>
          </tr>
        <?php endif; ?>
          <tr>
            <td data-label="Puzzle Title"><?= $puzzleTitle ?></td>
            <td data-label="Player Name"><?= $playerName ?></td>
            <td data-label="Score"><?= $percentage ?>%</td>
            <td data-label="Time Taken"><?= $timeTaken ?></td>
            <td data-label="Attempt"><?= $attempt ?></td>
            <td data-label="Date Solved"><?= $dateSolved ?></td>
          </tr>
        <?php endwhile; ?>
      <?php else: ?>
        <tr>
          <td colspan="6" style="text-align:center; color:#999; padding: 20px;">No leaderboard entries found.</td>
        </tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>

<script>
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
  }
</script>

<footer>
  &copy; 2025 CrossWord Inc. All rights reserved.
</footer>
</body>
</html>
<?php $conn->close(); ?>
