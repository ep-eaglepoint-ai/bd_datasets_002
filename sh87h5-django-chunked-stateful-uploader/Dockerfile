# Use slim Python base image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Copy only requirements.txt first to leverage cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project code (from repository_after subfolder)
COPY repository_after/ .

# Expose Django's port
EXPOSE 8000

# Default command: Run migrations then start Django dev server
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]