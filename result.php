<!DOCTYPE html>
<html>
<head>
    <title>Addition Result</title>
</head>
<body>

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $num1 = $_POST["num1"];
    $num2 = $_POST["num2"];
    
    if (is_numeric($num1) && is_numeric($num2)) {
        $sum = $num1 + $num2;
        echo "You entered numbers $num1 and $num2.<br>";
        echo "They add up to $sum.";
    } else {
        echo "Please enter valid numbers.";
    }
} else {
    echo "No data received.";
}
?>

<br><br>
<a href="question2.php">Go back</a>

</body>
</html>