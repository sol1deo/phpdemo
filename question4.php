<!DOCTYPE html>
<html>
<head>
    <title>Average Calculator</title>
</head>
<body>

<form method="post" action="">
    How many numbers do you want to average? <input type="number" name="count" required><br><br>
    <input type="submit" value="Submit">
</form>

<?php
if (isset($_POST['count'])) {
    $count = $_POST['count'];

    echo "<form method='post' action=''>";
    for ($i = 1; $i <= $count; $i++) {
        echo "Enter number $i: <input type='number' name='num[]' required><br><br>";
    }
    echo "<input type='submit' value='Calculate Total and Mean'>";
    echo "</form>";
}

if (isset($_POST['num'])) {
    $numbers = $_POST['num'];
    $total = array_sum($numbers);
    $mean = $total / count($numbers);

    echo "<h3>Total: $total</h3>";
    echo "<h3>Mean: $mean</h3>";
}
?>

</body>
</html>
