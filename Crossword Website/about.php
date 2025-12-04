<?php require 'noname/userdetails.php'; ?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>About CrossWord Inc.</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
  <style>
    h1 {
      font-size: 3rem;
      color: #12b38a;
      margin-bottom: 24px;
      text-align: center;
    }

    p {
      font-size: 1.1rem;
      color: #555;
      line-height: 1.6;
      margin-bottom: 20px;
      text-align: justify;
    }

    .about-section {
      display: flex;
      gap: 30px;
      align-items: flex-start;
      justify-content: space-between;
      padding: 40px 20px;
      max-width: 1000px;
      margin: auto;
      flex-wrap: wrap;
    }

    .about-text, .about-image {
      flex: 1 1 48%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .about-text p:first-child {
      margin-top: 0;
    }

    .about-image img {
      max-width: 100%;
      height: auto;
      border: 2px solid #000;
      border-radius: 8px;
      vertical-align: top;
    }

    @media (max-width: 768px) {
      .about-section {
        flex-direction: column;
      }

      .about-text, .about-image {
        flex: 1 1 100%;
      }

      .about-image {
        margin-top: 20px;
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
    <h1>About CrossWord Inc.</h1>
    <div class="about-section">
      <div class="about-text">
        <p><strong>CrossWord Inc.</strong> is a web-based platform created in 2025 as a project initiative at <strong>Bajaj Institute of Technology, Wardha</strong>. It empowers users to design, share, and solve engaging crossword puzzles with ease.</p>
        <p>The platform combines simplicity and functionality—catering to casual solvers, educators, and competitive players alike. Our goal is to promote creativity and critical thinking through a seamless crossword-building interface. We invite everyone to explore, challenge, and enjoy the world of words with us.</p>
      </div>
      <div class="about-image">
        <img src="images/college.jpg" alt="Bajaj Institute of Technology Wardha">
      </div>
    </div>
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
