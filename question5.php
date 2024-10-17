<!DOCTYPE html>
<html>
<head>
    <title>Interest Calculation</title>
</head>
<body>

<?php
$starting_balance = 100;
$interest_rate = 0.04;   

$year1_balance = $starting_balance + ($starting_balance * $interest_rate);
echo "Year 1: New balance = £" . number_format($year1_balance, 2) . "<br>";

// Year 2
$year2_balance = $year1_balance + ($year1_balance * $interest_rate);
echo "Year 2: New balance = £" . number_format($year2_balance, 2) . "<br>";

// Year 3
$year3_balance = $year2_balance + ($year2_balance * $interest_rate);
echo "Year 3: New balance = £" . number_format($year3_balance, 2) . "<br>";
?>

</body>
</html>
