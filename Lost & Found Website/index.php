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
    <title>Lost & Found- Home</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        .logo img {
            width: 150px;
            height: auto;
        }

        section {
            font-family: 'FontAwesome', sans-serif;
            padding: 10px;
            display: flex;
            align-items: center;
        }

        section h1 {
            margin-bottom: 10px;
            font-size: 80px;
        }

        section p {
            margin-bottom: 20px;
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

        .LostFound-image {
            width: 80%;
            max-width: 300px;
            border-radius: 10px;
            animation: floatUpDown 4s ease-in-out infinite alternate;
        }

        @keyframes floatUpDown {
            0% {
                transform: translateY(0);
            }

            100% {
                transform: translateY(-10px);
            }
        }

        .news-section {
            padding: 20px;
            border-radius: 10px;
            background-color: #fff;
            box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
            height: 5pc;
        }

        .news-item {
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 10px;
            background-color: #f9f9f9;
            box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
            height: 4pc;
        }

        .news-item p {
            margin: 0;
            font-size: 16px;
            line-height: 1.6;
        }

        .news-item strong {
            font-weight: bold;
            color: #eb3834;
            font-size: 18px;
        }

        .news-item em {
            font-style: italic;
        }

        .news-item:hover {
            background-color: #eb3834;
            color: #fff;
        }

        .news-item:hover strong {
            color: #fff;
        }

    </style>
</head>

<body>

    <nav>
        <div class="logo">
            <img src="images/logo1.png" alt="Lost and found Logo">
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
    
    <section class="news-section">
        <h2>News and Updates</h2>
        <div class="news-item">
            <p><strong> Success Stories</strong></p>
            <p>Lost and Found Co. recently reunited over 100 lost items with their rightful owners!</p>
        </div>
        <div class="news-item">
            <p><strong>Partnerships</strong></p>
            <p>We are proud to partner with Shiksha Mandal's colleges, strengthening our network.</p>
        </div>
    </section>
    
    <section style="display: flex; align-items: center; justify-content: center; padding: 60px 0;"> 
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <h1 style="margin: 0 0 20px 0;">Find & Recover <span style="color: #eb3834;">With Ease</span></h1>

            <p style="margin: 10px 0;">
                Experience effortless recovery with our dedicated lost and found service.
                In case of any query,feel free to contact us: <b> lost&foundco@bitwardha.ac.in </b>
            </p> 

            <div style="display: flex; gap: 10px; justify-content: center;">
                <a href="report_lost.php">
                    <button><b>Lost</b></button>
                </a>
                <a href="report_found.php">
                    <button><b>Found</b></button>
                </a>
            </div>
        </div>
        
        <div style="flex: 1; display: flex; justify-content: center; align-items: center; height: 50%;">
            <img src="images/90977845-4e5c-4951-8253-041c67b2e1d0.jpeg" alt="Lost and Found" class="LostFound-image" style="max-width: 50%; height: auto; border-radius: 10px;">
        </div>
    </section>

    <footer>
        &copy; 2024 Lost & Found Co. All rights reserved.
    </footer>

</body>
</html>