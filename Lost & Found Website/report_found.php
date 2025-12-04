<?php
session_start(); // Start the session to access session variables
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

        .form-container {
            max-width: 400px;
            margin: 50px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }

        input, select, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-sizing: border-box; /* Ensure padding is inside the width */
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

        h2 {
            text-align: center;
            margin-bottom: 20px;
        }

        .email-warning {
            display: none;
            color: red;
            font-size: 0.9em;
        }

        /* Style for the "Other" input field */
        #item_other {
            display: none;
            margin-top: 10px; /* Add some space between the dropdown and the input field */
        }

        .warning {
            display: none;
            color: red;
            font-size: 0.9em;
            margin-top: 5px;
        }

        .word-count {
            font-size: 0.9em;
            color: #999;
            margin-top: 5px;
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
            <a href="#">Report Found</a>
        </div>
        <div class="icons">
            <span class="user-icon"><a href="inbox.php"><i style="font-size: 24px" class="fa">&#xf007;</i></a></span>
        </div>
    </nav>

    <div class="form-container">
        <h2>Report Found Item</h2>
        <form id="found-item-form" action="http://localhost/pikachu/Nayan/found_item.php" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="item_name">Item Name:</label>
                <select id="item_name" name="item_name" required>
                    <option value="" disabled selected>Select an Item</option>
                    <option value="phone">Phone</option>
                    <option value="laptop">Laptop</option>
                    <option value="wallet">Wallet</option>
                    <option value="bag">Bag</option>
                    <option value="books">Books</option>
                    <option value="ID card">ID Card</option>
                    <option value="keys">Keys</option>
                    <option value="watch">Watch</option>
                    <option value="headphones">Headphones</option>
                    <option value="charger">Charger</option>
                    <option value="sunglasses">Sunglasses</option>
                    <option value="notebook">Notebook</option>
                    <option value="pen">Pen</option>
                    <option value="umbrella">Umbrella</option>
                    <option value="earphones">Earphones</option>
                    <option value="power bank">Power Bank</option>
                    <option value="clothing">Clothing</option>
                    <option value="water bottle">Water Bottle</option>
                    <option value="Other">Other</option>
                </select>
                <input type="text" id="item_other" name="item_other" placeholder="Specify Item (if not listed)">
            </div>
            <div class="form-group">
                <label for="date_found">Date Found:</label>
                <input type="date" id="date_found" name="date_found" required>
            </div>
            <div class="form-group">
                <label for="description">Item Description (Max 20 words):</label>
                <textarea id="description" name="description" rows="4" required maxlength="200" placeholder="Please enter keywords in your description or be very specific while describing the item. E.g., color, brand, or any unique feature."></textarea>
                <p class="word-count">Words: <span id="word-count">0</span> / 20</p>
                <p class="warning">You have reached the word limit. Kindly adjust and try to fit within the limit.</p>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>

    <footer>
        &copy; 2024 Lost & Found Co. All rights reserved.
    </footer>

    <script>
        // Track word count and prevent more than 20 words
        document.getElementById("description").addEventListener("input", function() {
            let text = this.value.trim();
            let words = text.split(/\s+/); // Split by whitespace to get words

            let wordCount = words.filter(word => word.length > 0).length; // Count only non-empty words

            // Update the word count display
            document.getElementById("word-count").textContent = wordCount;

            // Show warning if more than 20 words
            if (wordCount > 20) {
                document.querySelector(".warning").style.display = "block";
                this.value = words.slice(0, 20).join(" "); // Limit to 20 words
            } else {
                document.querySelector(".warning").style.display = "none";
            }
        });

        // Toggle the "Specify Item" field if "Other" is selected
        document.getElementById("item_name").addEventListener("change", function() {
            if (this.value === "Other") {
                document.getElementById("item_other").style.display = "block";  // Show the input field
            } else {
                document.getElementById("item_other").style.display = "none";   // Hide the input field
            }
        });

         // Set the max attribute of the date field to today's date
         document.getElementById('date_found').max = new Date().toISOString().split('T')[0];
    </script>
</body>
</html>
