<?php
session_start(); // Start the session to access session variables

// Check if the user is logged in by verifying the session variable
if (!isset($_SESSION['user_id'])) {
    // If the session variable doesn't exist, redirect to the login page
    header("Location: login.html?error=session_expired");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lost & Found - About</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        .logo img {
            width: 150px;
            height: auto;
        }

        section button {
            background-color: #eb3834;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        section button:hover {
            background-color: black;
            color: #fff;
        }

        .image-gallery {
            border-top: 5px solid #eb3834;
            border-bottom: 5px solid #eb3834;
            overflow: hidden;
            margin-bottom: 60px;
        }

        .scrolling-images img {
            height: 200px;
            width: auto;
            margin: 10px;
        }

        @keyframes scrollImages {
            0% {
                transform: translateX(0);
            }

            100% {
                transform: translateX(-50%);
            }
        }

        .scrolling-images {
            display: flex;
            animation: scrollImages 25s linear infinite;
        }
    </style>
</head>

<body>

    <nav>
        <div class="logo">
            <img src="images/logo1.png" alt="logo">
        </div>
        <div class="nav-links">
            <a href="index.php">Home</a>
            <a href="about.php">About</a>
            <a href="report_lost.php">Report Lost</a>
            <a href="report_found.php">Report Found</a>
        </div>
        <div class="icons">
            <span class="user-icon"><a href="inbox.php"><i style="font-size: 24px" class="fa">&#xf007;</i></a></span>
        </div>
    </nav>

    <section style="font-family: 'FontAwesome', sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 20px; text-align: justify;">
            <div style="flex: 1;">
                <h1>About <span style="color: #eb3834;">Lost and Found Co.</span></h1>
                <p>Welcome to our Lost and Found Portal, where we specialize in reuniting lost items with their rightful owners.</p>
                <p>Losing a cherished possession can be distressing, and our mission is to simplify the recovery process.</p>
                <p>Our user-friendly platform allows individuals to report lost items and browse found belongings effortlessly.</p>
                <p>By partnering with local organizations and community groups, we enhance the chances of successful recoveries. Join us in fostering a caring community where every lost item has a chance to find its way back home!</p>
            </div>
            <div style="flex: 1; margin-left: 20px; display: flex; justify-content: center; align-items: center;">
                <img src="images/bit.webp" alt="Campus Building" style="max-width: 100%; height: auto; border-radius: 10px;">
            </div>
        </div>
    </section>

    <section class="image-gallery">
        <div class="scrolling-images">
            <img src="images/bags.jpg" alt="Bag Image">
            <img src="images/books.jpg" alt="Book Image">
            <img src="images/bottle.jpg" alt="Bottle Image">
            <img src="images/charger.jpg" alt="Charger Image">
            <img src="images/glasses.jpg" alt="Glasses Image">
            <img src="images/usb.jpg" alt="Usb Image">
            <img src="images/wallet.jpg" alt="Wallet Image">
            <img src="images/watch.jpg" alt="Watch Image">
        </div>
    </section>

    <footer>
        &copy; 2024 Lost & Found Co. All rights reserved.
    </footer>

</body>
</html>
