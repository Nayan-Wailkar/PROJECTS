<?php
session_start();

header('Content-Type: application/json');

// Database configuration
$host = "localhost";
$user = "root";
$pass = "";
$db = "crosswordinc";

// Create connection
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "error" => "Database connection failed: " . $conn->connect_error]);
    exit;
}

// Check if user is logged in and get user_id
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "error" => "User not logged in."]);
    exit;
}
$creator_id = $_SESSION['user_id'];

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$title = $data['title'] ?? '';
$description = $data['description'] ?? '';
$time_limit = intval($data['time_limit'] ?? 0);
$grid = json_encode($data['grid'] ?? []);
$across_clues = json_encode($data['across_clues'] ?? []);
$down_clues = json_encode($data['down_clues'] ?? []);

if (!$title || !$grid) {
    echo json_encode(["success" => false, "error" => "Title and crossword data are required."]);
    exit;
}

// Prepare and execute SQL statement with creator_id
$stmt = $conn->prepare("INSERT INTO puzzles (title, description, time_limit, grid, across_clues, down_clues, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssisssi", $title, $description, $time_limit, $grid, $across_clues, $down_clues, $creator_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Crossword puzzle saved successfully!"]);
} else {
    echo json_encode(["success" => false, "error" => "Database error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
