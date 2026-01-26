#!/bin/bash
echo "Starting evaluation"
cd evaluation
echo "Compiling"
javac evaluation.java
echo "Running"
cd ..
java -cp evaluation Evaluation
echo "Done"