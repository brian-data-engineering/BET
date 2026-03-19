# 1. Use a stable, slim Python image
FROM python:3.11-slim

# 2. Set the working directory
WORKDIR /app

# 3. Install system dependencies for psycopg2 and networking
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the backend code
COPY backend/ ./backend/

# 6. Expose the port Render expects
EXPOSE 10000

# 7. Start command
# We use 'backend.app:app' because the code is inside the backend/ folder
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "10000"]
