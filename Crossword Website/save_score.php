<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['name'])) {
    echo json_encode(["success" => false, "error" => "User not logged in."]);
    exit;
}

// Database configuration
$host = "localhost";
$user = "root";
$pass = "";
$db = "crosswordinc";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "error" => "Database connection failed: " . $conn->connect_error]);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

$puzzle_title = $data['puzzle_title'] ?? '';
$user_name = $_SESSION['name'];
$score = intval($data['score'] ?? 0);
$time_taken = intval($data['time_taken'] ?? 0);
$total_cells = intval($data['total_cells'] ?? 0);

if (!$puzzle_title) {
    echo json_encode(["success" => false, "error" => "Puzzle title is required."]);
    exit;
}

// Count previous attempts
$stmt = $conn->prepare("SELECT COUNT(*) as total FROM leaderboard WHERE puzzle_title = ? AND user_name = ?");
$stmt->bind_param("ss", $puzzle_title, $user_name);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$attempt_number = intval($row['total']) + 1;
$stmt->close();

// Insert new attempt including attempt number
$stmt = $conn->prepare("INSERT INTO leaderboard (puzzle_title, user_name, score, total_cells, time_taken, attempt) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssiiii", $puzzle_title, $user_name, $score, $total_cells, $time_taken, $attempt_number);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Attempt #$attempt_number saved successfully.",
        "attempt" => $attempt_number
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Database error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
