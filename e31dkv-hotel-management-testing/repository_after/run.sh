#!/bin/bash

# Simple script to run the Hotel Management System
# Make sure MySQL is running first!

cd "$(dirname "$0")"

# Set Java path (for Homebrew OpenJDK)
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "Warning: MySQL doesn't appear to be running!"
    echo "Start it with: brew services start mysql"
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Check if database is set up
mysql -u keti -ppassword -e "USE hotelmanagement; SELECT COUNT(*) FROM rooms;" &>/dev/null
if [ $? -ne 0 ]; then
    echo "Database not set up. Running setup script..."
    mysql -u keti -ppassword < database_setup.sql
fi

# Compile if needed
if [ ! -d "build/classes/hotelmanagement" ]; then
    echo "Compiling Java files..."
    javac -cp "lib/mysql-connector-java-8.0.33.jar" -d build/classes src/hotelmanagement/*.java
fi

# Run the application
echo "Starting Hotel Management System..."
java -cp "lib/mysql-connector-java-8.0.33.jar:build/classes" hotelmanagement.HotelManagement
