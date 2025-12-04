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

// Query puzzles with their creator info
$sql = "SELECT p.id AS puzzle_id, p.title, p.description, p.grid, p.created_at, u.name AS creator_name, u.email AS creator_email
        FROM puzzles p
        LEFT JOIN users u ON p.creator_id = u.id
        ORDER BY p.created_at DESC";

$result = $conn->query($sql);

function renderGridImage($gridJson) {
  $grid = json_decode($gridJson);
  if (!$grid) return '';
  $size = count($grid);

  $html = '<div class="grid-image" aria-label="Crossword puzzle preview">';
  for ($r = 0; $r < $size; $r++) {
    $html .= '<div class="grid-row">';
    for ($c = 0; $c < $size; $c++) {
      $cell = $grid[$r][$c];
      if ($cell === '' || $cell === null) {
        $html .= '<div class="grid-cell black"></div>';
      } else {
        $html .= '<div class="grid-cell white"></div>';
      }
    }
    $html .= '</div>';
  }
  $html .= '</div>';
  return $html;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Crossword Puzzles Gallery</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="styles.css">
<style>
  h1 {
    text-align: center;
    margin-bottom: 40px;
    color: #12b38a;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
    max-width: 1000px;
    margin: 0 auto;
  }
  .puzzle-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 6px 15px rgb(0 0 0 / 0.1);
    display: flex;
    gap: 20px;
    padding: 20px;
    align-items: center;
  }
  .grid-image {
    display: inline-block;
  }
  .grid-row {
    display: flex;
  }
  .grid-cell {
    width: 20px;
    height: 20px;
    border: 1px solid #ccc;
    box-sizing: border-box;
  }
  .grid-cell.black {
    background: #333;
  }
  .grid-cell.white {
    background: white;
  }
  .puzzle-info {
    flex: 1;
    min-width: 0;
    word-break: break-word;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .puzzle-info div {
    font-size: 1rem;
    color: #555;
  }
  .puzzle-info .label {
    font-weight: 600;
    color: #12b38a;
    display: inline-block;
    min-width: 110px;
  }
  a.grid-link {
    flex-shrink: 0;
    outline-offset: 4px;
    text-decoration: none;
    cursor: pointer;
  }
  a.grid-link:focus {
    outline: 2px solid #12b38a;
  }
  @media(max-width:600px) {
    .gallery {
      grid-template-columns: 1fr;
      max-width: 90vw;
    }
    .grid-cell {
      width: 16px;
      height: 16px;
    }
  }
  .grid-image {
    width: 140px;
    height: 140px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
  }
  .grid-row {
    display: flex;
  }
  .grid-cell {
    width: 16px;
    height: 16px;
    border: 1px solid #ccc;
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

<h1>Crossword Puzzles Gallery</h1>

<div class="container">
<div class="gallery">
<?php
if ($result && $result->num_rows > 0) {
  while ($row = $result->fetch_assoc()) {
    $gridPreview = renderGridImage($row['grid']);
    $title = htmlspecialchars($row['title']);
    $creator = htmlspecialchars($row['creator_name'] ?: 'Unknown Creator');
    $email = htmlspecialchars($row['creator_email'] ?: 'No email');
    $descriptionUrl = urlencode($row['description'] ?? '');
    $id = (int)$row['puzzle_id'];
    $createdAt = htmlspecialchars(date("d M Y, H:i", strtotime($row['created_at'])));

    $solverUrl = "solver.php?title=" . urlencode($title) . "&description=" . $descriptionUrl;

    echo '<article class="puzzle-card" tabindex="0" aria-label="Puzzle titled ' . $title . ' by ' . $creator . '">';
    echo '<a href="'.$solverUrl.'" class="grid-link" aria-label="Open puzzle '.$title.' to solve">';
    echo $gridPreview;
    echo '</a>';
    echo '<div class="puzzle-info">';
    echo '<div><span class="label">Unique ID:</span> ' . $id . '</div>';
    echo '<div><span class="label">Title:</span> ' . $title . '</div>';
    echo '<div><span class="label">Creator Name:</span> ' . $creator . '</div>';
    echo '<div><span class="label">Creator Email:</span> ' . $email . '</div>';
    echo '<div><span class="label">Created:</span> ' . $createdAt . '</div>';
    echo '</div>';
    echo '</article>';
  }
} else {
  echo '<p>No puzzles created yet.</p>';
}
$conn->close();
?>
</div>
</div>

<footer>&copy; 2025 CrossWord Inc. All rights reserved.</footer>

<script> 
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