<!DOCTYPE html>
<html>
<head>
    <title>Random Number to Word</title>
</head>
<body>

<?php
$random_number = rand(1, 6);

$number_words = ["one", "two", "three", "four", "five", "six"];

echo "The number is: " . $number_words[$random_number - 1];
?>

</body>
</html>
