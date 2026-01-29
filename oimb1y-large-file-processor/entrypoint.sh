#!/bin/bash
set -e

# Run migrations from the repository indicated by PYTHONPATH
# If PYTHONPATH contains 'repository_before', we try to migrate there
# Otherwise we default to 'repository_after'
if [[ "$PYTHONPATH" == *"repository_before"* ]]; then
    MANAGE_PY="/app/repository_before/manage.py"
else
    MANAGE_PY="/app/repository_after/manage.py"
fi

if [ -f "$MANAGE_PY" ]; then
    echo "Running migrations using $MANAGE_PY..."
    python "$MANAGE_PY" migrate --noinput
else
    # Fallback to repository_after if nothing else found
    if [ -f "/app/repository_after/manage.py" ]; then
        echo "Running migrations using /app/repository_after/manage.py..."
        python /app/repository_after/manage.py migrate --noinput
    else
        echo "No manage.py found, skipping migrations."
    fi
fi

# Execute the command passed to the container
exec "$@"
