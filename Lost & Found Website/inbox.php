<?php
session_start(); // Start the session

// Check if the user clicked logout
if (isset($_POST['logout'])) {
    session_unset();  // Unset all session variables
    session_destroy(); // Destroy the session
    header("Location: login.html"); // Redirect to login page after logout
    exit();
}

// Check if the user is logged in by verifying the session variable
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php?error=session_expired");
    exit();
}

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "lost&foundco";
$conn = mysqli_connect($servername, $username, $password, $dbname);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Fetch user data based on user_id from the session
$user_id = $_SESSION['user_id'];
$sql = "SELECT name, email FROM users WHERE id = '$user_id'";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) > 0) {
    $user = mysqli_fetch_assoc($result);
    $user_name = $user['name'];
    $user_email = $user['email'];
} else {
    echo "User not found!";
    exit();
}

// Fetch status data for both lost and found items
$sql_lost = "SELECT id, item_name, status FROM lost_items WHERE user_id = '$user_id'";
$sql_found = "SELECT id, item_name, status FROM found_items WHERE user_id = '$user_id'";

$result_lost = mysqli_query($conn, $sql_lost);
$result_found = mysqli_query($conn, $sql_found);

// Combine results into one array
$matches = [];
while ($row_lost = mysqli_fetch_assoc($result_lost)) {
    $matches[] = ['item_type' => 'lost', 'item_id' => $row_lost['id'], 'item_name' => $row_lost['item_name'], 'status' => $row_lost['status']];
}

while ($row_found = mysqli_fetch_assoc($result_found)) {
    $matches[] = ['item_type' => 'found', 'item_id' => $row_found['id'], 'item_name' => $row_found['item_name'], 'status' => $row_found['status']];
}

// Initialize an array to store other party emails for each match
$match_emails = [];

foreach ($matches as $match) {
    if ($match['item_type'] == 'lost') {
        $sql_match = "SELECT f.user_id, u.email FROM matches m
                      JOIN found_items f ON m.found_item_id = f.id
                      JOIN users u ON f.user_id = u.id
                      WHERE m.lost_item_id = '" . $match['item_id'] . "'";
    } else {
        $sql_match = "SELECT l.user_id, u.email FROM matches m
                      JOIN lost_items l ON m.lost_item_id = l.id
                      JOIN users u ON l.user_id = u.id
                      WHERE m.found_item_id = '" . $match['item_id'] . "'";
    }

    $result_match = mysqli_query($conn, $sql_match);
    if (mysqli_num_rows($result_match) > 0) {
        $other_party = mysqli_fetch_assoc($result_match);
        $match_emails[$match['item_id']] = $other_party['email']; // Store email for this specific match
    } else {
        $match_emails[$match['item_id']] = "Match not found"; // Default message if no match
    }
}
mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Found Item</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }

        .logo img {
         width: 150px; 
         height: auto; 
        }

        button {
            background-color: #eb3834;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        button:hover {
            background-color: black;
            color: #fff;
        }

        .inbox-content {
            display: flex;
            justify-content: center;
            width: 100%;
            max-width: 1200px;
        }

        .profile-section,
        .check-status-section {
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin: 10px;
        }

        /* Profile Section */
        /* Adjust the padding of the profile-section */
        .profile-section {
        width: 30%;
        padding: 20px 20px 20px 10px;  /* Match left padding of check-status */
        }

        .profile-section h2 {
            text-align: center;
        }

        .profile-section p {
            font-size: 16px;
            line-height: 1.6;
            margin: 10px 0;
        }

        .profile-section button {
            background-color: #eb3834;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
            width: 100%;
        }

        .profile-section button:hover {
            background-color: black;
        }

        /* Check Status Section */
        .check-status-section {
        width: 70%;
        padding: 20px 10px 20px 20px;  /* Reduce right padding to 10px */
        }

        .check-status-section h2 {
            text-align: center;
        }

        .check-status-section p {
            font-size: 16px;
            line-height: 1.6;
        }

        /* Styling for the 'Your inbox is empty' message */
        .empty-inbox {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            border: 1px solid #f5c6cb;
        }

        .empty-inbox p {
            margin: 0;
        }

    </style>
</head>

<body>
    <nav>
        <div class="logo">
            <img src="images/logo1.png" alt="Logo">
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

    
    <div class="container">
        <h1 align=center>INBOX</h1>

        <div class="container">
        <div class="inbox-content">
            <!-- Profile Section -->
            <div class="profile-section">
            <h2>PROFILE</h2>
             <p><strong>Name:</strong> <?php echo htmlspecialchars($user_name); ?></p>
            <p><strong>Email:</strong> <?php echo htmlspecialchars($user_email); ?></p>
            <form method="post" onsubmit="return confirmLogout()">
                <button type="submit" name="logout">Logout</button>
            </form>
        </div>

            <!-- Check Status Section -->
            <div class="check-status-section">
                <h2>CHECK STATUS</h2>
                <?php if (empty($matches)): ?>
                    <div class="empty-inbox">
                        <p>Your inbox is Empty.</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($matches as $match): ?>
                        <form method="post">
                            <p><strong>Request ID:</strong> <?php echo htmlspecialchars($match['item_id']); ?></p>
                            <p><strong>Request Type:</strong> <?php echo ucfirst($match['item_type']); ?></p>
                            <p><strong>Item Name:</strong> <?php echo htmlspecialchars($match['item_name']); ?></p>
                            <p><strong>Request Status:</strong> <?php echo htmlspecialchars($match['status']); ?></p>

                            <!-- Display the email for the corresponding match -->
                            <p><strong>Email of Other Party:</strong> <?php echo htmlspecialchars($match_emails[$match['item_id']]); ?></p>

                            <hr>
                        </form>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        </div>
    </div>

    <footer>
        &copy; 2024 Lost & Found Co. All rights reserved.
    </footer>

    <script>
        // Function to display the logout confirmation alert
        function confirmLogout() {
            alert("Successfully logged out!");
            return true; // Allow the form submission to proceed
        }
    </script>

</body>
</html>