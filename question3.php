<!DOCTYPE html>
<html>
<head>
    <title>Project Marks and Grades</title>
</head>
<body>

<form method="post" action="">
    Enter marks for analysis (out of 25): <input type="number" name="analysis" max="25" required><br><br>
    Enter marks for design (out of 25): <input type="number" name="design" max="25" required><br><br>
    Enter marks for implementation (out of 25): <input type="number" name="implementation" max="25" required><br><br>
    Enter marks for evaluation (out of 25): <input type="number" name="evaluation" max="25" required><br><br>
    <input type="submit" value="Calculate Grade">
</form>

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $analysis = $_POST["analysis"];
    $design = $_POST["design"];
    $implementation = $_POST["implementation"];
    $evaluation = $_POST["evaluation"];

    $total = $analysis + $design + $implementation + $evaluation;
    
    function getGrade($total) {
        switch (true) {
            case ($total >= 80):
                return ["A*", 100];
            case ($total >= 67):
                return ["A", 80];
            case ($total >= 54):
                return ["B", 67];
            case ($total >= 41):
                return ["C", 54];
            case ($total >= 31):
                return ["D", 41];
            case ($total >= 22):
                return ["E", 31];
            case ($total >= 13):
                return ["F", 22];
            case ($total >= 4):
                return ["G", 13];
            default:
                return ["U", 4];
        }
    }

    list($grade, $nextGradeBoundary) = getGrade($total);

    $marksNeededForNextGrade = $nextGradeBoundary - $total;

    echo "<h3>Total Marks: $total</h3>";
    echo "<h3>Grade: $grade</h3>";

    if ($marksNeededForNextGrade > 0) {
        echo "<p>You need $marksNeededForNextGrade more marks to reach the next grade band.</p>";
    } else {
        echo "<p>You have reached the highest grade band!</p>";
    }
}
?>

</body>
</html>
