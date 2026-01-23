#!/bin/bash
set -e

# Compile Evaluation.java and test files
javac -d /tmp evaluation/Evaluation.java repository_before/*.java repository_after/*.java tests/*.java

# Run evaluation
java -cp /tmp Evaluation
