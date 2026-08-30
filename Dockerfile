FROM python:3.13-slim

WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy project
COPY . .

# Build frontend
RUN cd frontend && npm install && npm run build

# Expose port
ENV PORT=7860
EXPOSE 7860

# Run
CMD uvicorn backend.main:app --host 0.0.0.0 --port 7860
