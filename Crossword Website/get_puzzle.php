<?php
header('Content-Type: application/json');

$host = "localhost";
$user = "root";
$pass = "";
$db = "crosswordinc";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "error" => "Database connection failed."]);
    exit;
}

$title = $_GET['title'] ?? '';
$description = $_GET['description'] ?? '';

if (!$title || !$description) {
    echo json_encode(["success" => false, "error" => "Missing title or description."]);
    exit;
}

$stmt = $conn->prepare("SELECT grid, across_clues, down_clues, time_limit FROM puzzles WHERE title = ? AND description = ?");
$stmt->bind_param("ss", $title, $description);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        "success" => true,
        "grid" => json_decode($row['grid']),
        "across_clues" => json_decode($row['across_clues']),
        "down_clues" => json_decode($row['down_clues']),
        "time_limit" => intval($row['time_limit'])
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Puzzle not found."]);
}

$stmt->close();
$conn->close();
?>
