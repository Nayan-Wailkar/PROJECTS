<?php require 'noname/userdetails.php'; ?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CrossWord Inc. - Home</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
  <style>
    main {
      max-width: 1000px;
      margin: 40px auto;
      padding: 0 20px;
      text-align: center;
    }
    h1 {
      font-size: 3.5rem;
      color: #12b38a;
      margin-bottom: 20px;
    }
    p.lead {
      font-size: 1.3rem;
      color: #555;
      margin-bottom: 40px;
    }
    .btn-primary {
      background-color: #12b38a;
      color: white;
      padding: 12px 28px;
      font-size: 1.2rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.3s ease;
      display: inline-block;
    }
    .btn-primary:hover {
      background-color: black;
      color: white;
    }
    .features {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: nowrap;
      margin-top: 60px;
      flex-direction: row;
    }
    .feature-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.1);
      padding: 20px;
      flex: 1;
      min-width: 0;
      max-width: 33%;
      box-sizing: border-box;
      text-align: left;
      transition: all 0.3s ease;
    }
    .feature-card:hover {
      border: 2px solid black;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    .feature-icon {
      font-size: 3rem;
      color: #12b38a;
      margin-bottom: 12px;
    }
    .feature-title {
      font-weight: 700;
      font-size: 1.2rem;
      margin-bottom: 10px;
      color: #222;
    }
    .feature-desc {
      color: #555;
      font-size: 1rem;
      line-height: 1.4;
    }
    @media (max-width: 600px) {
      .features {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>

<body>
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
        <span class="user-icon" id="userIcon" style="cursor: pointer;">
          <i style="font-size: 24px" class="fa">&#xf007;</i>
        </span>
        <div class="dropdown-content" id="dropdownContent">
          <p><strong>Name:</strong> <span><?php echo htmlspecialchars($user_name); ?></span></p>
          <p><strong>Email:</strong> <span><?php echo htmlspecialchars($user_email); ?></span></p>
          <a class="logout-btn" href="http://localhost/mewtwo/noname/logout.php" onclick="return confirm('Are you sure you want to logout?')">Logout</a>
        </div>
      </div>
    </div>
  </nav>

  <div class="container">
    <main>
      <h1>Welcome to CrossWord Inc.</h1>
      <p class="lead">
        Create, solve, and compete with crossword puzzles online. Join a community of crossword enthusiasts and challenge yourself or others with exciting puzzles of all levels.
      </p>

      <section class="features" aria-label="Features">
        <article class="feature-card">
          <div class="feature-icon">📝</div>
          <h2 class="feature-title">Create Puzzles</h2>
          <p class="feature-desc">Use our simple and intuitive interface to design custom crossword puzzles quickly and easily.</p>
          <a href="creator.php" class="btn-primary" style="margin-top: 10px; display: inline-block;">Go to Creator</a>
        </article>

        <article class="feature-card">
          <div class="feature-icon">🏆</div>
          <h2 class="feature-title">Compete & Leaderboard</h2>
          <p class="feature-desc">Challenge others, solve puzzles fast, and climb the leaderboard by earning high scores.</p>
          <a href="leaderboard.php" class="btn-primary" style="margin-top: 10px; display: inline-block;">View Leaderboard</a>
        </article>

        <article class="feature-card">
          <div class="feature-icon">📚</div>
          <h2 class="feature-title">Extensive Gallery</h2>
          <p class="feature-desc">Explore a large collection of puzzles made by our community. Choose any and start solving!</p>
          <a href="puzzles-gallery.php" class="btn-primary" style="margin-top: 10px; display: inline-block;">Browse Gallery</a>
        </article>
      </section>
    </main>
  </div>

  <footer>
    &copy; 2025 CrossWord Inc. All rights reserved.
  </footer>

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