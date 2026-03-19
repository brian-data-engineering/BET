FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Run uvicorn pointing to app.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "10000"]
